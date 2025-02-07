import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Papa from 'papaparse';

const ProductCard = ({ item }) => (
  <div className="bg-gray-800 rounded-xl shadow-lg p-5 border border-gray-700">
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="min-w-0">
        <h3 className="font-medium text-white text-lg truncate mb-1">
          {item.ProductName}
        </h3>
        <p className="text-gray-400">SKU: {item.SKU}</p>
      </div>
      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
        item.OnHand === 0 ? 'bg-red-900/50 text-red-300 border border-red-700' :
        item.OnHand <= item.ReorderThreshold ? 'bg-red-900/50 text-red-300 border border-red-700' :
        'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
      }`}>
        {item.OnHand === 0 ? 'Out of Stock' :
         item.OnHand <= item.ReorderThreshold ? 'Low Stock' : 'In Stock'}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-8 mb-4">
      <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
        <p className="text-sm text-blue-300 font-medium mb-1">Current Stock</p>
        <p className="text-3xl font-bold text-white">{item.OnHand}</p>
        {item.Vendor && (
          <p className="text-sm text-gray-400 mt-2">Vendor: {item.Vendor}</p>
        )}
      </div>
      <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
        <p className="text-sm text-gray-300 mb-1">Reorder At</p>
        <p className="text-2xl font-medium text-gray-200 mb-2">{item.ReorderThreshold}</p>
        {item['On Order'] > 0 && (
          <div className="bg-blue-900/50 px-3 py-1 rounded-full border border-blue-700 inline-block">
            <p className="text-sm text-blue-300">+{item['On Order']} on order</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

const InventoryDashboard = () => {
  const [inventoryData, setInventoryData] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [overview, setOverview] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [showLowStock, setShowLowStock] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await window.fs.readFile('liveinventory.csv');
        const csvText = new TextDecoder().decode(response);
        
        const result = Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        
        const data = result.data;
        setAllProducts(data);

        const grouped = data.reduce((acc, item) => {
          const category = item.Catergory || 'Uncategorized';
          if (!acc[category]) acc[category] = [];
          acc[category].push(item);
          return acc;
        }, {});

        const overviewData = {
          totalProducts: data.length,
          totalStock: data.reduce((sum, item) => sum + (item.OnHand || 0), 0),
          totalOnOrder: data.reduce((sum, item) => sum + (item['On Order'] || 0), 0),
          lowStock: data.filter(item => item.OnHand <= item.ReorderThreshold).length,
          categories: Object.keys(grouped).length,
          categoryBreakdown: Object.entries(grouped).map(([name, items]) => ({
            name,
            value: items.reduce((sum, item) => sum + (item.OnHand || 0), 0)
          }))
        };

        setInventoryData(grouped);
        setOverview(overviewData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading inventory data:', error);
        setError('Failed to load inventory data');
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const Overview = () => (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">Total Products</p>
          <p className="text-3xl font-bold text-white">{overview.totalProducts}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">Total Stock</p>
          <p className="text-3xl font-bold text-white">{overview.totalStock}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">Units On Order</p>
          <p className="text-3xl font-bold text-blue-400">{overview.totalOnOrder}</p>
        </div>
        <button 
          onClick={() => setShowLowStock(prev => !prev)}
          className={`bg-gray-800 rounded-xl p-6 border ${
            showLowStock ? 'border-red-500' : 'border-gray-700'
          } transition-colors hover:border-red-500`}
        >
          <p className="text-sm text-gray-400 mb-1">Low Stock Items</p>
          <p className="text-3xl font-bold text-red-400">{overview.lowStock}</p>
        </button>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">Categories</p>
          <p className="text-3xl font-bold text-white">{overview.categories}</p>
        </div>
      </div>

      {showLowStock ? (
        <div className="bg-gray-800 rounded-xl p-6 border border-red-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Low Stock Items</h3>
            <button 
              onClick={() => setShowLowStock(false)}
              className="text-gray-400 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {allProducts
              .filter(item => item.OnHand <= item.ReorderThreshold)
              .map(item => (
                <ProductCard key={item.SKU} item={item} />
              ))}
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Stock by Category</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={overview.categoryBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#9CA3AF' }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis tick={{ fill: '#9CA3AF' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={overview.categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#4B5563' }}
                  >
                    {overview.categoryBreakdown.map((entry, index) => (
                      <Cell key={index} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index % 6]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="animate-pulse text-blue-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-md p-4 -mx-6 -mt-6 mb-6 border-b border-gray-800">
          <div className="max-w-[1600px] mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">Aerovex Live Inventory</h1>
            
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3 bg-gray-800 text-white placeholder-gray-400 shadow-sm rounded-xl focus:ring-2 focus:ring-blue-500 outline-none border border-gray-700"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setShowLowStock(false);
                }}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  !selectedCategory && !searchQuery
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                Overview
              </button>
              {Object.keys(inventoryData).map(category => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setShowLowStock(false);
                  }}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    category === selectedCategory && !searchQuery
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {searchQuery ? (
          <div>
            <h2 className="text-xl text-white mb-4">Search Results ({allProducts.filter(item =>
              item.ProductName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.SKU.toLowerCase().includes(searchQuery.toLowerCase())
            ).length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {allProducts
                .filter(item =>
                  item.ProductName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.SKU.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(item => (
                  <ProductCard key={item.SKU} item={item} />
                ))}
            </div>
          </div>
        ) : !selectedCategory ? (
          <Overview />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {inventoryData[selectedCategory].map(item => (
              <ProductCard key={item.SKU} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryDashboard;
