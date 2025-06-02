import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [menu, setMenu] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [newFood, setNewFood] = useState({
    name: '',
    image: null,
    category: '',
    instructions: '',
    price: '',
  });
  const [message, setMessage] = useState('');
  const token = localStorage.getItem('token');

  // Fetch all data
  const fetchData = async () => {
    try {
      const [menuRes, usersRes, ordersRes] = await Promise.all([
        axios.get(`${API_URL}/api/menu`),
        axios.get(`${API_URL}/api/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      console.log('Menu data:', menuRes.data);
      console.log('Users data:', usersRes.data);
      console.log('Orders data:', ordersRes.data);

      setMenu(menuRes.data);
      setUsers(usersRes.data);
      setOrders(ordersRes.data);
    } catch (err) {
      console.error('Error fetching data:', err.response?.data || err.message);
      setMessage('Failed to fetch data.');
    }
  };

  // Call fetchData when component mounts or token changes
  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [token]);

  useEffect(() => {
    setMessage('');
  }, [activeTab]);

  const handleChange = e => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setNewFood(prev => ({ ...prev, image: files[0] }));
    } else {
      setNewFood(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddFood = async e => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(newFood).forEach(key => formData.append(key, newFood[key]));

    try {
      await axios.post(`${API_URL}/api/food`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      setMessage('Food added successfully!');
      setNewFood({
        name: '',
        image: null,
        category: '',
        instructions: '',
        price: '',
      });
      fetchData();
    } catch (err) {
      setMessage('Failed to add food');
    }
  };

  const handleDeleteFood = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/food/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenu(menu.filter(item => item._id !== id));
      setMessage('Food item deleted successfully');
    } catch (err) {
      setMessage('Failed to delete food item');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        const ordersLast24h = orders.filter(order => {
          const orderDate = new Date(order.time);
          const now = new Date();
          const diffMs = now - orderDate;
          return diffMs <= 24 * 60 * 60 * 1000;
        });
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">Total Menu Items</h3>
                <p className="text-3xl font-bold text-blue-600">{menu.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">Total Users</h3>
                <p className="text-3xl font-bold text-green-600">{users.length}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Total Orders last 24 hours</h3>
              <p className="text-3xl font-bold text-red-600">{ordersLast24h.length}</p>
            </div>
          </div>
        );
      case 'add-food':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Add New Menu Item</h2>
            <form onSubmit={handleAddFood} className="bg-white p-6 rounded-lg shadow">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 mb-2">Name</label>
                  <input
                    name="name"
                    value={newFood.name}
                    onChange={handleChange}
                    required
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Image</label>
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleChange}
                    required
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Category</label>
                  <input
                    name="category"
                    value={newFood.category}
                    onChange={handleChange}
                    required
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Price</label>
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    value={newFood.price}
                    onChange={handleChange}
                    required
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Instructions</label>
                <textarea
                  name="instructions"
                  value={newFood.instructions}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded"
                  rows="4"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Food
              </button>
              {message && (
                <p className={`mt-3 ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                  {message}
                </p>
              )}
            </form>
          </div>
        );
      case 'manage-menu':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Manage Menu</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {menu.map(item => (
                <div key={item._id} className="border border-gray-200 rounded-lg overflow-hidden shadow hover:shadow-md">
                  <img
                    src={`${API_URL}${item.image}`}
                    alt={item.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h4 className="font-bold text-lg mb-2">{item.name}</h4>

                    <p className="mb-1"><span className="font-semibold">Category:</span> {item.category}</p>
                    <p className="mb-1"><span className="font-semibold">Price:</span> ${item.price}</p>
                    <p className="mb-3"><span className="font-semibold">Instructions:</span> {item.instructions}</p>

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleDeleteFood(item._id)}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full text-left p-2 rounded ${activeTab === 'dashboard' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
              >
                Dashboard
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('add-food')}
                className={`w-full text-left p-2 rounded ${activeTab === 'add-food' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
              >
                Add More Menu
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('manage-menu')}
                className={`w-full text-left p-2 rounded ${activeTab === 'manage-menu' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
              >
                Manage Menu
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;

