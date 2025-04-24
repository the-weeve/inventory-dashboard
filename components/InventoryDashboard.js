import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart } from 'recharts';
import Papa from 'papaparse';

const InventoryDashboard = () => {
  const [inventoryData, setInventoryData] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [overview, setOverview] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [historicalData, setHistoricalData] = useState([]);
  const [trendTimeframe, setTrendTimeframe] = useState('30days'); // '7days', '30days', '90days'
  const [selectedHistoricalView, setSelectedHistoricalView] = useState('totalStock'); // 'totalStock', 'categories', 'product'
  const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const SHEET_ID = '1bCNMgfDBJaAco8-HEg9TY5oDnT4f1ftywFqkQXkpoBE';
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
        
        // Store the current snapshot in historical data
        storeCurrentSnapshot(overviewData, sortedGrouped);
      } catch (error) {
        console.error('Error loading inventory data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000);
    
    // Load historical data
    loadHistoricalData();
    
    return () => clearInterval(interval);
  }, []);

  // Store current inventory snapshot in localStorage
  const storeCurrentSnapshot = (overviewData, categoryData) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Get existing history from localStorage
    let history = JSON.parse(localStorage.getItem('inventoryHistory') || '[]');
    
    // Check if we already have an entry for today
    const todayEntryIndex = history.findIndex(entry => entry.date === today);
    
    // Create the data snapshot
    const snapshot = {
      date: today,
      totalStock: overviewData.totalStock,
      onOrder: overviewData.totalOnOrder,
      lowStock: overviewData.lowStock,
      categories: {}
    };
    
    // Add data for each category
    overviewData.categoryBreakdown.forEach(cat => {
      snapshot.categories[cat.name] = cat.value;
    });
    
    // Add individual product data
    snapshot.products = {};
    Object.entries(categoryData).forEach(([category, products]) => {
      products.forEach(product => {
        snapshot.products[product.SKU] = {
          name: product.ProductName,
          category: category,
          onHand: product.OnHand,
          onOrder: product['On Order'] || 0,
          reorderThreshold: product.ReorderThreshold
        };
      });
    });
    
    // Update or add today's entry
    if (todayEntryIndex >= 0) {
      history[todayEntryIndex] = snapshot;
    } else {
      // Add new entry, keep only last 90 days
      history.push(snapshot);
      if (history.length > 90) {
        history = history.slice(history.length - 90);
      }
    }
    
    // Save back to localStorage
    localStorage.setItem('inventoryHistory', JSON.stringify(history));
  };
  
  // Load historical data from localStorage
  const loadHistoricalData = () => {
    const history = JSON.parse(localStorage.getItem('inventoryHistory') || '[]');
    
    // If there's no history, generate some sample data for demonstration
    if (history.length === 0) {
      const sampleData = generateSampleHistoricalData();
      localStorage.setItem('inventoryHistory', JSON.stringify(sampleData));
      setHistoricalData(sampleData);
    } else {
      setHistoricalData(history);
    }
  };
  
  // Generate sample historical data for demonstration
  const generateSampleHistoricalData = () => {
    const sampleData = [];
    const today = new Date();
    const mainCategories = [
      'Recirculating Whisper',
      'Vented Whisper',
      'Room Air Purifiers',
      'Replacement Filters',
      'Printer Products'
    ];
    
    // Generate 90 days of history
    for (let i = 90; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // Base values that increase slightly over time
      const baseValue = 250 + Math.floor(i/3);
      
      // Create snapshot for this day
      const snapshot = {
        date: dateString,
        totalStock: 0,
        onOrder: Math.floor(Math.random() * 50) + 20,
        lowStock: Math.floor(Math.random() * 10) + 5,
        categories: {},
        products: {}
      };
      
      // Generate data for each category
      mainCategories.forEach(category => {
        // Add some randomness to simulate daily changes
        const randomFactor = Math.floor(Math.random() * 30) - 15;
        const stockValue = Math.max(10, baseValue + randomFactor);
        
        snapshot.categories[category] = stockValue / mainCategories.length;
        snapshot.totalStock += stockValue / mainCategories.length;
      });
      
      // Generate sample product data
      const sampleProducts = [
        { SKU: "RW101", name: "Recirculating Whisper Pro", category: "Recirculating Whisper" },
        { SKU: "VW202", name: "Vented Whisper Max", category: "Vented Whisper" },
        { SKU: "RAP303", name: "Room Air Purifier Plus", category: "Room Air Purifiers" },
        { SKU: "RF404", name: "HEPA Filter Replacement", category: "Replacement Filters" },
        { SKU: "PP505", name: "Industrial Printer Filter", category: "Printer Products" }
      ];
      
      sampleProducts.forEach(product => {
        // Base product value plus some random fluctuation
        const catValue = snapshot.categories[product.category] || 50;
        const randomStock = Math.max(5, Math.floor(catValue / 2) + Math.floor(Math.random() * 10) - 5);
        
        snapshot.products[product.SKU] = {
          name: product.name,
          category: product.category,
          onHand: randomStock,
          onOrder: Math.random() > 0.7 ? Math.floor(Math.random() * 10) + 1 : 0,
          reorderThreshold: 10
        };
      });
      
      sampleData.push(snapshot);
    }
    
    return sampleData;
  };

  // Filter historical data based on selected timeframe
  const getFilteredHistoricalData = () => {
    if (!historicalData.length) return [];
    
    const days = trendTimeframe === '7days' ? 7 : 
                trendTimeframe === '30days' ? 30 : 90;
    
    return historicalData.slice(-days);
  };
  
  // Format data for trend charts
  const getTrendData = () => {
    const filteredData = getFilteredHistoricalData();
    
    if (selectedHistoricalView === 'totalStock') {
      // Total stock trend
      return filteredData.map(snapshot => ({
        date: snapshot.date,
        totalStock: snapshot.totalStock,
        onOrder: snapshot.onOrder,
        lowStock: snapshot.lowStock
      }));
    } else if (selectedHistoricalView === 'categories') {
      // Category breakdown trend
      return filteredData.map(snapshot => {
        const result = { date: snapshot.date };
        
        // Add all categories to the result
        Object.entries(snapshot.categories).forEach(([category, value]) => {
          result[category] = value;
        });
        
        return result;
      });
    } else if (selectedHistoricalView === 'product' && selectedProductForHistory) {
      // Individual product trend
      return filteredData
        .filter(snapshot => snapshot.products && snapshot.products[selectedProductForHistory])
        .map(snapshot => ({
          date: snapshot.date,
          stock: snapshot.products[selectedProductForHistory].onHand,
          onOrder: snapshot.products[selectedProductForHistory].onOrder,
          threshold: snapshot.products[selectedProductForHistory].reorderThreshold
        }));
    }
    
    return [];
  };

  const Overview = () => (
    <div className="grid gap-6">
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
      
      {/* Historical Trends Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Historical Inventory Trends</h3>
          <div className="flex space-x-2">
            <button 
              onClick={() => setTrendTimeframe('7days')} 
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                trendTimeframe === '7days' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              7 Days
            </button>
            <button 
              onClick={() => setTrendTimeframe('30days')} 
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                trendTimeframe === '30days' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              30 Days
            </button>
            <button 
              onClick={() => setTrendTimeframe('90days')} 
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                trendTimeframe === '90days' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              90 Days
            </button>
          </div>
        </div>
        
        <div className="flex space-x-2 mb-4">
          <button 
            onClick={() => setSelectedHistoricalView('totalStock')} 
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              selectedHistoricalView === 'totalStock' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Total Stock
          </button>
          <button 
            onClick={() => setSelectedHistoricalView('categories')} 
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              selectedHistoricalView === 'categories' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Categories
          </button>
          <button 
            onClick={() => setSelectedHistoricalView('product')} 
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              selectedHistoricalView === 'product' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Product
          </button>
          
          {selectedHistoricalView === 'product' && (
            <select
              value={selectedProductForHistory || ''}
              onChange={(e) => setSelectedProductForHistory(e.target.value)}
              className="bg-gray-700 text-white rounded-lg text-xs px-2"
            >
              <option value="">Select a product</option>
              {allProducts.map((product) => (
                <option key={product.SKU} value={product.SKU}>
                  {product.ProductName}
                </option>
              ))}
            </select>
          )}
        </div>
        
        <div className="h-72">
          <ResponsiveContainer>
            {selectedHistoricalView === 'totalStock' ? (
              <AreaChart data={getTrendData()}>
                <defs>
                  <linearGradient id="totalStockColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="onOrderColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF' }} />
                <YAxis tick={{ fill: '#9CA3AF' }} />
                <Tooltip />
                <Legend />
                <Area 
                  type="monotone"
                  dataKey="totalStock"
                  stroke="#3b82f6"
                  fillOpacity={1} 
                  fill="url(#totalStockColor)"
                  name="Total Stock"
                />
                <Area 
                  type="monotone"
                  dataKey="onOrder"
                  stroke="#60a5fa"
                  fillOpacity={1} 
                  fill="url(#onOrderColor)"
                  name="On Order"
                />
              </AreaChart>
            ) : selectedHistoricalView === 'categories' ? (
              <LineChart data={getTrendData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF' }} />
                <YAxis tick={{ fill: '#9CA3AF' }} />
                <Tooltip />
                <Legend />
                {Object.keys(getTrendData()[0] || {})
                  .filter(key => key !== 'date')
                  .map((category, index) => {
                    const colors = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];
                    return (
                      <Line 
                        key={category}
                        type="monotone"
                        dataKey={category}
                        stroke={colors[index % colors.length]}
                        dot={false}
                        name={category}
                      />
                    );
                  })
                }
              </LineChart>
            ) : (
              <LineChart data={getTrendData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF' }} />
                <YAxis tick={{ fill: '#9CA3AF' }} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone"
                  dataKey="stock"
                  stroke="#3b82f6"
                  name="Stock Level"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone"
                  dataKey="threshold"
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  name="Reorder Threshold"
                />
                <Line 
                  type="monotone"
                  dataKey="onOrder"
                  stroke="#10b981" 
                  name="On Order"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
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
      
      {/* Product History Button */}
      <button
        onClick={() => {
          setSelectedHistoricalView('product');
          setSelectedProductForHistory(item.SKU);
          setSelectedCategory(null);
        }}
        className="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-blue-300 py-1 rounded-lg text-sm"
      >
        View Stock History
      </button>
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
            <h1 className="text-3xl font-bold text-white mb-6">Aerovex Live Inventory</h1>
            
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
