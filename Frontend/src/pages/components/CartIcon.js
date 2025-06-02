import React, { useState } from 'react';
import { useCart } from '../contexts/Cartcontexts';
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CartIcon() {
  const { cartItems, removeFromCart } = useCart();
  const [showCart, setShowCart] = useState(false);
  const API_URL = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();

  const handleClick = () => {
    setShowCart(!showCart);
  };

  const handleRemove = id => {
    removeFromCart(id);
  };

  const handleCheckout = () => {
    setShowCart(false); 
    navigate('/checkout');
  };


  return (
    <div className="relative cursor-pointer">
      <ShoppingCart className="w-7 h-7 text-green-800" onClick={handleClick} />
      {cartItems.length > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {cartItems.length}
        </span>
      )}
      {showCart && cartItems.length > 0 && (
        <div className="absolute top-10 right-0 bg-white border border-gray-200 rounded-lg shadow-lg w-72 z-50">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">
            Cart Items
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {cartItems.map(item => (
              <li
                key={item.id || item._id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100"
              >
                <img
                  src={`${API_URL}${item.image}`}
                  alt={item.name}
                  className="w-12 h-12 rounded object-cover border border-gray-200"
                />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{item.name || 'Unnamed'}</h3>
                  <p className="text-xs text-gray-500">Qty: {item.amount || 1}</p>
                  <p className="text-sm text-gray-500">${item.price * item.amount}</p>
                </div>
                <button
                  onClick={() => handleRemove(item.id || item._id)}
                  className="text-red-600 hover:text-red-800 text-lg font-bold"
                  title="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="flex justify-end p-4">
            <div className="flex items-center justify-center">
              <button
                onClick={handleCheckout}
                className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition duration-300 ease-in-out"
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

