import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Papa from 'papaparse';

const InventoryDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Read the CSV file
        const response = await window.fs.readFile('liveinventory.csv');
        const csvText = new TextDecoder().decode(response);

        // Parse the CSV data
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              console.error('Parse errors:', results.errors);
              setError('Error parsing CSV data');
              return;
            }

            // Process the data
            const items = results.data;
            
            // Calculate overview statistics
            const overview = {
              totalProducts: items.length,
              totalStock: items.reduce((sum, item) => sum + (item.OnHand || 0), 0),
              lowStock: items.filter(item => 
                typeof item.OnHand === 'number' && 
                typeof item.ReorderThreshold === 'number' && 
                item.OnHand <= item.ReorderThreshold
              ).length,
              onOrder: items.reduce((sum, item) => sum + (item['On Order'] || 0), 0)
            };

            // Group by category
            const categories = items.reduce((acc, item) => {
              const category = item.Catergory || 'Uncategorized';
              if (!acc[category]) {
                acc[category] = [];
              }
              acc[category].push(item);
              return acc;
            }, {});

            setData({ items, overview, categories });
          },
          error: (error) => {
            console.error('Parse error:', error);
            setError('Error parsing CSV data');
          }
        });
      } catch (error) {
        console.error('Load error:', error);
        setError('Error loading inventory data');
      }
    };

    loadData();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400 bg-red-900/20 px-4 py-2 rounded-lg border border-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-blue-400 animate-pulse">Loading inventory data...</div>
      </div>
    );
  }

  const { items, overview, categories } = data;

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Inventory Dashboard</h1>
        
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Total Products</p>
            <p className="text-3xl font-bold text-white">{overview.totalProducts}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Total Stock</p>
            <p className="text-3xl font-bold text-white">{overview.totalStock}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">Low Stock Items</p>
            <p className="text-3xl font-bold text-red-400">{overview.lowStock}</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-sm text-gray-400 mb-1">On Order</p>
            <p className="text-3xl font-bold text-blue-400">{overview.onOrder}</p>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Low Stock Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items
              .filter(item => 
                typeof item.OnHand === 'number' && 
                typeof item.ReorderThreshold === 'number' && 
                item.OnHand <= item.ReorderThreshold
              )
              .map(item => (
                <div key={item.SKU} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-white font-medium">{item.ProductName}</h3>
                      <p className="text-sm text-gray-400">SKU: {item.SKU}</p>
                    </div>
                    <div className="bg-red-900/50 px-2 py-1 rounded text-sm text-red-300 border border-red-700">
                      Low Stock
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-400">Current Stock</p>
                      <p className="text-2xl font-bold text-white">{item.OnHand}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Reorder At</p>
                      <p className="text-2xl font-bold text-gray-300">{item.ReorderThreshold}</p>
                    </div>
                  </div>
                  {item['On Order'] > 0 && (
                    <div className="mt-2 text-sm text-blue-400">
                      {item['On Order']} units on order
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Category Overview */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">Stock by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(categories).map(([category, items]) => (
              <div key={category} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <h3 className="text-white font-medium mb-2">{category}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Total Items</p>
                    <p className="text-2xl font-bold text-white">{items.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Stock</p>
                    <p className="text-2xl font-bold text-white">
                      {items.reduce((sum, item) => sum + (item.OnHand || 0), 0)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;
