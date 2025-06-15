import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../../../css/fonts.css';

const API_URL = process.env.REACT_APP_API_URL;

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('menu');
  const [menu, setMenu] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tableOrders, setTableOrders] = useState({});
  const [selectedTable, setSelectedTable] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFood, setNewFood] = useState({
    name: '',
    image: null,
    category: '',
    instructions: '',
    price: '',
  });
  const [editFood, setEditFood] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [message, setMessage] = useState('');
  const token = localStorage.getItem('token');
  const [categories, setCategories] = useState([
    'อาหารจานหลัก',
    'อาหารทานเล่น',
    'เครื่องดื่ม',
    'ของหวาน',
    'สลัด',
    'ซุป'
  ]);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [completionCountdown, setCompletionCountdown] = useState(60);
  const [pendingCompletion, setPendingCompletion] = useState(null);

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
      setMenu(menuRes.data);
      setUsers(usersRes.data);
      setOrders(ordersRes.data);
    } catch (err) {
      setMessage('Failed to fetch data.');
    }
  };

  const fetchTableOrder = async (tableId) => {
    try {
      const response = await axios.get(`${API_URL}/api/orders/${tableId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTableOrders(prev => ({
        ...prev,
        [tableId]: response.data
      }));
    } catch (err) {
      if (err.response?.status === 404) {
        // If no order found, remove it from the state
        setTableOrders(prev => {
          const newState = { ...prev };
          delete newState[tableId];
          return newState;
        });
      } else {
        console.error('Error fetching table order:', err);
      }
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchData();
    
    // Set up polling for table orders
    const tableIds = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10'];
    const interval = setInterval(() => {
      tableIds.forEach(tableId => {
        fetchTableOrder(tableId);
      });
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    setMessage('');
  }, [activeTab]);

  const handleChange = e => {
    const { name, value, files } = e.target;
    const target = editFood ? editFood : newFood;

    if (name === 'category' && value === 'add-custom') {
      setShowCustomCategory(true);
      return;
    }

    const updated = { ...target, [name]: name === 'image' ? files[0] : value };
    editFood ? setEditFood(updated) : setNewFood(updated);
  };

  const handleCustomCategory = () => {
    if (customCategory.trim() === '') return;

    if (!categories.includes(customCategory)) {
      setCategories([...categories, customCategory]);
    }

    const target = editFood ? editFood : newFood;
    const updated = { ...target, category: customCategory };
    editFood ? setEditFood(updated) : setNewFood(updated);

    setShowCustomCategory(false);
    setCustomCategory('');
  };

  const handleAddOrUpdateFood = async e => {
    e.preventDefault();
    const data = editFood ? editFood : newFood;
    const formData = new FormData();
    Object.keys(data).forEach(key => formData.append(key, data[key]));

    try {
      if (editFood) {
        await axios.put(`${API_URL}/api/food/${editFood._id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });
        setMessage('อัพเดทเมนูสำเร็จ!');
      } else {
        await axios.post(`${API_URL}/api/food`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        });
        setMessage('เพิ่มเมนูสำเร็จ!');
      }

      setNewFood({ name: '', image: null, category: '', instructions: '', price: '' });
      setEditFood(null);
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setMessage('เกิดข้อผิดพลาดในการบันทึกเมนู');
    }
  };

  const handleDeleteFood = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/food/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenu(menu.filter(item => item._id !== id));
      setMessage('ลบเมนูสำเร็จ');
      setDeleteTarget(null);
    } catch {
      setMessage('เกิดข้อผิดพลาดในการลบเมนู');
    }
  };

  const openAddModal = () => {
    setEditFood(null);
    setNewFood({ name: '', image: null, category: '', instructions: '', price: '' });
    setIsModalOpen(true);
    setShowCustomCategory(false);
    setCustomCategory('');
  };

  const openEditModal = (item) => {
    setEditFood(item);
    setIsModalOpen(true);
    setShowCustomCategory(false);
    setCustomCategory('');
  };

  const startCompletionProcess = async (tableId) => {
    try {
      // First update status to notify mobile app
      await axios.put(`${API_URL}/api/orders/${tableId}/status`, 
        { status: 'เสร็จสิ้น' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Set pending completion and start countdown
      setPendingCompletion(tableId);
      setIsCompletionModalOpen(true);
      setCompletionCountdown(60);
      
      // Start countdown
      const timer = setInterval(() => {
        setCompletionCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Store timer ID for cleanup
      return timer;
    } catch (err) {
      console.error('Error starting completion process:', err);
      setMessage('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
    }
  };

  const confirmCompletion = async () => {
    if (!pendingCompletion) return;
    
    try {
      await axios.delete(`${API_URL}/api/orders/${pendingCompletion}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove the order from state
      setTableOrders(prev => {
        const newState = { ...prev };
        delete newState[pendingCompletion];
        return newState;
      });
      
      setIsCompletionModalOpen(false);
      setPendingCompletion(null);
      setCompletionCountdown(60);
    } catch (err) {
      console.error('Error completing order:', err);
      setMessage('เกิดข้อผิดพลาดในการลบออเดอร์');
    }
  };

  const handleDeleteOrder = async (tableId) => {
    try {
      // First check if the order exists and is completed
      const order = tableOrders[tableId];
      if (!order) {
        setMessage('ไม่พบออเดอร์นี้');
        return;
      }

      if (order.status !== 'เสร็จสิ้น') {
        setMessage('สามารถลบได้เฉพาะออเดอร์ที่เสร็จสิ้นแล้วเท่านั้น');
        return;
      }

      // If order exists and is completed, proceed with deletion
      await axios.delete(`${API_URL}/api/orders/${tableId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove the order from state
      setTableOrders(prev => {
        const newState = { ...prev };
        delete newState[tableId];
        return newState;
      });

      setMessage('ลบออเดอร์เรียบร้อยแล้ว');
    } catch (err) {
      console.error('Error deleting order:', err);
      setMessage('เกิดข้อผิดพลาดในการลบออเดอร์');
    }
  };

  const handleStatusUpdate = async (tableId, newStatus) => {
    try {
      if (newStatus === 'เสร็จสิ้น') {
        // If status is completed, delete the order
        await axios.delete(`${API_URL}/api/orders/${tableId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Remove the order from state
        setTableOrders(prev => {
          const newState = { ...prev };
          delete newState[tableId];
          return newState;
        });
      } else {
        // Update status for non-completed orders
        await axios.put(`${API_URL}/api/orders/${tableId}/status`, 
          { status: newStatus },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // Refresh the table order after status update
        fetchTableOrder(tableId);
      }
      setIsStatusDropdownOpen(false);
      setSelectedStatus(null);
    } catch (err) {
      console.error('Error updating order status:', err);
      setMessage('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
    }
  };

  useEffect(() => {
    return () => {
      if (pendingCompletion) {
        setIsCompletionModalOpen(false);
        setPendingCompletion(null);
        setCompletionCountdown(60);
      }
    };
  }, [pendingCompletion]);

  const renderContent = () => {
    switch (activeTab) {
      case 'menu':
        return (
          <div className="p-6  font-Kadwa">
            {/* Menu Header with Add Button */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">จัดการเมนู</h2>
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-custom-green text-black rounded-lg hover:bg-green-600 transition font-semibold"
              >
                + เพิ่มเมนู
              </button>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`mb-4 p-3 rounded ${message.includes('สำเร็จ') ? 'bg-green-100 text-green-800 ' : 'bg-red-100 text-red-800'}`}>
                {message}
              </div>
            )}

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {menu.map(item => (
                <div key={item._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={`${API_URL}${item.image}`}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex space-x-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="bg-yellow-500 text-white p-2 rounded-full hover:bg-yellow-600 transition"
                        title="แก้ไข"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                        title="ลบ"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">{item.category}</span>
                      <span className="font-bold text-green-600">{item.price} บาท</span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{item.instructions}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4  font-Kadwa">
                <div className="bg-white rounded-lg w-full max-w-md">
                  <div className="p-4 border-b">
                    <h3 className="text-xl font-bold">
                      {editFood ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}
                    </h3>
                  </div>
                  <form onSubmit={handleAddOrUpdateFood} className="p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">ชื่อเมนู</label>
                        <input
                          name="name"
                          value={editFood ? editFood.name : newFood.name}
                          onChange={handleChange}
                          required
                          className="w-full p-2 border rounded"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">ประเภท</label>
                        {!showCustomCategory ? (
                          <select
                            name="category"
                            value={editFood?.category || newFood.category}
                            onChange={handleChange}
                            required
                            className="w-full p-2 border rounded"
                          >
                            <option value="">เลือกประเภท</option>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                            <option value="add-custom">+ เพิ่มประเภทใหม่</option>
                          </select>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={customCategory}
                              onChange={(e) => setCustomCategory(e.target.value)}
                              placeholder="ระบุประเภทใหม่"
                              className="flex-1 p-2 border rounded"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={handleCustomCategory}
                              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              ตกลง
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowCustomCategory(false)}
                              className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">ราคา (บาท)</label>
                        <input
                          name="price"
                          type="number"
                          value={editFood ? editFood.price : newFood.price}
                          onChange={handleChange}
                          required
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">รูปภาพ</label>
                        <input
                          type="file"
                          name="image"
                          onChange={handleChange}
                          className="w-full p-2 border rounded"
                          accept="image/*"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">คำอธิบาย</label>
                        <textarea
                          name="instructions"
                          value={editFood ? editFood.instructions : newFood.instructions}
                          onChange={handleChange}
                          required
                          className="w-full p-2 border rounded"
                          rows="3"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 border rounded hover:bg-gray-100"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-custom-green text-black rounded-lg hover:bg-green-600"
                      >
                        {editFood ? 'อัพเดท' : 'บันทึก'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

            )}



            {/* Delete Confirmation Modal */}
            {deleteTarget && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-xl font-bold mb-3">ยืนยันการลบเมนู</h3>
                  <p className="mb-4">คุณแน่ใจว่าต้องการลบเมนู <strong>{deleteTarget.name}</strong> ใช่หรือไม่?</p>
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p>การกระทำนี้ไม่สามารถยกเลิกได้</p>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="px-4 py-2 border rounded hover:bg-gray-100"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={() => handleDeleteFood(deleteTarget._id)}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'order-status':
        return (
          <div className="p-6 font-Kadwa">
            <h2 className="text-2xl font-bold mb-6">จัดการออเดอร์</h2>
            <div className="grid grid-cols-5 gap-4">
              {['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10'].map(tableId => {
                const order = tableOrders[tableId];
                let borderColor = 'border-gray-300';
                let bgColor = 'bg-gray-100';
                let statusText = '';
                let timeAgo = '';

                if (order) {
                  const minutesAgo = Math.floor((Date.now() - new Date(order.time)) / 60000);
                  timeAgo = `${minutesAgo} นาทีที่แล้ว`;

                  switch (order.status) {
                    case 'รอการเตรียม':
                      borderColor = 'border-red-500';
                      bgColor = 'bg-red-100';
                      statusText = 'รอการเตรียม';
                      break;
                    case 'กำลังเตรียม':
                      borderColor = 'border-yellow-500';
                      bgColor = 'bg-yellow-100';
                      statusText = 'กำลังเตรียม';
                      break;
                    case 'พร้อมเสิร์ฟ':
                      borderColor = 'border-blue-500';
                      bgColor = 'bg-blue-100';
                      statusText = 'พร้อมเสิร์ฟ';
                      break;
                    default:
                      statusText = 'รอออเดอร์';
                      break;
                  }
                }

                return (
                  <div 
                    key={tableId}
                    onClick={() => {
                      if (order) {
                        setSelectedTable(tableId);
                        setIsOrderModalOpen(true);
                      }
                    }}
                    className={`p-4 rounded border-2 text-center ${borderColor} ${bgColor} ${order ? 'cursor-pointer hover:shadow-lg transition' : ''}`}
                  >
                    <h3 className="font-bold mb-2">{tableId}</h3>
                    {order ? (
                      <>
                        <div className="text-sm text-gray-500">{timeAgo}</div>
                        <div className="mt-1 text-sm">{statusText}</div>
                      </>
                    ) : (
                      <div className="text-gray-400 mt-6">ไม่มีออเดอร์</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Order Details Modal */}
            {isOrderModalOpen && selectedTable && tableOrders[selectedTable] && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg w-full max-w-2xl">
                  <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold">รายละเอียดออเดอร์ - โต๊ะ {selectedTable}</h3>
                    <button
                      onClick={() => {
                        setIsOrderModalOpen(false);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">รายการอาหาร</h4>
                      <div className="space-y-2">
                        {tableOrders[selectedTable].items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span>{item.name}</span>
                            <span className="text-gray-600">{item.quantity} จาน</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h4 className="font-semibold mb-3">อัพเดทสถานะ</h4>
                      <div className="relative">
                        <button
                          onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          className={`w-full px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-between ${
                            tableOrders[selectedTable].status === 'รอการเตรียม'
                              ? 'bg-red-500 text-white'
                              : tableOrders[selectedTable].status === 'กำลังเตรียม'
                              ? 'bg-yellow-500 text-white'
                              : tableOrders[selectedTable].status === 'พร้อมเสิร์ฟ'
                              ? 'bg-blue-500 text-white'
                              : tableOrders[selectedTable].status === 'เสร็จสิ้น'
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              tableOrders[selectedTable].status === 'รอการเตรียม'
                                ? 'bg-red-200'
                                : tableOrders[selectedTable].status === 'กำลังเตรียม'
                                ? 'bg-yellow-200'
                                : tableOrders[selectedTable].status === 'พร้อมเสิร์ฟ'
                                ? 'bg-blue-200'
                                : tableOrders[selectedTable].status === 'เสร็จสิ้น'
                                ? 'bg-green-200'
                                : 'bg-gray-400'
                            }`}></span>
                            {tableOrders[selectedTable].status}
                          </div>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-5 w-5 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {isStatusDropdownOpen && (
                          <div className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                            <div className="py-1">
                              {[
                                { status: 'รอการเตรียม', color: 'red' },
                                { status: 'กำลังเตรียม', color: 'yellow' },
                                { status: 'พร้อมเสิร์ฟ', color: 'blue' },
                                { status: 'เสร็จสิ้น', color: 'green' }
                              ].map(({ status, color }) => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    if (status !== tableOrders[selectedTable].status) {
                                      setSelectedStatus(status);
                                      setIsStatusDropdownOpen(false);
                                    } else {
                                      setIsStatusDropdownOpen(false);
                                    }
                                  }}
                                  className={`w-full px-6 py-3 text-left flex items-center gap-2 hover:bg-gray-50 transition-colors duration-200 ${
                                    status === tableOrders[selectedTable].status ? 'bg-gray-50' : ''
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full bg-${color}-500`}></span>
                                  {status}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedStatus && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 transition-all duration-200 animate-fadeIn">
                        <p className="mb-4 text-gray-700">คุณต้องการเปลี่ยนสถานะเป็น <span className="font-semibold">{selectedStatus}</span> ใช่หรือไม่?</p>
                        {selectedStatus === 'พร้อมเสิร์ฟ' && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
                            <p className="flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              เมื่อกดยืนยัน ระบบจะแจ้งเตือนพนักงานเสิร์ฟว่าอาหารพร้อมเสิร์ฟ
                            </p>
                          </div>
                        )}
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleStatusUpdate(selectedTable, selectedStatus)}
                            className={`flex-1 px-6 py-3 text-white rounded-lg hover:opacity-90 transition-colors duration-200 shadow-sm ${
                              selectedStatus === 'รอการเตรียม'
                                ? 'bg-red-500'
                                : selectedStatus === 'กำลังเตรียม'
                                ? 'bg-yellow-500'
                                : selectedStatus === 'พร้อมเสิร์ฟ'
                                ? 'bg-blue-500'
                                : 'bg-green-500'
                            }`}
                          >
                            ยืนยัน
                          </button>
                          <button
                            onClick={() => setSelectedStatus(null)}
                            className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-gray-500 mt-4">
                      เวลาที่สั่ง: {new Date(tableOrders[selectedTable].time).toLocaleString('th-TH')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderCompletionModal = () => {
    if (!isCompletionModalOpen || !pendingCompletion) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-md p-6">
          <h3 className="text-xl font-bold mb-4">ยืนยันการเสร็จสิ้นออเดอร์</h3>
          <p className="mb-4">ออเดอร์ของโต๊ะ {pendingCompletion} จะถูกลบในอีก {completionCountdown} วินาที</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setIsCompletionModalOpen(false);
                setPendingCompletion(null);
                setCompletionCountdown(60);
              }}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              ยกเลิก
            </button>
            <button
              onClick={confirmCompletion}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              ยืนยันตอนนี้
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100 font-Kadwa">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">แผงควบคุม</h1>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveTab('menu')}
                className={`w-full text-left p-2 rounded ${activeTab === 'menu' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
              >
                จัดการเมนู
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('order-status')}
                className={`w-full text-left p-2 rounded ${activeTab === 'order-status' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
              >
                สถานะคำสั่งซื้อ
              </button>
            </li>
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
      {renderCompletionModal()}
    </div>
  );
};

export default Dashboard;