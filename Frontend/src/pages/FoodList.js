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
    fetch(`${API_URL}/api/menu`)
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
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold text-center text-gray-800 mb-10">Food Items</h1>

      {/* Category Filter Buttons */}
      <div className="flex flex-wrap justify-center gap-3 mb-4">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 text-sm rounded-md border ${selectedCategory === cat
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Price Filter Dropdown */}
      <div className="flex justify-center mb-6">
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

      {/* Meals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filteredMeals.length > 0 ? (
          filteredMeals.map(meal => (
            <div
              key={meal._id}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition relative"
            >
              <Link to={`/food/${meal._id}`}>
                <div className="relative">
                  <img
                    src={`${API_URL}${meal.image}`}
                    alt={meal.name}
                    className="w-full h-40 object-cover rounded-t-xl"
                  />
                  <div className="absolute top-2 left-2 bg-white text-sm text-gray-800 px-3 py-1 rounded-full shadow">
                    ${meal.price}
                  </div>
                </div>
              </Link>
              <div className="p-4">
                <Link to={`/food/${meal._id}`}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{meal.name}</h3>
                </Link>
                <p className="text-sm text-gray-600 mb-2">{meal.description}</p>

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
