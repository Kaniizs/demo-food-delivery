import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from './pages/contexts/AuthContexts';
import Navbar from './pages/components/Nav';


import AdminLogin from './pages/auth/admin/AdminLogin';
import Dashboard from './pages/auth/admin/Dashboard';

function PrivateRoute({ children }) {
  const { token } = useContext(AuthContext);
  return token ? children : <Navigate to="/login" />;
}

function Layout() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/admin/login';

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

      </Routes>
    </>
  );
}

function App() {
  return (

    <BrowserRouter>
      <Layout />
    </BrowserRouter>

  );
}

export default App;
