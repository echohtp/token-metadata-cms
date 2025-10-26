'use client';

import React, { useState, useEffect } from 'react';
import { TokenMetadataOverride } from '../../lib/supabase';
import { useWalletAuth } from '../../hooks/useWalletAuth';

interface TokenTableProps {
  searchTerm: string;
  filter: 'published' | 'all' | 'deleted';
  onEditToken: (token: TokenMetadataOverride) => void;
  refreshTrigger: number;
  canEdit: boolean;
}

export const TokenTable: React.FC<TokenTableProps> = ({
  searchTerm,
  filter,
  onEditToken,
  refreshTrigger,
  canEdit
}) => {
  const [tokens, setTokens] = useState<TokenMetadataOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAuthHeaders, isAuthenticated, isLoading: authLoading } = useWalletAuth();

  const fetchTokens = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      params.set('limit', '50');
      
      // Set filter parameters based on the selected filter
      switch (filter) {
        case 'published':
          params.set('active_only', 'true');
          params.set('include_deleted', 'false');
          break;
        case 'all':
          params.set('active_only', 'false');
          params.set('include_deleted', 'false');
          break;
        case 'deleted':
          params.set('active_only', 'false');
          params.set('include_deleted', 'true');
          break;
      }
      
      const authHeaders = getAuthHeaders();
      
      // Debug: Check if we have auth headers
      if (Object.keys(authHeaders).length === 0) {
        console.warn('No auth headers available, user may not be fully authenticated');
        setError('Authentication required. Please sign in with your wallet.');
        setLoading(false);
        return;
      }
      
      // Validate auth header values
      for (const [key, value] of Object.entries(authHeaders)) {
        if (value == null || value === undefined || value === 'undefined' || value === 'null') {
          console.error(`Invalid auth header value for ${key}:`, value);
          setError('Invalid authentication data. Please sign in again.');
          setLoading(false);
          return;
        }
      }
      
      console.log('Auth headers:', authHeaders);
      
      const response = await fetch(`/api/tokens?${params}`, {
        headers: authHeaders
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setTokens(result.data || []);
    } catch (err) {
      console.error('Error fetching tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch tokens when authentication is ready and user is authenticated
    if (!authLoading && isAuthenticated) {
      fetchTokens();
    }
  }, [searchTerm, filter, refreshTrigger, authLoading, isAuthenticated]);

  const handleDelete = async (mint: string) => {
    if (!confirm('Are you sure you want to delete this token metadata?')) return;
    
    try {
      const response = await fetch(`/api/tokens/${mint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete token');
      }

      // Refresh the list
      fetchTokens();
    } catch (err) {
      console.error('Error deleting token:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete token');
    }
  };

  const handleRestore = async (mint: string) => {
    if (!confirm('Are you sure you want to restore this token metadata?')) return;
    
    try {
      const response = await fetch(`/api/tokens/${mint}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to restore token');
      }

      // Refresh the list
      fetchTokens();
    } catch (err) {
      console.error('Error restoring token:', err);
      alert(err instanceof Error ? err.message : 'Failed to restore token');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center transition-colors">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">
          {authLoading ? 'Checking authentication...' : 'Loading tokens...'}
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center transition-colors">
        <div className="text-yellow-600 dark:text-yellow-400 mb-4">🔐 Authentication Required</div>
        <p className="text-gray-600 dark:text-gray-300">Please authenticate with your wallet to view tokens.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center transition-colors">
        <div className="text-red-600 dark:text-red-400 mb-4">❌ Error loading tokens</div>
        <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
        <button
          onClick={fetchTokens}
          className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center transition-colors">
        <div className="text-gray-400 dark:text-gray-500 text-6xl mb-4">🪙</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tokens found</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {searchTerm ? 'Try adjusting your search terms.' : 'Start by adding your first token metadata override.'}
        </p>
        {canEdit && !searchTerm && (
          <button
            onClick={() => onEditToken({} as TokenMetadataOverride)}
            className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Add First Token
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Found {tokens.length} token{tokens.length !== 1 ? 's' : ''}
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Token
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Social Links
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Last Updated
              </th>
              {canEdit && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 transition-colors">
            {tokens.map((token) => (
              <tr key={token.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    {token.logo && (
                      <img
                        className="h-12 w-12 rounded-full mr-4 object-cover"
                        src={token.logo}
                        alt={token.name || 'Token'}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {token.name || 'Unnamed Token'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {token.mint.slice(0, 8)}...{token.mint.slice(-8)}
                      </p>
                      {token.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate max-w-xs">
                          {token.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex flex-wrap gap-2">
                    {token.twitter_url && (
                      <a
                        href={token.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded transition-colors"
                      >
                        Twitter
                      </a>
                    )}
                    {token.telegram_url && (
                      <a
                        href={token.telegram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded transition-colors"
                      >
                        Telegram
                      </a>
                    )}
                    {token.website_url && (
                      <a
                        href={token.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded transition-colors"
                      >
                        Website
                      </a>
                    )}
                    {token.discord_url && (
                      <a
                        href={token.discord_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs bg-blue-50 dark:bg-blue-900 px-2 py-1 rounded transition-colors"
                      >
                        Discord
                      </a>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      token.deleted_at
                        ? 'bg-gray-100 text-gray-800'
                        : token.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {token.deleted_at ? '🗑️ Deleted' : token.is_active ? '📝 Published' : '📋 Unpublished'}
                  </span>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div>
                    {new Date(token.updated_at).toLocaleDateString()}
                  </div>
                  {token.updated_by && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                      by {token.updated_by.slice(0, 8)}...
                    </div>
                  )}
                </td>
                
                {canEdit && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {token.deleted_at ? (
                        <button
                          onClick={() => handleRestore(token.mint)}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 px-3 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900 transition-colors"
                        >
                          Restore
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => onEditToken(token)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 px-3 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(token.mint)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 px-3 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};