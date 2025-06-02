import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function FoodList() {
  const [meals, setMeals] = useState([]);
  const [filteredMeals, setFilteredMeals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriceRange, setSelectedPriceRange] = useState('All');
  const API_URL = process.env.REACT_APP_API_URL;

  const priceRanges = ['All', 'Under $5', '$5 - $7.5', '$7.5 - $10', 'Above $10'];

  useEffect(() => {
    fetch('http://localhost:5000/api/menu')
      .then(res => res.json())
      .then(data => {
        setMeals(data);
        setFilteredMeals(data);
        const uniqueCategories = ['All', ...new Set(data.map(meal => meal.category))];
        setCategories(uniqueCategories);
      });
  }, []);

  useEffect(() => {
    let filtered = meals;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(meal => meal.category === selectedCategory);
    }

    if (selectedPriceRange !== 'All') {
      filtered = filtered.filter(meal => {
        const price = parseFloat(meal.price);
        switch (selectedPriceRange) {
          case 'Under $5':
            return price < 5;
          case '$5 - $7.5':
            return price >= 5 && price <= 7.5;
          case '$7.5 - $10':
            return price > 7.5 && price <= 10;
          case 'Above $10':
            return price > 10;
          default:
            return true;
        }
      });
    }

    setFilteredMeals(filtered);
  }, [selectedCategory, selectedPriceRange, meals]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">Food Menu</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedPriceRange}
            onChange={e => setSelectedPriceRange(e.target.value)}
            className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {priceRanges.map(range => (
              <option key={range} value={range}>{range}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filters Summary */}
      <div className="text-center text-gray-600 mb-8">
        <p className="text-sm">
          Showing: <span className="font-medium text-gray-800">{selectedCategory}</span> category &nbsp;|&nbsp;
          <span className="font-medium text-gray-800">{selectedPriceRange}</span> price range
        </p>
      </div>

      {/* Meal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filteredMeals.length > 0 ? (
          filteredMeals.map(meal => (
            <div key={meal._id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition">
              <Link to={`/food/${meal._id}`}>
                <img
                  src={`${API_URL}${meal.image}`}
                  alt={meal.name}
                  className="w-full h-48 object-cover"
                />
              </Link>
              <div className="p-4">
                <Link to={`/food/${meal._id}`}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:underline">{meal.name}</h3>
                </Link>
                <p className="text-gray-700 font-medium mb-1">Price: ${meal.price}</p>
                <p className="text-gray-500 text-sm">{meal.category}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-600 col-span-full">No meals found matching your criteria.</p>
        )}
      </div>
    </div>
  );
}
