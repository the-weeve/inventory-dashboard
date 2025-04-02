import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Papa from 'papaparse';

const InventoryDashboard = () => {
  const [inventoryData, setInventoryData] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [overview, setOverview] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [updateHistory, setUpdateHistory] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const SHEET_ID = '1bCNMgfDBJaAco8-HEg9TY5oDnT4f1ftywFqkQXkpoBE';
        
        // Instead of using the API, we'll use local tracking
        // This doesn't get the exact spreadsheet update time,
        // but will track when we detect changes in the data
        
        // Fetch the actual CSV data
        const response = await fetch(
          `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`
        );
        const csvText = await response.text();
        const result = Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        const data = result.data;

        // Generate a checksum of the data to detect changes
        const dataChecksum = JSON.stringify(data.map(item => ({ 
          sku: item.SKU, 
          onHand: item.OnHand, 
          onOrder: item['On Order'] 
        })));
        
        // Store checksum in localStorage to persist between sessions
        const previousChecksum = localStorage.getItem('inventoryDataChecksum');
        
        // Current time for this update
        const currentTime = new Date();
        
        // If this is the first load or the data has actually changed
        if (!previousChecksum || previousChecksum !== dataChecksum) {
          // Save new checksum
          localStorage.setItem('inventoryDataChecksum', dataChecksum);
          
          // Add to update history
          const newHistoryEntry = {
            timestamp: currentTime,
            productCount: data.length,
            totalStock: data.reduce((sum, item) => sum + item.OnHand, 0)
          };
          
          // Keep the 10 most recent updates
          const storedHistory = JSON.parse(localStorage.getItem('updateHistory') || '[]');
          const updatedHistory = [newHistoryEntry, ...storedHistory].slice(0, 10);
          
          // Save to localStorage and state
          localStorage.setItem('updateHistory', JSON.stringify(updatedHistory));
          setUpdateHistory(updatedHistory);
          
          // Mark as updated
          setLastUpdated(currentTime);
        } else if (!lastUpdated) {
          // If no lastUpdated time but data hasn't changed, still set the time
          setLastUpdated(currentTime);
          
          // Load history from localStorage
          const storedHistory = JSON.parse(localStorage.getItem('updateHistory') || '[]');
          setUpdateHistory(storedHistory);
        }
        setAllProducts(data);

        const categoryOrder = [
          'Recirculating Whisper',
          'Vented Whisper',
          'Room Air Purifiers',
          'Replacement Filters',
          'Printer Products',
          'TOTW Parts',
          'Whisper Parts',
          'Packaging',
          'Office Supplies',
          'Demo Whisper',
          'Accessories'
        ];

        const grouped = data.reduce((acc, item) => {
          const category = item.Catergory;
          if (!acc[category]) acc[category] = [];
          acc[category].push(item);
          return acc;
        }, {});

        const sortedGrouped = {};
        categoryOrder.forEach(category => {
          if (grouped[category]) {
            sortedGrouped[category] = grouped[category];
          }
        });
        
        const mainCategories = [
          'Recirculating Whisper',
          'Vented Whisper',
          'Room Air Purifiers',
          'Replacement Filters',
          'Printer Products'
        ];
        
        const overviewData = {
          totalProducts: data.length,
          totalStock: data.reduce((sum, item) => sum + item.OnHand, 0),
          totalOnOrder: data.reduce((sum, item) => sum + (item['On Order'] || 0), 0),
          lowStock: data.filter(item => item.OnHand <= item.ReorderThreshold).length,
          categories: Object.keys(sortedGrouped).length,
          categoryBreakdown: Object.entries(sortedGrouped)
            .filter(([name]) => mainCategories.includes(name))
            .map(([name, items]) => {
              const totalStock = items.reduce((sum, item) => sum + item.OnHand, 0);
              const belowThreshold = items.filter(item => item.OnHand <= item.ReorderThreshold).length;
              const velocity = ((items.length - belowThreshold) / items.length) * 100;
              return {
                name,
                value: totalStock,
                velocity: velocity
              };
            })
        };

        setInventoryData(sortedGrouped);
        setOverview(overviewData);
      } catch (error) {
        console.error('Error loading inventory data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'Unknown';
    
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return date.toLocaleString(undefined, options);
  };

  const UpdateTracker = () => (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4">Update History</h3>
      
      <div className="flex items-center mb-6">
        <div className="flex-shrink-0 h-12 w-12 bg-blue-900/50 rounded-full flex items-center justify-center border border-blue-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="ml-4">
          <p className="text-sm text-gray-400">Last Updated</p>
          <p className="text-xl font-medium text-white">{formatDate(lastUpdated)}</p>
        </div>
      </div>
      
      {updateHistory.length > 1 && (
        <div>
          <h4 className="text-md font-medium text-gray-300 mb-2">Recent Updates</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {updateHistory.slice(1).map((update, index) => (
              <div key={index} className="bg-gray-700/30 rounded-lg p-3 border border-gray-700 flex justify-between">
                <div>
                  <p className="text-sm text-gray-300">{formatDate(update.timestamp)}</p>
                </div>
                <div className="flex space-x-4">
                  <div className="text-sm">
                    <span className="text-gray-400">Products: </span>
                    <span className="text-white">{update.productCount}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Stock: </span>
                    <span className="text-white">{update.totalStock}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const Overview = () => (
    <div className="grid gap-6">
      {/* Update Tracker Component */}
      <UpdateTracker />
      
      {overview.lowStock > 0 && (
        <div className="bg-red-900/50 border border-red-700 p-4 rounded-lg">
          <p className="text-red-300">
            {overview.lowStock} items are below reorder threshold
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-sm text-gray-400">Low Stock Items</p>
          <p className="text-3xl font-bold text-red-400">{overview.lowStock}</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-sm text-gray-400">Units On Order</p>
          <p className="text-3xl font-bold text-blue-400">{overview.totalOnOrder}</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-sm text-gray-400">Total Stock</p>
          <p className="text-3xl font-bold text-white">{overview.totalStock}</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <p className="text-sm text-gray-400">Total Products</p>
          <p className="text-3xl font-bold text-white">{overview.totalProducts}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Stock by Category</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={overview.categoryBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" tick={{ fill: '#9CA3AF' }} angle={-45} textAnchor="end" height={100} />
                <YAxis tick={{ fill: '#9CA3AF' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Stock Level Heatmap</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={overview.categoryBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tick={{ fill: '#9CA3AF' }} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#9CA3AF' }} width={150} />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill="#3b82f6"
                  background={{ fill: '#1f2937' }}
                >
                  {overview.categoryBreakdown.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.value > 100 ? '#22c55e' : entry.value > 50 ? '#f59e0b' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const ProductCard = ({ item }) => (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="font-medium text-white text-lg truncate mb-1">{item.ProductName}</h3>
          <p className="text-gray-400">SKU: {item.SKU}</p>
        </div>
        <div className={`w-24 text-center px-3 py-1 rounded-full text-xs font-medium ${
          item.OnHand <= item.ReorderThreshold ? 'bg-red-900/50 text-red-300 border border-red-700' :
          'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
        }`}>
          {item.OnHand <= item.ReorderThreshold ? 'Low Stock' : 'In Stock'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
          <p className="text-sm text-blue-300 font-medium mb-1">Current Stock</p>
          <p className={`text-3xl font-bold ${
            item.OnHand === 0 ? 'text-red-500' :
            item.OnHand <= item.ReorderThreshold ? 'text-red-400' :
            item.OnHand <= item.ReorderThreshold * 2 ? 'text-yellow-400' :
            'text-green-400'
          }`}>{item.OnHand}</p>
          {item.Vendor && <p className="text-sm text-gray-400 mt-2">Vendor: {item.Vendor}</p>}
        </div>
        <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
          <p className="text-sm text-gray-300 mb-1">Reorder At</p>
          <p className="text-2xl font-medium text-gray-200">{item.ReorderThreshold}</p>
          {item['On Order'] > 0 && (
            <div className="bg-blue-900/50 px-3 py-1 rounded-full border border-blue-700 inline-block mt-2">
              <p className="text-sm text-blue-300">+{item['On Order']} on order</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const getFilteredProducts = () => {
    if (searchQuery) {
      return allProducts.filter(item =>
        item.ProductName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.SKU.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return selectedCategory ? inventoryData[selectedCategory] : [];
  };

  if (!overview) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="animate-pulse text-blue-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-md p-4 -mx-6 -mt-6 mb-6 border-b border-gray-800">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-white">Aerovex Live Inventory</h1>
              <div className="text-gray-400 text-sm flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Last updated: {formatDate(lastUpdated)}
              </div>
            </div>
            
            <div className="flex mb-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none border border-gray-700"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  !selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                Overview
              </button>
              {Object.keys(inventoryData).map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    category === selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
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
            <h2 className="text-xl text-white mb-4">Search Results ({getFilteredProducts().length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {getFilteredProducts().map(item => (
                <ProductCard key={item.SKU} item={item} />
              ))}
            </div>
          </div>
        ) : !selectedCategory ? (
          <Overview />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {getFilteredProducts().map(item => (
              <ProductCard key={item.SKU} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryDashboard;
