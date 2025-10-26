'use client';

import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletAuth } from '../../hooks/useWalletAuth';
import { WalletButton } from '../wallet/WalletButton';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'editor' | 'viewer';
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredRole = 'viewer',
  fallback
}) => {
  const { connected } = useWallet();
  const { isAuthenticated, isLoading, error, hasRole, authenticate, session } = useWalletAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking wallet authorization...</p>
        </div>
      </div>
    );
  }

  // Show wallet connection prompt
  if (!connected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Token Metadata CMS
          </h1>
          <p className="text-gray-600 mb-6">
            Connect your Solana wallet to access the content management system.
          </p>
          <WalletButton />
        </div>
      </div>
    );
  }

  // Show authentication error
  if (error && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">
              Access Denied
            </h2>
            <p className="text-red-600 mb-4">{error}</p>
            {error.includes('not authorized') ? (
              <div className="space-y-3">
                <p className="text-sm text-red-500">
                  Your wallet address is not authorized to access this application. 
                  Please contact an administrator to request access.
                </p>
                <button
                  onClick={() => {
                    localStorage.removeItem('wallet_auth_session');
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm"
                >
                  🔄 Clear Session & Retry
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => authenticate()}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('wallet_auth_session');
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm"
                >
                  🔄 Clear Session & Retry
                </button>
              </div>
            )}
          </div>
          <div className="mt-6">
            <WalletButton />
          </div>
        </div>
      </div>
    );
  }

  // Show role-based access error
  if (isAuthenticated && !hasRole(requiredRole)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              Insufficient Permissions
            </h2>
            <p className="text-yellow-600 mb-4">
              You need {requiredRole} permissions to access this section.
            </p>
            <p className="text-sm text-yellow-500">
              Please contact an administrator to upgrade your access level.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show authentication prompt
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Verify Wallet Ownership
          </h2>
          <p className="text-gray-600 mb-6">
            Please sign a message to verify you own this wallet and access the CMS.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => authenticate()}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Authenticating...' : 'Sign Message'}
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('wallet_auth_session');
                sessionStorage.clear();
                window.location.reload();
              }}
              className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm"
            >
              🔄 Clear Session & Retry
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            This will not trigger any blockchain transaction.
          </p>
        </div>
      </div>
    );
  }

  // Final check: ensure user has valid session with signature
  if (isAuthenticated && !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              Session Invalid
            </h2>
            <p className="text-yellow-600 mb-4">
              Your authentication session is invalid. Please sign in again.
            </p>
            <button
              onClick={() => authenticate()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Sign In Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
};