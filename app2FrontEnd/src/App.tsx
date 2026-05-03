import './index.css';
import './App.css'
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

import Login from './component/Login'
import Sidebar from './component/Sidebar';
import AddProperty from './component/AddProperty';
import AddTerrain from './component/AddTerrain';
import AddClient from './component/AddClient';
import Dashboard from './component/Dashboard'
import Home from './component/Home'
import Terrains from './component/Terrains'
import Properties from './component/Properties'
import Contractors from './component/Contractors'
import Intervenants from './component/Intervenants'
import EditTerrain from './component/EditTerrain'
import Charges from './component/Charges'
import Clients from './component/Clients'
import Profile from './component/Profile'
import ConfigPrixBiens from './component/ConfigPrixBiens'
import GlobalPreview from './component/GlobalPreview';
import Workers from './component/Workers'
import Salaries from './component/Salaries'
import Transactions from './component/Transactions'
import Contentieux from './component/Contentieux'
import ServiceSocietes from './component/ServiceSocietes'

// Procurement Components
import Articles from './component/procurement/Articles';
import AddArticle from './component/procurement/AddArticle';
import Suppliers from './component/procurement/Suppliers';
import AddSupplier from './component/procurement/AddSupplier';
import PurchaseInvoices from './component/procurement/PurchaseInvoices';
import AddAchat from './component/procurement/AddAchat';
import GeneralWorks from './component/procurement/GeneralWorks';
import AddGeneralWork from './component/procurement/AddGeneralWork';
import StockDashboard from './component/procurement/StockDashboard';
import StockExitForm from './component/procurement/StockExitForm';
import FactureBuilder from './component/FactureBuilder';
import FacturesList from './component/FacturesList';
import AIAssistant from './component/AIAssistant';
import ClientLogin from './component/ClientLogin';
import ClientDashboard from './component/ClientDashboard';
import TerrainMap from './component/TerrainMap';

// ── Auth Guard ─────────────────────────────────────────────────────────────────
const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

const PortalRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const clientUser = localStorage.getItem('clientUser');
  return clientUser ? children : <Navigate to="/portal/login" replace />;
};

// ── App Inner Content ──────────────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const [token, setToken] = React.useState(localStorage.getItem('token'));
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, [location]);

  const isPortal = location.pathname.startsWith('/portal');

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Toaster position="top-right" reverseOrder={false} />
      <GlobalPreview />

      {!isPortal && (
        <Sidebar
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
        />
      )}

      <div
        className="flex-1 flex flex-col min-w-0 transition-[padding-left] duration-300"
        style={{ paddingLeft: (token && !isPortal) ? 'var(--sidebar-width)' : '0px' }}
      >
        {/* Mobile Header */}
        {token && (
          <header className="lg:hidden sticky top-0 z-[100] bg-[#1a0f0a] border-b border-[#2a1a11] shadow-2xl h-[60px] flex items-center px-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 text-white/60 rounded cursor-pointer hover:bg-white/10 mr-2"
            >
              <Menu size={24} />
            </button>
            <div onClick={() => { }} className="flex items-center cursor-pointer group">
              <img src="/assets/LogoNavbar.png" alt="Logo" className="h-8 w-auto mr-3" />
              <span className="self-center text-lg font-bold whitespace-nowrap text-white">
                Amical <span className="text-amber-500 font-black">El Ouaha</span>
              </span>
            </div>
          </header>
        )}

        {token && !isPortal && <AIAssistant />}

        <main className="flex-grow px-4 py-6">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={token ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} />
              <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/terrains" element={<PrivateRoute><Terrains /></PrivateRoute>} />
              <Route path="/properties" element={<PrivateRoute><Properties /></PrivateRoute>} />
              <Route path="/property-pricing" element={<PrivateRoute><ConfigPrixBiens /></PrivateRoute>} />
              <Route path="/add-property" element={<PrivateRoute><AddProperty /></PrivateRoute>} />
              <Route path="/edit-property/:id" element={<PrivateRoute><AddProperty /></PrivateRoute>} />
              <Route path="/add-terrain" element={<PrivateRoute><AddTerrain /></PrivateRoute>} />
              <Route path="/edit-terrain/:id" element={<PrivateRoute><EditTerrain /></PrivateRoute>} />
              <Route path="/terrain-map/:id" element={<PrivateRoute><TerrainMap /></PrivateRoute>} />
              <Route path="/add-client" element={<PrivateRoute><AddClient /></PrivateRoute>} />
              <Route path="/contractors" element={<PrivateRoute><Contractors /></PrivateRoute>} />
              <Route path="/intervenants" element={<PrivateRoute><Intervenants /></PrivateRoute>} />
              <Route path="/charges" element={<PrivateRoute><Charges /></PrivateRoute>} />
              <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/workers" element={<PrivateRoute><Workers /></PrivateRoute>} />
              <Route path="/salaries" element={<PrivateRoute><Salaries /></PrivateRoute>} />
              <Route path="/contentieux" element={<PrivateRoute><Contentieux /></PrivateRoute>} />
              <Route path="/services-tiers" element={<PrivateRoute><ServiceSocietes /></PrivateRoute>} />

              <Route path="/articles" element={<PrivateRoute><Articles /></PrivateRoute>} />
              <Route path="/add-article" element={<PrivateRoute><AddArticle /></PrivateRoute>} />
              <Route path="/suppliers" element={<PrivateRoute><Suppliers /></PrivateRoute>} />
              <Route path="/add-supplier" element={<PrivateRoute><AddSupplier /></PrivateRoute>} />
              <Route path="/achats" element={<PrivateRoute><PurchaseInvoices /></PrivateRoute>} />
              <Route path="/add-achat" element={<PrivateRoute><AddAchat /></PrivateRoute>} />
              <Route path="/travaux" element={<PrivateRoute><GeneralWorks /></PrivateRoute>} />
              <Route path="/add-travaux" element={<PrivateRoute><AddGeneralWork /></PrivateRoute>} />
              <Route path="/stock" element={<PrivateRoute><StockDashboard /></PrivateRoute>} />
              <Route path="/add-stock-exit" element={<PrivateRoute><StockExitForm onSuccess={() => { }} /></PrivateRoute>} />
              <Route path="/factures" element={<PrivateRoute><FactureBuilder /></PrivateRoute>} />
              <Route path="/factures-list" element={<PrivateRoute><FacturesList /></PrivateRoute>} />
              <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />

              {/* Client Portal Routes */}
              <Route path="/portal/login" element={<ClientLogin />} />
              <Route path="/portal/dashboard" element={<PortalRoute><ClientDashboard /></PortalRoute>} />

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

// ── Root App Component ─────────────────────────────────────────────────────────
const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;