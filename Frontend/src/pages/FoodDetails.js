import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from './contexts/Cartcontexts';

export default function FoodDetails() {
  const { id } = useParams();
  const [meal, setMeal] = useState(null);
  const [amount, setAmount] = useState(1);
  const { cartItems, addToCart } = useCart();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL;
  const [savedAmount, setSavedAmount] = useState(1);

  useEffect(() => {
    fetch('http://localhost:5000/api/menu')
      .then(res => res.json())
      .then(data => {
        const selectedMeal = data.find(m => m._id === id || m.id === id);
        setMeal(selectedMeal);
        const existingItem = cartItems.find(item => item.id === selectedMeal._id);
        if (existingItem) {
          setAmount(existingItem.amount);
          setSavedAmount(existingItem.amount);
        } else {
          setAmount(1);
        }
      });
  }, [id]);

  if (!meal) return <p className="text-center mt-10 text-gray-600">Loading...</p>;

  const handleAmountChange = (e) => {
    setAmount(Number(e.target.value));
  };

  const handleAddToCart = () => {
    const updatedMeal = {
      id: meal._id,
      name: meal.name,
      image: meal.image,
      price: meal.price,
      amount,
    };
    addToCart(updatedMeal);
    setSavedAmount(amount);
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 text-center">{meal.name}</h1>

      <img
        src={`${API_URL}${meal.image}`}
        alt={meal.name}
        className="w-full h-64 object-cover rounded-lg mb-6 shadow-lg"
      />

      <div className="space-y-2 text-gray-700 mb-6">
        <div><strong>Category:</strong> {meal.category}</div>
        <div><strong>Area:</strong> {meal.area}</div>
        <div><strong>Price:</strong> ${meal.price}</div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 items-center">
        <button
          onClick={() => navigate('/')}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          Back
        </button>

        <div className="flex justify-center items-center gap-2">
          <label htmlFor="amount" className="text-sm text-gray-600 font-bold">Amount:</label>
          <input
            type="number"
            id="amount"
            min="1"
            value={amount}
            onChange={handleAmountChange}
            className="w-16 p-2 border border-gray-300 rounded text-center font-bold"
          />
        </div>

        <button
          onClick={handleAddToCart}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
        >
          {cartItems.find(item => item.id === meal._id) ? 'Update Cart' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}

