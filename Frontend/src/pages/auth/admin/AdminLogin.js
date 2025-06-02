import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContexts';

export default function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { setToken, setUsername: setAuthUsername } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Invalid username or password');
            }

            const data = await res.json();

            if (data.role !== 'admin') {
                throw new Error('Access denied: not an admin');
            }

            setToken(data.token);
            setAuthUsername(username);
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-green-300">
            <div className="bg-white shadow-2xl rounded-2xl flex max-w-4xl w-full overflow-hidden">
                <div className="w-full lg:w-1/2 p-10">
                    <h2 className="text-3xl font-bold text-gray-800 mb-2 font-mono">Administrator Login</h2>
                    <p className="text-sm text-gray-600 mb-6 font-mono">Enter your username and password to log in.</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && <p className="text-red-600 text-sm">{error}</p>}

                        <div>
                            <label htmlFor="username" className="block text-sm text-gray-600 mb-1 font-mono font-bold">Username</label>
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
                            <label htmlFor="password" className="block text-sm text-gray-600 mb-1 font-mono font-bold">Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-green-500 text-white py-2 rounded-md font-semibold font-mono hover:bg-green-600 transition duration-200"
                        >
                            Login
                        </button>
                    </form>
                </div>

                <div className="w-1/2 hidden lg:block">
                    <img
                        src="https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=800&q=80"
                        alt="Admin Login"
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>
        </div>
    );
}
