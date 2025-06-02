import React, { useContext } from 'react';
import { useCart } from './contexts/Cartcontexts';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from './contexts/AuthContexts'; 
export default function Checkout() {
  const { cartItems, clearCart } = useCart();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL;
  const { token, username } = useContext(AuthContext);
  const customerName = username;

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.amount, 0);

  const handlePlaceOrder = async () => {
    if (!token) {
      alert('You must be logged in to place an order.');
      navigate('/login');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerName,
          items: cartItems.map(item => ({
            id: item.id || item._id,
            name: item.name,
            price: item.price,
            quantity: item.amount,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to place order');
      }

      alert('Order placed successfully!');
      clearCart();
      navigate('/');
    } catch (error) {
      console.error('Order placement error:', error);
      alert(`Failed to place order: ${error.message}`);
    }
  };

  if (cartItems.length === 0) {
    return <p className="text-center mt-10">Your cart is empty.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 mt-10 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-6">Confirm Your Order</h1>

      <ul className="divide-y divide-gray-200 mb-6">
        {cartItems.map(item => (
          <li key={item.id || item._id} className="flex items-center py-4">
            <img
              src={`${API_URL}${item.image}`}
              alt={item.name}
              className="w-16 h-16 rounded object-cover border"
            />
            <div className="ml-4 flex-1">
              <h2 className="font-semibold">{item.name}</h2>
              <p>Quantity: {item.amount}</p>
              <p>Price: ${item.price * item.amount}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="text-right mb-6">
        <strong>Total: </strong>${totalPrice.toFixed(2)}
      </div>

      <button
        onClick={handlePlaceOrder}
        className="w-full bg-green-600 text-white py-3 rounded hover:bg-green-700 transition"
      >
        Place Order
      </button>
    </div>
  );
}
