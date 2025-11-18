# ML Spot Optimizer - Frontend Only

> 🎨 **Frontend-Only Branch** - Complete React dashboard for ML Spot Optimizer
>
> This branch contains ONLY the frontend application files. For the complete application including backend, see the main branch.

---

## 📦 What's Included

This branch contains a fully modular, production-ready React frontend with:

- ✅ **15 Component Files** - Organized, reusable components
- ✅ **Complete API Client** - Ready to connect to any backend
- ✅ **Modern UI/UX** - Tailwind CSS with custom styling
- ✅ **Interactive Charts** - Recharts for data visualization
- ✅ **Responsive Design** - Mobile, tablet, and desktop support

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

```bash
# 1. Clone this branch
git clone -b frontend-only https://github.com/atharva0608/ml-spot-v2.git
cd ml-spot-v2

# 2. Install dependencies
npm install

# 3. Configure API endpoint (if needed)
# Edit src/services/api.js and update BASE_URL

# 4. Start development server
npm run dev

# 5. Open browser at http://localhost:3000
```

---

## 🏗️ Project Structure

```
ml-spot-v2/
├── src/
│   ├── components/              # React components
│   │   ├── AgentsTab.jsx           # Agent management
│   │   ├── ClientDashboard.jsx     # Client hub with tabs
│   │   ├── HomeDashboard.jsx       # Global admin dashboard
│   │   ├── InstancesTab.jsx        # Instance management
│   │   ├── LiveDataTab.jsx         # Real-time data stream
│   │   ├── ModelsView.jsx          # AI/ML models view
│   │   ├── SavingsTab.jsx          # Savings analytics
│   │   ├── SharedComponents.jsx    # Reusable UI components
│   │   ├── Sidebar.jsx             # Navigation sidebar
│   │   ├── SwitchHistoryTab.jsx    # Switch history
│   │   └── SystemHealthView.jsx    # System health monitor
│   ├── services/
│   │   └── api.js                  # API client (50+ methods)
│   ├── styles/
│   │   └── index.css               # Tailwind + custom styles
│   ├── App.jsx                     # Main app component
│   └── index.js                    # React entry point
├── index.html                      # HTML entry point
├── package.json                    # Dependencies
├── vite.config.js                  # Vite configuration
├── tailwind.config.js              # Tailwind configuration
├── postcss.config.js               # PostCSS configuration
└── .gitignore                      # Git ignore rules
```

---

## 🎯 Features

### Global Admin Dashboard
- Real-time statistics for all clients
- Interactive charts (savings, switches, trends)
- System health monitoring
- Auto-refresh functionality

### Client Management
- Multi-client support
- Easy client creation with auto-generated tokens
- Per-client metrics and analytics
- Client deletion with confirmation

### Agent Management
- Real-time status monitoring (online/offline/warning)
- Individual agent configuration
- Toggle controls (enable, auto-switch, auto-terminate)
- Heartbeat tracking

### Instance Management
- Live pricing display (spot & on-demand)
- Smart switching between spot pools
- Savings percentage tracking
- Pool recommendations

### Switch History
- Complete audit trail
- Advanced filtering (trigger type, status)
- Summary statistics
- Export functionality

### Savings Analytics
- Daily, weekly, monthly charts
- Trend analysis
- Multiple chart types (area, bar, line)
- Export reports

### Live Data Monitoring
- Real-time agent heartbeats
- JSON payload viewing
- Event type filtering
- Summary statistics

### System Health
- Database status
- Backend API health
- Decision engine monitoring
- Service metrics

### AI/ML Models
- Model configuration display
- Engine type and region info
- Performance statistics
- Feature roadmap

---

## 🛠️ Technology Stack

| Category | Technology |
|----------|-----------|
| **Framework** | React 18 |
| **Build Tool** | Vite 4 |
| **Styling** | Tailwind CSS 3 |
| **Charts** | Recharts 2 |
| **Icons** | Lucide React |
| **Language** | JavaScript (JSX) |

---

## 📝 Available Scripts

```bash
# Development server (port 3000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Lint code (if configured)
npm run lint
```

---

## ⚙️ Configuration

### API Endpoint

Edit `src/services/api.js` to configure your backend URL:

```javascript
const API_CONFIG = {
  BASE_URL: 'http://localhost:5000'  // Change this to your backend URL
};
```

