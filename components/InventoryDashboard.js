import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const InventoryDashboard = () => {
  const [inventoryData, setInventoryData] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [overview, setOverview] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const SHEET_ID = '1bCNMgfDBJaAco8-HEg9TY5oDnT4f1ftywFqkQXkpoBE';
        const response = await fetch(
          `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`, {
            headers: {
              'Access-Control-Allow-Origin': '*'
            }
          });
        const text = await response.text();
        const jsonData = JSON.parse(text.substring(47).slice(0, -2));
        const headers = jsonData.table.cols.map(col => col.label);
        const data = jsonData.table.rows.map(row => {
          const item = {};
          row.c.forEach((cell, i) => {
            item[headers[i]] = cell ? cell.v : null;
          });
          return item;
        });

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
        
        const overviewData = {
          totalProducts: data.length,
          totalStock: data.reduce((sum, item) => sum + item.OnHand, 0),
          totalOnOrder: data.reduce((sum, item) => sum + (item['On Order'] || 0), 0),
          lowStock: data.filter(item => item.OnHand <= item.ReorderThreshold).length,
          categories: Object.keys(sortedGrouped).length,
          categoryBreakdown: Object.entries(sortedGrouped).map(([name, items]) => ({
            name,
            value: items.reduce((sum, item) => sum + item.OnHand, 0)
          }))
        };

        setInventoryData(sortedGrouped);
        setOverview(overviewData);
      } catch (error) {
        console.error('Error loading inventory data:', error);
      }
    };

    fetchData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const Overview = () => (
    <div className="grid gap-6">
      {overview.lowStock > 0 && (
        <Alert className="bg-red-900/50 border-red-700">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {overview.lowStock} items are below reorder threshold
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400">Low Stock Items</CardTitle>
            <div className="text-3xl font-bold text-red-400">{overview.lowStock}</div>
          </CardHeader>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400">Units On Order</CardTitle>
            <div className="text-3xl font-bold text-blue-400">{overview.totalOnOrder}</div>
          </CardHeader>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400">Total Stock</CardTitle>
            <div className="text-3xl font-bold text-white">{overview.totalStock}</div>
          </CardHeader>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400">Total Products</CardTitle>
            <div className="text-3xl font-bold text-white">{overview.totalProducts}</div>
          </CardHeader>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Stock by Category</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Distribution</CardTitle>
          </CardHeader>
          <CardContent>
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
                  >
                    {overview.categoryBreakdown.map((entry, index) => (
                      <Cell key={index} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const ProductCard = ({ item }) => (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h3 className="font-medium text-white text-lg truncate mb-1">{item.ProductName}</h3>
            <p className="text-gray-400">SKU: {item.SKU}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
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
      </CardContent>
    </Card>
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
            <h1 className="text-3xl font-bold text-white mb-6">Live Inventory</h1>
            
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none border border-gray-700"
                />
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="name">Sort by Name</option>
                <option value="stock">Sort by Stock Level</option>
                <option value="sku">Sort by SKU</option>
              </select>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  !selectedCategory ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                Overview
              </button>
              {Object.keys(inventoryData).map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
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
