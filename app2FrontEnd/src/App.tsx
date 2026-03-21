import './index.css';
import './App.css'
import React from 'react';
import Login from './component/Login.tsx'
import Footer from './component/Footer.tsx';
import NavBar from './component/NavBar.tsx';
import AddProperty from './component/AddProperty.tsx';
import AddTerrain from './component/AddTerrain.tsx';
import AddClient from './component/AddClient.tsx';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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
import { Toaster } from 'react-hot-toast';

// ── Auth Guard ─────────────────────────────────────────────────────────────────
const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

// ── App ────────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const token = localStorage.getItem('token');

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Router>
        <Toaster position="top-right" reverseOrder={false} />
        <NavBar />

        <div className="flex-grow pt-20 px-4 pb-10">
          <div className="max-w-7xl mx-auto">
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Protected */}
              <Route path="/" element={token ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />} />
              <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
              <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/terrains" element={<PrivateRoute><Terrains /></PrivateRoute>} />
              <Route path="/properties" element={<PrivateRoute><Properties /></PrivateRoute>} />
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

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </div>

        <Footer />
      </Router>
    </div>
  )
}

export default App