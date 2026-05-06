import './index.css';
import './App.css';
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

import Home from './component/Home';
import Login from './component/Login';
import Sidebar from './component/Sidebar';
import Dashboard from './component/Dashboard';
import Devices from './component/Devices';
import AddDevice from './component/AddDevice';
import Customers from './component/Customers';
import CustomerForm from './component/CustomerForm';
import Settings from './component/Settings';
import Reports from './component/Reports';
import POS from './component/POS';
import Sales from './component/Sales';
import Suppliers from './component/Suppliers';
import Articles from './component/Articles';

// ── Auth Guard ──────────────────────────────────────────────────────
const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

// ── App Layout ──────────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const [token, setToken] = React.useState(localStorage.getItem('token'));
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, [location]);

  const isPublicPage = location.pathname === '/' || location.pathname === '/login';
  const showSidebar = !!token && !isPublicPage;

  return (
    <div className="flex min-h-screen">
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)' }
      }} />

      {showSidebar && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}

      <div className={`flex-1 flex flex-col min-w-0 ${showSidebar ? 'main-content' : ''}`}>
        {/* Mobile header (only if logged in and on internal page) */}
        {showSidebar && (
          <header className="lg:hidden sticky top-0 z-[100] bg-[#0a0e1a] border-b border-white/[0.05] h-14 flex items-center px-4 gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors">
              <Menu size={22} />
            </button>
            <span className="text-white font-bold text-sm">TechStock <span className="text-indigo-400">ERP</span></span>
          </header>
        )}

        <main className="flex-grow">
          <div className={showSidebar ? 'max-w-7xl mx-auto p-6' : ''}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />

              {/* Private Routes */}
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/devices" element={<PrivateRoute><Devices /></PrivateRoute>} />
              <Route path="/devices/add" element={<PrivateRoute><AddDevice /></PrivateRoute>} />
              <Route path="/devices/edit/:id" element={<PrivateRoute><AddDevice /></PrivateRoute>} />
              <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
              <Route path="/customers/add" element={<PrivateRoute><CustomerForm /></PrivateRoute>} />
              <Route path="/customers/:id" element={<PrivateRoute><CustomerForm /></PrivateRoute>} />
              <Route path="/suppliers" element={<PrivateRoute><Suppliers /></PrivateRoute>} />
              <Route path="/articles" element={<PrivateRoute><Articles /></PrivateRoute>} />

              {/* Sales & Analytics */}
              <Route path="/sales/pos/*" element={<PrivateRoute><POS /></PrivateRoute>} />
              <Route path="/sales/*" element={<PrivateRoute><Sales /></PrivateRoute>} />
              <Route path="/reports/*" element={<PrivateRoute><Reports /></PrivateRoute>} />
              <Route path="/settings/*" element={<PrivateRoute><Settings /></PrivateRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

// ── Root ────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}