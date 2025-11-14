"""
AWS Spot Optimizer - Pluggable Decision Engine
==============================================
Fully decoupled decision-making logic for spot instance optimization.

This module is completely independent of the Flask server and can be:
- Hot-swapped with different versions
- A/B tested
- Replaced with rule-based, ML-based, or hybrid engines
- Updated without touching server code

Version: 2.0.0
"""

import json
import pickle
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

# ==============================================================================
# CONFIGURATION
# ==============================================================================

class DecisionEngineConfig:
    """Configuration for decision engine"""
    
    def __init__(self, model_dir: Path, region: str, engine_type: str = 'ml_based'):
        self.model_dir = Path(model_dir)
        self.region = region
        self.engine_type = engine_type  # ml_based, rule_based, hybrid
        
        # Default thresholds (can be overridden by agent config)
        self.default_min_savings_percent = 5.0
        self.default_risk_threshold = 0.7
        self.default_max_switches_per_week = 10
        self.default_min_pool_duration_hours = 2

# ==============================================================================
# BASE DECISION ENGINE (ABSTRACT)
# ==============================================================================

class BaseDecisionEngine(ABC):
    """Abstract base class for all decision engines"""
    
    def __init__(self, config: DecisionEngineConfig):
        self.config = config
        self.loaded = False
    
    @abstractmethod
    def load(self):
        """Load models/rules"""
        pass
    
    @abstractmethod
    def calculate_risk_score(self, pool_id: str, current_price: float, 
                            current_discount: float, ondemand_price: float) -> tuple:
        """Calculate risk score for a pool
        
        Returns:
            (risk_score, state, reason)
        """
        pass
    
    def is_loaded(self) -> bool:
        """Check if engine is loaded"""
        return self.loaded
    
    def make_decision(self, instance: Dict[str, Any], pricing: Dict[str, Any],
                     config: Dict[str, Any], recent_switches_count: int,
                     last_switch_time: Optional[datetime]) -> Dict[str, Any]:
        """Main decision-making logic (common across all engines)"""
        
        # Extract current state
        current_pool_id = instance.get('current_pool_id', 'unknown')
        current_mode = instance.get('current_mode', 'spot')
        
        # Get pricing
        current_spot_price = None
        for pool in pricing['spot_pools']:
            if pool['pool_id'] == current_pool_id:
                current_spot_price = pool['price']
                break
        
        if not current_spot_price and pricing['spot_pools']:
            current_spot_price = pricing['spot_pools'][0]['price']
            current_pool_id = pricing['spot_pools'][0]['pool_id']
        
        ondemand_price = pricing['on_demand_price']
        
        # Policy enforcement: Switch frequency limit
        if recent_switches_count >= config['max_switches_per_week']:
            return {
                'instance_id': instance['instance_id'],
                'risk_score': 0.0,
                'recommended_action': 'stay',
                'recommended_mode': current_mode,
                'recommended_pool_id': current_pool_id,
                'expected_savings_per_hour': 0.0,
                'allowed': False,
                'reason': f"Switch limit reached: {recent_switches_count}/{config['max_switches_per_week']} switches this week"
            }
        
        # Policy enforcement: Pool duration limit
        if last_switch_time:
            hours_since = (datetime.utcnow() - last_switch_time).total_seconds() / 3600
            if hours_since < config['min_pool_duration_hours']:
                return {
                    'instance_id': instance['instance_id'],
                    'risk_score': 0.0,
                    'recommended_action': 'stay',
                    'recommended_mode': current_mode,
                    'recommended_pool_id': current_pool_id,
                    'expected_savings_per_hour': 0.0,
                    'allowed': False,
                    'reason': f"Too soon to switch: {hours_since:.1f}h < {config['min_pool_duration_hours']}h minimum"
                }
        
        # Calculate risk and make recommendation
        current_discount = 1 - (current_spot_price / ondemand_price) if ondemand_price > 0 else 0
        risk_score, state, reason = self.calculate_risk_score(
            current_pool_id, current_spot_price, current_discount, ondemand_price
        )
        
        # Decision logic
        recommended_action = 'stay'
        recommended_mode = current_mode
        recommended_pool_id = current_pool_id
        expected_savings = 0.0
        allowed = config['auto_switch_enabled']
        
        # High risk → fallback to on-demand
        if state in ['event', 'high-risk'] and risk_score >= config['risk_threshold']:
            recommended_action = 'fallback_ondemand'
            recommended_mode = 'ondemand'
            recommended_pool_id = 'n/a'
            expected_savings = -(ondemand_price - current_spot_price)
            reason = f"High risk detected (score: {risk_score:.2f}), fallback to on-demand recommended"
        
        # Safe to return from on-demand to spot
        elif state == 'safe-to-return' and current_mode == 'ondemand':
            best_pool = min(pricing['spot_pools'], key=lambda p: p['price'])
            savings_pct = ((ondemand_price - best_pool['price']) / ondemand_price) * 100
            
            if savings_pct >= config['min_savings_percent']:
                recommended_action = 'switch_pool'
                recommended_mode = 'spot'
                recommended_pool_id = best_pool['pool_id']
                expected_savings = ondemand_price - best_pool['price']
                reason = f"Safe to return to spot. Pool {best_pool['pool_id']} offers {savings_pct:.1f}% savings"
        
        # Switch to cheaper spot pool
        elif current_mode == 'spot' and state == 'normal':
            best_pool = min(pricing['spot_pools'], key=lambda p: p['price'])
            if best_pool['pool_id'] != current_pool_id:
                savings = current_spot_price - best_pool['price']
                savings_pct = (savings / ondemand_price) * 100
                
                if savings_pct >= config['min_savings_percent']:
                    recommended_action = 'switch_pool'
                    recommended_mode = 'spot'
                    recommended_pool_id = best_pool['pool_id']
                    expected_savings = savings
                    reason = f"Better pool available: {best_pool['pool_id']} saves {savings_pct:.1f}%"
        
        return {
            'instance_id': instance['instance_id'],
            'risk_score': round(risk_score, 4),
            'recommended_action': recommended_action,
            'recommended_mode': recommended_mode,
            'recommended_pool_id': recommended_pool_id,
            'expected_savings_per_hour': round(expected_savings, 6),
            'allowed': allowed,
            'reason': reason
        }

