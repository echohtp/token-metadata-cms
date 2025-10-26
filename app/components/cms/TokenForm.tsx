'use client';

import React, { useState, useEffect } from 'react';
import { TokenMetadataOverride } from '../../lib/supabase';
import { useWalletAuth } from '../../hooks/useWalletAuth';
import { fetchTokenMetadata, raydiumToFormData, RaydiumTokenData } from '../../lib/raydium';
import { isValidSolanaAddress } from '../../lib/auth';
import { ImageUpload } from '../ui/ImageUpload';

interface TokenFormProps {
  token?: TokenMetadataOverride | null;
  onClose: () => void;
}

export const TokenForm: React.FC<TokenFormProps> = ({ token, onClose }) => {
  const { getAuthHeaders } = useWalletAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadataFetched, setMetadataFetched] = useState(false);
  
  const [formData, setFormData] = useState({
    mint: '',
    name: '',
    logo: '',
    description: '',
    twitter_url: '',
    telegram_url: '',
    website_url: '',
    discord_url: '',
    is_active: true,
  });

  useEffect(() => {
    if (token && token.mint) {
      setFormData({
        mint: token.mint || '',
        name: token.name || '',
        logo: token.logo || '',
        description: token.description || '',
        twitter_url: token.twitter_url || '',
        telegram_url: token.telegram_url || '',
        website_url: token.website_url || '',
        discord_url: token.discord_url || '',
        is_active: token.is_active ?? true,
      });
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const isEdit = token && token.mint;
      const url = isEdit ? `/api/tokens/${token.mint}` : '/api/tokens';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      onClose();
    } catch (err) {
      console.error('Error saving token:', err);
      setError(err instanceof Error ? err.message : 'Failed to save token');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const fetchOnChainMetadata = async (mintAddress: string) => {
    if (!mintAddress || !isValidSolanaAddress(mintAddress)) {
      return;
    }

    setFetchingMetadata(true);
    setError(null);

    try {
      const raydiumData = await fetchTokenMetadata(mintAddress);
      
      if (raydiumData) {
        const autoFilledData = raydiumToFormData(raydiumData);
        
        // Only auto-fill empty fields to preserve user edits
        setFormData(prev => ({
          ...prev,
          name: prev.name || autoFilledData.name,
          logo: prev.logo || autoFilledData.logo,
          description: prev.description || autoFilledData.description,
          twitter_url: prev.twitter_url || autoFilledData.twitter_url,
          telegram_url: prev.telegram_url || autoFilledData.telegram_url,
          website_url: prev.website_url || autoFilledData.website_url,
          discord_url: prev.discord_url || autoFilledData.discord_url,
        }));
        
        setMetadataFetched(true);
      } else {
        // Token not found in Raydium, but that's okay
        setMetadataFetched(false);
      }
    } catch (err) {
      console.error('Error fetching on-chain metadata:', err);
      // Don't show error for failed metadata fetch, it's not critical
      setMetadataFetched(false);
    } finally {
      setFetchingMetadata(false);
    }
  };

  const handleMintChange = (value: string) => {
    handleChange('mint', value);
    
    // Auto-fetch metadata for new tokens when mint address is valid
    if (!token?.mint && value && isValidSolanaAddress(value)) {
      // Debounce the API call
      const timeoutId = setTimeout(() => {
        fetchOnChainMetadata(value);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-colors">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {token && token.mint ? 'Edit Token Metadata' : 'Add New Token'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mint Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Mint Address *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                disabled={!!(token && token.mint)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-800 font-mono text-sm transition-colors"
                value={formData.mint}
                onChange={(e) => handleMintChange(e.target.value)}
                placeholder="Enter Solana token mint address"
              />
              {fetchingMetadata && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                </div>
              )}
            </div>
            {token && token.mint && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Mint address cannot be changed after creation
              </p>
            )}
            {!token?.mint && metadataFetched && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                ✅ On-chain metadata loaded from Raydium
              </p>
            )}
            {!token?.mint && formData.mint && isValidSolanaAddress(formData.mint) && !fetchingMetadata && !metadataFetched && (
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  ℹ️ No metadata found on Raydium - you can fill in manually
                </p>
                <button
                  type="button"
                  onClick={() => fetchOnChainMetadata(formData.mint)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline transition-colors"
                >
                  Retry Fetch
                </button>
              </div>
            )}
            {!token?.mint && formData.mint && isValidSolanaAddress(formData.mint) && metadataFetched && (
              <button
                type="button"
                onClick={() => fetchOnChainMetadata(formData.mint)}
                disabled={fetchingMetadata}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline mt-1 disabled:opacity-50 transition-colors"
              >
                🔄 Refresh from Raydium
              </button>
            )}
          </div>

          {/* Token Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Token Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Wrapped SOL"
            />
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Logo
            </label>
            <ImageUpload
              value={formData.logo}
              onChange={(url) => handleChange('logo', url)}
              placeholder="Upload token logo..."
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Brief description of the token..."
            />
          </div>

          {/* Social Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Twitter URL
              </label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                value={formData.twitter_url}
                onChange={(e) => handleChange('twitter_url', e.target.value)}
                placeholder="https://twitter.com/username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Telegram URL
              </label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                value={formData.telegram_url}
                onChange={(e) => handleChange('telegram_url', e.target.value)}
                placeholder="https://t.me/username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Website URL
              </label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                value={formData.website_url}
                onChange={(e) => handleChange('website_url', e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Discord URL
              </label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                value={formData.discord_url}
                onChange={(e) => handleChange('discord_url', e.target.value)}
                placeholder="https://discord.gg/invite"
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded transition-colors"
              checked={formData.is_active}
              onChange={(e) => handleChange('is_active', e.target.checked)}
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-white">
              Active (visible in API responses)
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-6 border-t border-gray-200 dark:border-indigo-500/20">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-500 dark:to-purple-500 dark:hover:from-indigo-400 dark:hover:to-purple-400 text-white py-3 px-6 rounded-xl font-medium shadow-lg hover:shadow-xl dark:shadow-indigo-500/25 dark:hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02]"
            >
              {loading ? '⏳ Saving...' : (token && token.mint ? '✏️ Update Token' : '✨ Create Token')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 dark:from-gray-700 dark:to-gray-600 dark:hover:from-gray-600 dark:hover:to-gray-500 text-gray-700 dark:text-gray-200 py-3 px-6 rounded-xl font-medium shadow-md hover:shadow-lg dark:shadow-gray-900/25 transition-all duration-300 transform hover:scale-[1.02] border border-gray-400/20 dark:border-gray-500/30"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};