import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContexts';
import '../../css/fonts.css';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, username, logout } = useContext(AuthContext);

  const isAdmin = location.pathname.startsWith('/admin');

  const handleLogout = () => {
    logout();
    navigate(isAdmin ? '/admin/login' : '/login');
  };

  return (
    <nav className="bg-custom-green text-black p-4 flex justify-between items-center font-Kadwa">
      <Link
        to={isAdmin ? '/admin/dashboard' : '/'}
        className="text-2xl font-bold"
      >
        FoodMAMA
      </Link>

      <div className="flex items-center gap-4">
        {!isAdmin}

        {!token ? (
          <>
            <Link to="/login" className="hover:underline">Login</Link>
            <Link to="/register" className="hover:underline">Register</Link>
          </>
        ) : (
          <>
            <span className="mr-2 font-semibold">{username}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 px-3 py-1 rounded hover:bg-red-700 text-white font-semibold"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