# ==============================================================================
# ML-BASED DECISION ENGINE
# ==============================================================================

class MLBasedDecisionEngine(BaseDecisionEngine):
    """ML-based decision engine using trained models"""
    
    def __init__(self, config: DecisionEngineConfig):
        super().__init__(config)
        self.capacity_detector = None
        self.price_predictor = None
        self.model_config = None
    
    def load(self):
        """Load ML models from disk"""
        try:
            logger.info("Loading ML models...")
            
            manifest_path = self.config.model_dir / 'manifest.json'
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            region_models = manifest['models'].get('mumbai', {})
            
            # Load capacity detector
            capacity_path = self.config.model_dir / region_models['capacity_detector']
            with open(capacity_path, 'rb') as f:
                self.capacity_detector = pickle.load(f)
            
            # Load price predictor
            price_path = self.config.model_dir / region_models['price_predictor']
            with open(price_path, 'rb') as f:
                self.price_predictor = pickle.load(f)
            
            # Load config
            config_path = self.config.model_dir / region_models['config']
            with open(config_path, 'r') as f:
                self.model_config = json.load(f)
            
            self.loaded = True
            logger.info(f"✓ ML models loaded successfully")
            logger.info(f"  Capacity pools: {len(self.capacity_detector['pool_context'])}")
            logger.info(f"  Price models: {len(self.price_predictor['models'])}")
            
        except Exception as e:
            logger.error(f"Failed to load ML models: {e}")
            raise
    
    def calculate_risk_score(self, pool_id: str, current_price: float,
                            current_discount: float, ondemand_price: float) -> tuple:
        """Calculate risk score using ML model"""
        if not self.loaded:
            return 0.5, "normal", "Models not loaded"
        
        context = self.capacity_detector['pool_context'].get(pool_id)
        if not context:
            return 0.5, "normal", "Pool not in training data"
        
        cfg = self.capacity_detector['config']
        price_ratio = current_price / ondemand_price if ondemand_price > 0 else 1.0
        
        # Detect anomalies
        ratio_spike = price_ratio > context['ratio_p50'] * (1 + cfg['ratio_spike_threshold'])
        ratio_absolute_high = price_ratio > cfg['ratio_absolute_high']
        ratio_event = price_ratio > context['ratio_p92']
        
        risk_score = 0.0
        state = "normal"
        reason = []
        
        if ratio_absolute_high:
            risk_score = 0.9
            state = "event"
            reason.append(f"Ratio {price_ratio:.3f} exceeds absolute threshold {cfg['ratio_absolute_high']}")
        elif ratio_event:
            risk_score = 0.8
            state = "high-risk"
            reason.append(f"Ratio {price_ratio:.3f} above p92 ({context['ratio_p92']:.3f})")
        elif ratio_spike:
            risk_score = 0.6
            state = "high-risk"
            reason.append(f"Ratio spike detected: {price_ratio:.3f} vs p50 {context['ratio_p50']:.3f}")
        else:
            if price_ratio < cfg['ratio_safe_return']:
                risk_score = 0.2
                state = "safe-to-return"
                reason.append(f"Ratio {price_ratio:.3f} below safe threshold {cfg['ratio_safe_return']}")
            else:
                risk_score = 0.3
                state = "normal"
                reason.append(f"Normal conditions: ratio {price_ratio:.3f}")
        
        return risk_score, state, "; ".join(reason)

# ==============================================================================
# RULE-BASED DECISION ENGINE
# ==============================================================================

