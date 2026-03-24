import { Plus, TrendingUp, TrendingDown, BarChart3, Search, Filter } from 'lucide-react';
import { useState } from 'react';

interface Portfolio {
  id: string;
  name: string;
  risk: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
  totalValue: number;
  totalInvested: number;
  pnl: number;
  pnlPercent: number;
  positions: number;
  narratives: string[];
  createdDate: string;
  lastUpdated: string;
}

interface PortfolioListPageProps {
  onSelectPortfolio: (portfolioId: string) => void;
  onCreatePortfolio: () => void;
}

export function PortfolioListPage({ onSelectPortfolio, onCreatePortfolio }: PortfolioListPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'value' | 'pnl' | 'date'>('date');

  // Mock portfolios data
  const portfolios: Portfolio[] = [
    {
      id: '1',
      name: 'Gaming Portfolio',
      risk: 'BALANCED',
      totalValue: 93.91,
      totalInvested: 100,
      pnl: -6.08,
      pnlPercent: -6.08,
      positions: 3,
      narratives: ['COLLECTIBLES-NFTS', 'GAMING', 'ART'],
      createdDate: '2024-03-15',
      lastUpdated: '2 hours ago'
    },
    {
      id: '2',
      name: 'DeFi Blue Chips',
      risk: 'CONSERVATIVE',
      totalValue: 1247.50,
      totalInvested: 1000,
      pnl: 247.50,
      pnlPercent: 24.75,
      positions: 5,
      narratives: ['DEFI', 'LENDING', 'DEX'],
      createdDate: '2024-03-10',
      lastUpdated: '1 day ago'
    },
    {
      id: '3',
      name: 'Metaverse Growth',
      risk: 'AGGRESSIVE',
      totalValue: 432.18,
      totalInvested: 500,
      pnl: -67.82,
      pnlPercent: -13.56,
      positions: 7,
      narratives: ['METAVERSE', 'GAMING', 'VR'],
      createdDate: '2024-03-20',
      lastUpdated: '3 hours ago'
    },
    {
      id: '4',
      name: 'AI & Data Economy',
      risk: 'BALANCED',
      totalValue: 856.92,
      totalInvested: 750,
      pnl: 106.92,
      pnlPercent: 14.26,
      positions: 4,
      narratives: ['AI', 'DATA', 'COMPUTING'],
      createdDate: '2024-03-18',
      lastUpdated: '5 hours ago'
    },
  ];

  // Calculate total portfolio value
  const totalPortfolioValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
  const totalInvested = portfolios.reduce((sum, p) => sum + p.totalInvested, 0);
  const totalPnl = totalPortfolioValue - totalInvested;
  const totalPnlPercent = (totalPnl / totalInvested) * 100;

  // Filter and sort portfolios
  const filteredPortfolios = portfolios
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.narratives.some(n => n.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter = filterRisk === 'ALL' || p.risk === filterRisk;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'value':
          return b.totalValue - a.totalValue;
        case 'pnl':
          return b.pnlPercent - a.pnlPercent;
        case 'date':
          return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
        default:
          return 0;
      }
    });

  const getRiskColor = (risk: Portfolio['risk']) => {
    switch (risk) {
      case 'CONSERVATIVE':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'BALANCED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'AGGRESSIVE':
        return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Header with Total Stats */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">My Portfolios</h1>
          <button
            onClick={onCreatePortfolio}
            className="btn-primary px-4 py-2.5 flex items-center gap-2"
          >
            <Plus size={20} />
            Create Portfolio
          </button>
        </div>

        {/* Total Portfolio Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-5">
            <p className="text-sm text-gray-600 mb-1">Total Value</p>
            <p className="text-3xl font-bold">${totalPortfolioValue.toFixed(2)}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-sm text-gray-600 mb-1">Total Invested</p>
            <p className="text-2xl font-bold text-gray-700">${totalInvested.toFixed(2)}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-sm text-gray-600 mb-1">Total P&L</p>
            <p className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            </p>
          </div>
          <div className="glass-card p-5">
            <p className="text-sm text-gray-600 mb-1">Total P&L %</p>
            <div className="flex items-center gap-2">
              {totalPnlPercent >= 0 ? (
                <TrendingUp className="text-green-600" size={24} />
              ) : (
                <TrendingDown className="text-red-600" size={24} />
              )}
              <p className={`text-2xl font-bold ${totalPnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search portfolios or narratives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 glass-card text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          {/* Risk Filter */}
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-600" />
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value as any)}
              className="px-4 py-3 glass-card text-sm focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CONSERVATIVE">Conservative</option>
              <option value="BALANCED">Balanced</option>
              <option value="AGGRESSIVE">Aggressive</option>
            </select>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-3 glass-card text-sm focus:outline-none focus:ring-2 focus:ring-black/10 cursor-pointer"
          >
            <option value="date">Sort by: Recent</option>
            <option value="name">Sort by: Name</option>
            <option value="value">Sort by: Value</option>
            <option value="pnl">Sort by: Performance</option>
          </select>
        </div>
      </div>

      {/* Portfolio Grid */}
      {filteredPortfolios.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPortfolios.map((portfolio) => (
            <button
              key={portfolio.id}
              onClick={() => onSelectPortfolio(portfolio.id)}
              className="glass-card p-6 text-left transition-all duration-200 hover:shadow-lg hover:scale-[1.02] group"
            >
              {/* Portfolio Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2 group-hover:text-blue-600 transition-colors">
                    {portfolio.name}
                  </h3>
                  <span className={`inline-block text-xs px-2.5 py-1 rounded-full border ${getRiskColor(portfolio.risk)} font-medium`}>
                    {portfolio.risk}
                  </span>
                </div>
                <BarChart3 className="text-gray-400 group-hover:text-blue-600 transition-colors" size={24} />
              </div>

              {/* Portfolio Value */}
              <div className="mb-4 pb-4 border-b border-gray-200/50">
                <p className="text-sm text-gray-600 mb-1">Current Value</p>
                <p className="text-2xl font-bold mb-2">${portfolio.totalValue.toFixed(2)}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${portfolio.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {portfolio.pnl >= 0 ? '+' : ''}{portfolio.pnlPercent.toFixed(2)}%
                  </span>
                  <span className={`text-xs ${portfolio.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({portfolio.pnl >= 0 ? '+' : ''}${portfolio.pnl.toFixed(2)})
                  </span>
                </div>
              </div>

              {/* Portfolio Stats */}
              

              {/* Narratives */}
              

              {/* Last Updated */}
              
            </button>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No portfolios found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || filterRisk !== 'ALL'
              ? 'Try adjusting your search or filters'
              : 'Create your first portfolio to get started'}
          </p>
          {!searchQuery && filterRisk === 'ALL' && (
            <button
              onClick={onCreatePortfolio}
              className="btn-primary px-6 py-3 inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Create Portfolio
            </button>
          )}
        </div>
      )}

      {/* Portfolio Count */}
      {filteredPortfolios.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-600">
          Showing {filteredPortfolios.length} of {portfolios.length} portfolios
        </div>
      )}
    </div>
  );
}