### Vite Proxy (Development)

The `vite.config.js` includes a proxy configuration for development:

```javascript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
}
```

Update the `target` to match your backend server.

---

## 📦 Dependencies

### Production
- `react` ^18.2.0 - UI framework
- `react-dom` ^18.2.0 - React DOM rendering
- `recharts` ^2.8.0 - Charting library
- `lucide-react` ^0.263.1 - Icon library

### Development
- `@vitejs/plugin-react` ^4.0.4 - Vite React plugin
- `autoprefixer` ^10.4.15 - CSS autoprefixer
- `postcss` ^8.4.29 - CSS transformer
- `tailwindcss` ^3.3.3 - Utility CSS framework
- `vite` ^4.4.9 - Build tool

---

## 🎨 Customization

### Colors

Edit `tailwind.config.js` to customize the color scheme:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // Your custom colors
      },
    },
  },
}
```

### Styling

Global styles and custom CSS are in `src/styles/index.css`.

---

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` directory.

### Deploy to Hosting

The build output can be deployed to any static hosting service:

- **Vercel**: `vercel deploy`
- **Netlify**: Drag and drop `dist/` folder
- **AWS S3**: Upload `dist/` contents
- **GitHub Pages**: Push `dist/` to gh-pages branch
- **Nginx**: Serve `dist/` directory

### Environment Variables

For production, update the API endpoint:

1. Create `.env.production`:
   ```
   VITE_API_URL=https://your-api.com
   ```

2. Update `src/services/api.js`:
   ```javascript
   const API_CONFIG = {
     BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000'
   };
   ```

---

## 📱 Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## 🔗 Backend Integration

This frontend is designed to work with the ML Spot Optimizer backend API.

### Required API Endpoints

The frontend expects the following API endpoints:

**Admin Endpoints:**
- `GET /api/admin/stats` - Global statistics
- `GET /api/admin/clients` - All clients
- `POST /api/admin/clients/create` - Create client
- `DELETE /api/admin/clients/:id` - Delete client
- `GET /api/admin/clients/:id/token` - Get client token
- `GET /api/admin/system-health` - System health

**Client Endpoints:**
- `GET /api/client/:id` - Client details
- `GET /api/client/:id/agents` - Client agents
- `GET /api/client/:id/instances` - Client instances
- `GET /api/client/:id/switch-history` - Switch history
- `GET /api/client/:id/savings` - Savings data
- `GET /api/client/:id/live-data` - Live data stream

**Agent Endpoints:**
- `POST /api/agent/:id/toggle` - Toggle agent
- `POST /api/agent/:id/auto-switch` - Toggle auto-switch
- `POST /api/agent/:id/auto-terminate` - Toggle auto-terminate
- `GET /api/agent/:id/config` - Get agent config
- `POST /api/agent/:id/config` - Update agent config
- `DELETE /api/agent/:id` - Delete agent

**Instance Endpoints:**
- `GET /api/instance/:id/pools` - Get available pools
- `POST /api/instance/:id/switch` - Switch instance

**Model Endpoints:**
- `GET /api/models/status` - Models status

See the complete API client in `src/services/api.js` for all endpoints.

---

## 🐛 Troubleshooting

### Port Already in Use

If port 3000 is in use:

```bash
# Edit vite.config.js and change the port
server: {
  port: 3001,  // Change to any available port
}
```

### API Connection Issues

1. Check `src/services/api.js` has correct backend URL
2. Verify backend is running
3. Check browser console for CORS errors
4. Ensure backend allows requests from frontend origin

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 📄 License

This project is part of the ML Spot Optimizer platform.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 💡 Tips

- Use the browser DevTools React extension for debugging
- Check the Network tab to inspect API calls
- Use the Console for error messages
- Hot Module Replacement (HMR) works automatically in dev mode

---

## 📧 Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review the API integration section

---

**Built with ❤️ using React, Vite, and Tailwind CSS**

---

## 🎯 Next Steps

1. **Configure Backend URL** - Edit `src/services/api.js`
2. **Install Dependencies** - Run `npm install`
3. **Start Dev Server** - Run `npm run dev`
4. **Customize Branding** - Update colors in `tailwind.config.js`
5. **Deploy** - Build and deploy to your hosting platform

Happy coding! 🚀
