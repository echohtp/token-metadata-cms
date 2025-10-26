'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useWalletAuth } from '../../hooks/useWalletAuth';
import { useTheme } from '../../context/ThemeContext';
import { WalletButton } from '../../components/wallet/WalletButton';
import { TokenTable } from './TokenTable';
import { TokenForm } from './TokenForm';
import { UserManagement } from './UserManagement';
import { TokenMetadataOverride } from '../../lib/supabase';

export const TokenMetadataCMS: React.FC = () => {
  const { userRole, userName, walletAddress, hasRole } = useWalletAuth();
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'tokens' | 'users'>('tokens');
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [editingToken, setEditingToken] = useState<TokenMetadataOverride | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'published' | 'all' | 'deleted'>('published'); // Default to show only published
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { id: 'tokens', label: 'Token Metadata', icon: '🪙' },
    ...(hasRole('admin') ? [{ id: 'users' as const, label: 'User Management', icon: '👥' }] : [])
  ];

  const handleEditToken = (token: TokenMetadataOverride) => {
    setEditingToken(token);
    setShowTokenForm(true);
  };

  const handleCloseForm = () => {
    setShowTokenForm(false);
    setEditingToken(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLogout = () => {
    localStorage.removeItem('wallet_auth_session');
    window.location.reload();
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white/95 dark:bg-gray-800 backdrop-blur-md shadow-lg border-b border-gray-200 dark:border-indigo-500/30 transition-all duration-300 relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                Token Metadata CMS
              </h1>
              <div className="ml-4 px-3 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 dark:from-blue-400/30 dark:to-purple-400/30 text-blue-700 dark:text-blue-300 text-xs rounded-full border border-blue-300/50 dark:border-blue-400/30 backdrop-blur-sm">
                {userRole.toUpperCase()}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* User Menu Dropdown */}
              <div className="relative z-[100]" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {userName ? userName[0].toUpperCase() : '?'}
                    </div>
                    {userName && (
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {userName}
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                      showUserMenu ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="fixed right-4 top-20 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:shadow-gray-900/80 border border-gray-200 dark:border-gray-700 py-2 z-[9999]">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {userName ? userName[0].toUpperCase() : '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {userName || 'Unknown User'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {userRole.toUpperCase()} • {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : 'No wallet'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Theme Toggle */}
                    <div className="px-4 py-2">
                      <button
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
                          <span className="text-sm text-gray-700 dark:text-gray-200">
                            {isDark ? 'Light Mode' : 'Dark Mode'}
                          </span>
                        </div>
                        <div className={`w-10 h-6 rounded-full transition-colors ${isDark ? 'bg-indigo-500' : 'bg-gray-300'} relative`}>
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform duration-200 ${isDark ? 'translate-x-5' : 'translate-x-1'}`} />
                        </div>
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={() => {
                          handleLogout();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center space-x-3 py-2 px-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="text-sm">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white dark:bg-gray-800 backdrop-blur-md border-b border-gray-200 dark:border-indigo-500/20 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'tokens' | 'users')}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition-all duration-300 relative ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-900/20'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/10'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'tokens' && (
          <div className="space-y-6">
            {/* Tokens Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Token Metadata</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Manage token metadata overrides for your V2 platform
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {hasRole('editor') && (
                  <button
                    onClick={() => setShowTokenForm(true)}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-500 dark:to-purple-500 dark:hover:from-indigo-400 dark:hover:to-purple-400 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl dark:shadow-indigo-500/25 dark:hover:shadow-indigo-500/40 transition-all duration-300 transform hover:scale-105"
                  >
                    ✨ Add Token
                  </button>
                )}
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search by mint address, name, or description..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as 'published' | 'all' | 'deleted')}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-sm transition-colors"
                  >
                    <option value="published">📝 Published Only</option>
                    <option value="all">📋 All (Published + Unpublished)</option>
                    <option value="deleted">🗑️ Deleted Only</option>
                  </select>
                </div>
                
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* Token Table */}
            <TokenTable
              searchTerm={searchTerm}
              filter={filter}
              onEditToken={handleEditToken}
              refreshTrigger={refreshTrigger}
              canEdit={hasRole('editor')}
            />
          </div>
        )}

        {activeTab === 'users' && hasRole('admin') && (
          <UserManagement />
        )}
      </main>

      {/* Token Form Modal */}
      {showTokenForm && (
        <TokenForm
          token={editingToken}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
};