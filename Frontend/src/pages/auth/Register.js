import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContexts';
import { motion } from 'framer-motion';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { setToken, setUsername: setAuthUsername } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to register');
      }

      const loginRes = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!loginRes.ok) {
        const data = await loginRes.json();
        throw new Error(data.error || 'Failed to login');
      }

      const loginData = await loginRes.json();
      setToken(loginData.token);
      setAuthUsername(username);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-green-300"
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.4 }}
    >
      <div className="bg-white shadow-2xl rounded-2xl flex max-w-4xl w-full overflow-hidden">
        {/* Form on the left */}
        <div className="w-full lg:w-1/2 p-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-2 font-mono">Create Account</h2>
          <p className="text-sm text-gray-600 mb-6 font-mono">Fill in the form below to create an account.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div>
              <label htmlFor="username" className="block mb-1 text-sm text-gray-600 font-mono font-bold">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <div>
              <label htmlFor="password" className="block mb-1 text-sm text-gray-600 font-mono font-bold">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block mb-1 text-sm text-gray-600 font-mono font-bold">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-green-500 text-white py-2 rounded-md font-semibold hover:bg-green-600 transition duration-200 font-mono"
            >
              Register
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 font-mono">
            Already have an account?{' '}
            <a href="/login" className="text-green-500 hover:underline font-mono">Login here</a>
          </p>
        </div>

        {/* Image on the right */}
        <div className="w-1/2 hidden lg:block">
          <img
            src="https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=800&q=80"
            alt="Delicious Food"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </motion.div>
  );
}
