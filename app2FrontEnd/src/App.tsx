import './index.css';
import './App.css'
import React, { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react';
const AppToaster = lazy(() => import('./component/common/AppToaster'));
import { ConfirmHost } from './component/common/ConfirmDialog';
import { QuickPaymentHost } from './component/common/QuickPayment';
import { WhatsAppReminderHost } from './component/common/WhatsAppReminder';
import { CommandPaletteHost, useGlobalShortcuts } from './component/common/CommandPalette';
const Echeancier = lazy(() => import('./component/Echeancier'));
const Cheques = lazy(() => import('./component/Cheques'));
const Rentabilite = lazy(() => import('./component/Rentabilite'));
const Disponibilites = lazy(() => import('./component/Disponibilites'));
const Taches = lazy(() => import('./component/Taches'));
const Messages = lazy(() => import('./component/Messages'));
import { TaskEditorHost } from './component/common/TaskEditor';
import { ClientDocumentsHost } from './component/common/ClientDocuments';
import { ProgressPhotosHost } from './component/common/ProgressPhotos';
import { useAppSettings } from './lib/appSettings';
const Parametres = lazy(() => import('./component/Parametres'));

import Login from './component/Login'
import Sidebar from './component/Sidebar';
const AddProperty = lazy(() => import('./component/AddProperty'));
const AddTerrain = lazy(() => import('./component/AddTerrain'));
const AddClient = lazy(() => import('./component/AddClient'));
const Dashboard = lazy(() => import('./component/Dashboard'));
const Home = lazy(() => import('./component/Home'));
const Terrains = lazy(() => import('./component/Terrains'));
const Properties = lazy(() => import('./component/Properties'));
const Contractors = lazy(() => import('./component/Contractors'));
const Intervenants = lazy(() => import('./component/Intervenants'));
const EditTerrain = lazy(() => import('./component/EditTerrain'));
const Charges = lazy(() => import('./component/Charges'));
const Clients = lazy(() => import('./component/Clients'));
const Profile = lazy(() => import('./component/Profile'));
const ConfigPrixBiens = lazy(() => import('./component/ConfigPrixBiens'));
import GlobalPreview from './component/GlobalPreview';
const Workers = lazy(() => import('./component/Workers'));
const Salaries = lazy(() => import('./component/Salaries'));
const Transactions = lazy(() => import('./component/Transactions'));
const Contentieux = lazy(() => import('./component/Contentieux'));
const ServiceSocietes = lazy(() => import('./component/ServiceSocietes'));

// Procurement Components
const Articles = lazy(() => import('./component/procurement/Articles'));
const AddArticle = lazy(() => import('./component/procurement/AddArticle'));
const Suppliers = lazy(() => import('./component/procurement/Suppliers'));
const AddSupplier = lazy(() => import('./component/procurement/AddSupplier'));
const PurchaseInvoices = lazy(() => import('./component/procurement/PurchaseInvoices'));
const AddAchat = lazy(() => import('./component/procurement/AddAchat'));
const GeneralWorks = lazy(() => import('./component/procurement/GeneralWorks'));
const AddGeneralWork = lazy(() => import('./component/procurement/AddGeneralWork'));
const StockDashboard = lazy(() => import('./component/procurement/StockDashboard'));
const StockExitForm = lazy(() => import('./component/procurement/StockExitForm'));
const FactureBuilder = lazy(() => import('./component/FactureBuilder'));
const FacturesList = lazy(() => import('./component/FacturesList'));
const AIAssistant = lazy(() => import('./component/AIAssistant'));
const ClientLogin = lazy(() => import('./component/ClientLogin'));
const ClientDashboard = lazy(() => import('./component/ClientDashboard'));
const TerrainMap = lazy(() => import('./component/TerrainMap'));

// ── Auth Guard ─────────────────────────────────────────────────────────────────
const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

const PortalRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const clientUser = localStorage.getItem('clientUser');
  return clientUser ? children : <Navigate to="/portal/login" replace />;
};

/** Shown for a split second while a page's code loads. */
const PageLoading = () => (
  <div className="space-y-5 animate-fade-in" aria-busy="true">
    <div className="h-24 rounded-xl bg-white border border-slate-200" />
    <div className="h-64 rounded-xl bg-white border border-slate-200" />
  </div>
);

// ── App Inner Content ──────────────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const [token, setToken] = React.useState(localStorage.getItem('token'));
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, [location]);

  const isPortal = location.pathname.startsWith('/portal');
  // Login screens take the full window (no page padding / width limit)
  const isAuthScreen = location.pathname === '/login' || location.pathname === '/portal/login';
  const isAdmin = !!token && !isPortal && location.pathname !== '/login';
  useGlobalShortcuts(isAdmin);
  useAppSettings(isAdmin); // company identity, preferences, AI key

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AppToaster />
      <ConfirmHost />
      {isAdmin && <QuickPaymentHost />}
      {isAdmin && <WhatsAppReminderHost />}
      {isAdmin && <ClientDocumentsHost />}
      {isAdmin && <ProgressPhotosHost />}
      {isAdmin && <TaskEditorHost />}
      {isAdmin && <CommandPaletteHost />}
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
          <header className="lg:hidden sticky top-0 z-[100] bg-sidebar border-b border-sidebar-border shadow-lg h-[60px] flex items-center px-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 text-white/60 rounded cursor-pointer hover:bg-white/10 mr-2"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center">
              <img src="/assets/LogoNavbar.webp" alt="Logo" className="h-8 w-auto mr-3" />
              <span className="self-center text-base font-semibold whitespace-nowrap text-white tracking-tight">
                Cinq <span className="text-brand-500">Éléments</span>
              </span>
            </div>
          </header>
        )}

        {token && !isPortal && <Suspense fallback={null}><AIAssistant /></Suspense>}

        <main className={isAuthScreen ? 'flex-grow' : 'flex-grow px-4 py-6'}>
          <div key={location.pathname} className={isAuthScreen ? 'animate-page-in' : 'max-w-7xl mx-auto animate-page-in'}>
            <Suspense fallback={<PageLoading />}>
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
              <Route path="/echeancier" element={<PrivateRoute><Echeancier /></PrivateRoute>} />
              <Route path="/cheques" element={<PrivateRoute><Cheques /></PrivateRoute>} />
              <Route path="/rentabilite" element={<PrivateRoute><Rentabilite /></PrivateRoute>} />
              <Route path="/disponibilites" element={<PrivateRoute><Disponibilites /></PrivateRoute>} />
              <Route path="/taches" element={<PrivateRoute><Taches /></PrivateRoute>} />
              <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
              <Route path="/parametres" element={<PrivateRoute><Parametres /></PrivateRoute>} />

              {/* Client Portal Routes */}
              <Route path="/portal/login" element={<ClientLogin />} />
              <Route path="/portal/dashboard" element={<PortalRoute><ClientDashboard /></PortalRoute>} />

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            </Suspense>
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