class RuleBasedDecisionEngine(BaseDecisionEngine):
    """Simple rule-based decision engine (no ML)"""
    
    def __init__(self, config: DecisionEngineConfig):
        super().__init__(config)
        self.rules = {
            'high_price_threshold': 0.85,  # 85% of on-demand = high risk
            'safe_price_threshold': 0.40,   # 40% of on-demand = safe
            'spike_threshold': 0.30         # 30% price increase = spike
        }
    
    def load(self):
        """Load rules (no models needed)"""
        logger.info("Loading rule-based decision engine...")
        self.loaded = True
        logger.info("✓ Rule-based engine ready")
    
    def calculate_risk_score(self, pool_id: str, current_price: float,
                            current_discount: float, ondemand_price: float) -> tuple:
        """Calculate risk score using simple rules"""
        if not self.loaded:
            return 0.5, "normal", "Engine not loaded"
        
        price_ratio = current_price / ondemand_price if ondemand_price > 0 else 1.0
        
        # Simple rule-based logic
        if price_ratio >= self.rules['high_price_threshold']:
            return 0.85, "high-risk", f"Price ratio {price_ratio:.3f} >= {self.rules['high_price_threshold']}"
        elif price_ratio <= self.rules['safe_price_threshold']:
            return 0.15, "safe-to-return", f"Price ratio {price_ratio:.3f} <= {self.rules['safe_price_threshold']}"
        else:
            return 0.35, "normal", f"Price ratio {price_ratio:.3f} in normal range"

# ==============================================================================
# HYBRID DECISION ENGINE
# ==============================================================================

class HybridDecisionEngine(BaseDecisionEngine):
    """Hybrid engine combining ML and rules"""
    
    def __init__(self, config: DecisionEngineConfig):
        super().__init__(config)
        self.ml_engine = MLBasedDecisionEngine(config)
        self.rule_engine = RuleBasedDecisionEngine(config)
    
    def load(self):
        """Load both ML and rules"""
        logger.info("Loading hybrid decision engine...")
        try:
            self.ml_engine.load()
            self.rule_engine.load()
            self.loaded = True
            logger.info("✓ Hybrid engine ready (ML + Rules)")
        except Exception as e:
            logger.warning(f"ML models not available: {e}")
            logger.info("Falling back to rule-based engine only")
            self.rule_engine.load()
            self.loaded = True
    
    def calculate_risk_score(self, pool_id: str, current_price: float,
                            current_discount: float, ondemand_price: float) -> tuple:
        """Use ML if available, otherwise fall back to rules"""
        if self.ml_engine.is_loaded():
            return self.ml_engine.calculate_risk_score(
                pool_id, current_price, current_discount, ondemand_price
            )
        else:
            return self.rule_engine.calculate_risk_score(
                pool_id, current_price, current_discount, ondemand_price
            )

# ==============================================================================
# DECISION ENGINE FACTORY
# ==============================================================================

class DecisionEngine:
    """Factory for creating decision engines"""
    
    def __init__(self, config: DecisionEngineConfig):
        self.config = config
        self.engine = None
        
        # Select engine type
        if config.engine_type == 'ml_based':
            self.engine = MLBasedDecisionEngine(config)
        elif config.engine_type == 'rule_based':
            self.engine = RuleBasedDecisionEngine(config)
        elif config.engine_type == 'hybrid':
            self.engine = HybridDecisionEngine(config)
        else:
            raise ValueError(f"Unknown engine type: {config.engine_type}")
    
    def load(self):
        """Load the selected engine"""
        self.engine.load()
    
    def is_loaded(self) -> bool:
        """Check if engine is loaded"""
        return self.engine.is_loaded()
    
    def make_decision(self, **kwargs) -> Dict[str, Any]:
        """Make a switching decision"""
        return self.engine.make_decision(**kwargs)
    
    def calculate_risk_score(self, **kwargs) -> tuple:
        """Calculate risk score"""
        return self.engine.calculate_risk_score(**kwargs)

# ==============================================================================
# USAGE EXAMPLE
# ==============================================================================

if __name__ == '__main__':
    # Example usage
    config = DecisionEngineConfig(
        model_dir=Path('/home/ubuntu/production_models'),
        region='ap-south-1',
        engine_type='hybrid'  # Try: ml_based, rule_based, or hybrid
    )
    
    engine = DecisionEngine(config)
    engine.load()
    
    # Test decision
    test_instance = {
        'instance_id': 'i-test123',
        'current_mode': 'spot',
        'current_pool_id': 'ap-south-1a.c5.large'
    }
    
    test_pricing = {
        'on_demand_price': 0.085,
        'spot_pools': [
            {'pool_id': 'ap-south-1a.c5.large', 'price': 0.040},
            {'pool_id': 'ap-south-1b.c5.large', 'price': 0.035},
            {'pool_id': 'ap-south-1c.c5.large', 'price': 0.038}
        ]
    }
    
    test_config = {
        'auto_switch_enabled': True,
        'min_savings_percent': 5.0,
        'risk_threshold': 0.7,
        'max_switches_per_week': 10,
        'min_pool_duration_hours': 2
    }
    
    decision = engine.make_decision(
        instance=test_instance,
        pricing=test_pricing,
        config=test_config,
        recent_switches_count=2,
        last_switch_time=datetime.utcnow() - timedelta(hours=3)
    )
    
    print(json.dumps(decision, indent=2))