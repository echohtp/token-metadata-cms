'use client';

import React, { useState, useEffect } from 'react';
import { useWalletAuth } from '../../hooks/useWalletAuth';
import { WalletButton } from '../../components/wallet/WalletButton';
import { TokenTable } from './TokenTable';
import { TokenForm } from './TokenForm';
import { UserManagement } from './UserManagement';
import { TokenMetadataOverride } from '../../lib/supabase';

export const TokenMetadataCMS: React.FC = () => {
  const { userRole, userName, walletAddress, hasRole } = useWalletAuth();
  const [activeTab, setActiveTab] = useState<'tokens' | 'users'>('tokens');
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [editingToken, setEditingToken] = useState<TokenMetadataOverride | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'published' | 'all' | 'deleted'>('published'); // Default to show only published
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Token Metadata CMS
              </h1>
              <div className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {userRole.toUpperCase()}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {userName && (
                <span className="text-sm text-gray-600">
                  Welcome, {userName}
                </span>
              )}
              <button
                onClick={() => {
                  localStorage.removeItem('wallet_auth_session');
                  window.location.reload();
                }}
                className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                title="Clear session and re-authenticate"
              >
                🔄 Clear Session
              </button>
              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'tokens' | 'users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                <h2 className="text-2xl font-bold text-gray-900">Token Metadata</h2>
                <p className="text-gray-600">
                  Manage token metadata overrides for your V2 platform
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {hasRole('editor') && (
                  <button
                    onClick={() => setShowTokenForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Token
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Status:</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as 'published' | 'all' | 'deleted')}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="published">📝 Published Only</option>
                    <option value="all">📋 All (Published + Unpublished)</option>
                    <option value="deleted">🗑️ Deleted Only</option>
                  </select>
                </div>
                
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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