# ML Spot Optimizer - Frontend

> Advanced AI-powered EC2 spot instance cost optimization dashboard

## Features

### 🏠 Global Admin Dashboard
- **Real-time Statistics**: Monitor total agents, instances, clients, and savings
- **Interactive Charts**: Daily savings trends, switch activity, and cumulative savings
- **System Health**: Database, backend API, and decision engine status monitoring
- **Switch Analytics**: Manual vs AI-powered switch distribution

### 👥 Client Management
- **Multi-client Support**: Manage multiple client accounts from a single dashboard
- **Easy Onboarding**: Quick client creation with auto-generated API tokens
- **Client Metrics**: Per-client agents, instances, switches, and savings tracking
- **Token Management**: Secure API token viewing and regeneration

### 🤖 Agent Management
- **Real-time Status**: Live agent heartbeat monitoring
- **Configuration**: Per-agent settings for savings thresholds and risk tolerance
- **Toggle Controls**: Enable/disable agents, auto-switching, and auto-termination
- **Statistics**: Instance count, recent switches, and last seen timestamps

### 💻 Instance Management
- **Live Pricing**: Current spot and on-demand pricing for all instances
- **Smart Switching**: Switch between spot pools and on-demand with recommendations
- **Savings Tracking**: Real-time savings percentage vs on-demand
- **Pool Analysis**: View all available spot pools with pricing comparison

### 📊 Advanced Analytics
- **Switch History**: Complete audit trail with filters by trigger type and status
- **Savings Charts**: Daily, monthly, and cumulative savings visualizations
- **Live Data Stream**: Real-time agent heartbeats and status updates
- **Export Capability**: Download savings and switch history data

### 🏥 System Health Monitoring
- **Service Status**: Database, backend API, and decision engine health
- **Performance Metrics**: Active connections, uptime, and version tracking
- **Real-time Updates**: Auto-refresh every 30 seconds

### 🧠 AI/ML Models
- **Model Configuration**: View and manage decision engine settings
- **Performance Stats**: Prediction accuracy and success rates
- **Multi-model Support**: Support for various ML algorithms (coming soon)

## Technology Stack

- **React 18**: Modern React with hooks and functional components
- **Recharts**: Beautiful, responsive charts and graphs
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Lucide React**: Clean, consistent icon library
- **Vite**: Lightning-fast build tool and dev server

## Project Structure

```
src/
├── components/          # React components
│   ├── AgentsTab.jsx           # Agent management interface
│   ├── ClientDashboard.jsx     # Client details and tabs
│   ├── HomeDashboard.jsx       # Global admin dashboard
│   ├── InstancesTab.jsx        # Instance management
│   ├── LiveDataTab.jsx         # Real-time data stream
│   ├── ModelsView.jsx          # AI/ML models configuration
│   ├── SavingsTab.jsx          # Savings analytics
│   ├── SharedComponents.jsx   # Reusable UI components
│   ├── Sidebar.jsx             # Navigation sidebar
│   ├── SwitchHistoryTab.jsx   # Switch history with filters
│   └── SystemHealthView.jsx   # System health monitoring
├── services/           # API services
│   └── api.js                  # Complete API client
├── styles/             # CSS styles
│   └── index.css               # Tailwind and custom styles
├── App.jsx             # Main app component
└── index.js            # React entry point
```

## Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure API Endpoint**
   Edit `src/services/api.js` to set your backend URL:
   ```javascript
   const API_CONFIG = {
     BASE_URL: 'http://localhost:5000'  // Change to your backend URL
   };
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## Development

### Running Locally
```bash
npm run dev
```
The app will be available at `http://localhost:3000`

### Building
```bash
npm run build
```
Production build will be in the `dist/` directory

### Preview Production Build
```bash
npm run preview
```

## API Integration

The frontend connects to the ML Spot Optimizer backend API. Make sure the backend is running and accessible.

### Key API Endpoints Used:
- `GET /api/admin/stats` - Global statistics
- `GET /api/admin/clients` - List all clients
- `POST /api/admin/clients/create` - Create new client
- `GET /api/client/:id` - Client details
- `GET /api/client/:id/agents` - Client agents
- `GET /api/client/:id/instances` - Client instances
- `GET /api/client/:id/switch-history` - Switch history
- `GET /api/client/:id/savings` - Savings data
- `POST /api/agent/:id/toggle` - Toggle agent status
- `POST /api/instance/:id/switch` - Switch instance mode
- `GET /api/admin/system-health` - System health status

## Features in Detail

### 🎨 Modern UI/UX
- Clean, professional design with gradient accents
- Responsive layout for desktop and mobile
- Smooth animations and transitions
- Interactive charts with tooltips
- Loading states and error handling

### 📱 Responsive Design
- Mobile-first approach
- Tablet and desktop optimized
- Adaptive navigation
- Touch-friendly controls

### ♿ Accessibility
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Focus indicators
- Screen reader friendly

### 🔒 Security
- Secure token handling
- API key protection warnings
- Client-side validation
- XSS protection

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is part of the ML Spot Optimizer platform.

## Support

For issues, questions, or contributions, please open an issue on GitHub.

---

Built with ❤️ using React, Tailwind CSS, and modern web technologies
