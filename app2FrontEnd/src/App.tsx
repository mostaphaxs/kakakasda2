import './index.css';
import './App.css'
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

import Login from './component/Login.tsx'
import Sidebar from './component/Sidebar.tsx';
import AddProperty from './component/AddProperty.tsx';
import AddTerrain from './component/AddTerrain.tsx';
import AddClient from './component/AddClient.tsx';
import Dashboard from './component/Dashboard.tsx'
import Home from './component/Home.tsx'
import Terrains from './component/Terrains.tsx'
import Properties from './component/Properties.tsx'
import Contractors from './component/Contractors.tsx'
import Intervenants from './component/Intervenants.tsx'
import EditTerrain from './component/EditTerrain.tsx'
import Charges from './component/Charges.tsx'
import Clients from './component/Clients.tsx'
import Profile from './component/Profile.tsx'
import ConfigPrixBiens from './component/ConfigPrixBiens.tsx'
import GlobalPreview from './component/GlobalPreview.tsx';
import Workers from './component/Workers.tsx';
import Salaries from './component/Salaries.tsx';
import Transactions from './component/Transactions.tsx';

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

// ── Auth Guard ─────────────────────────────────────────────────────────────────
const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

// ── App Inner Content ──────────────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const [token, setToken] = React.useState(localStorage.getItem('token'));
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, [location]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Toaster position="top-right" reverseOrder={false} />
      <GlobalPreview />

      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      <div
        className="flex-1 flex flex-col min-w-0 transition-[padding-left] duration-300"
        style={{ paddingLeft: token ? 'var(--sidebar-width)' : '0px' }}
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
                Société les <span className="text-amber-500 font-black">cinq elements</span>
              </span>
            </div>
          </header>
        )}

        {token && <AIAssistant />}

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
              <Route path="/add-client" element={<PrivateRoute><AddClient /></PrivateRoute>} />
              <Route path="/contractors" element={<PrivateRoute><Contractors /></PrivateRoute>} />
              <Route path="/intervenants" element={<PrivateRoute><Intervenants /></PrivateRoute>} />
              <Route path="/charges" element={<PrivateRoute><Charges /></PrivateRoute>} />
              <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/workers" element={<PrivateRoute><Workers /></PrivateRoute>} />
              <Route path="/salaries" element={<PrivateRoute><Salaries /></PrivateRoute>} />

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