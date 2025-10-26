'use client';

import React, { useState, useEffect } from 'react';
import { AuthorizedWallet } from '../../lib/supabase';
import { useWalletAuth } from '../../hooks/useWalletAuth';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AuthorizedWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const { getAuthHeaders, walletAddress, isAuthenticated, isLoading: authLoading } = useWalletAuth();

  const [newUser, setNewUser] = useState({
    wallet_address: '',
    name: '',
    role: 'editor' as 'admin' | 'editor' | 'viewer',
    notes: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const authHeaders = getAuthHeaders();
      
      // Debug: Check if we have auth headers
      if (Object.keys(authHeaders).length === 0) {
        throw new Error('Authentication required. Please sign in with your wallet.');
      }
      
      console.log('Fetching users with auth headers:', Object.keys(authHeaders));
      
      const response = await fetch('/api/users', {
        headers: authHeaders
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Users API error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch users when authentication is ready and user is authenticated
    if (!authLoading && isAuthenticated) {
      fetchUsers();
    }
  }, [authLoading, isAuthenticated]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(newUser)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add user');
      }

      setShowAddForm(false);
      setNewUser({ wallet_address: '', name: '', role: 'editor', notes: '' });
      fetchUsers();
    } catch (err) {
      console.error('Error adding user:', err);
      setError(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (wallet: string, updates: Partial<AuthorizedWallet>) => {
    try {
      const response = await fetch(`/api/users/${wallet}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      alert(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDeleteUser = async (wallet: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    
    try {
      const response = await fetch(`/api/users/${wallet}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deactivate user');
      }

      fetchUsers();
    } catch (err) {
      console.error('Error deactivating user:', err);
      alert(err instanceof Error ? err.message : 'Failed to deactivate user');
    }
  };

  if (loading || authLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">
          {authLoading ? 'Checking authentication...' : 'Loading users...'}
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-yellow-600 mb-4">🔐 Authentication Required</div>
        <p className="text-gray-600">Please authenticate with your wallet to manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Manage wallet permissions and access levels</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add User
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Add User Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Add New User</h3>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wallet Address *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  value={newUser.wallet_address}
                  onChange={(e) => setNewUser({ ...newUser, wallet_address: e.target.value })}
                  placeholder="Enter Solana wallet address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Display name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                >
                  <option value="viewer">Viewer (Read only)</option>
                  <option value="editor">Editor (Can manage tokens)</option>
                  <option value="admin">Admin (Full access)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newUser.notes}
                  onChange={(e) => setNewUser({ ...newUser, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add User'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Authorized Users ({users.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user.name || 'Unnamed User'}
                        {user.wallet_address === walletAddress && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 font-mono">
                        {user.wallet_address.slice(0, 8)}...{user.wallet_address.slice(-8)}
                      </p>
                      {user.notes && (
                        <p className="text-xs text-gray-400 mt-1">{user.notes}</p>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateUser(user.wallet_address, { role: e.target.value as any })}
                      disabled={user.wallet_address === walletAddress}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {user.wallet_address !== walletAddress && (
                      <button
                        onClick={() => handleDeleteUser(user.wallet_address)}
                        className="text-red-600 hover:text-red-900 px-3 py-1 rounded hover:bg-red-50"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};