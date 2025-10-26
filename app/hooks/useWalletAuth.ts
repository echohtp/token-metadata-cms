'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { generateAuthMessage, verifyWalletSignature, getWalletAuthorization } from '../lib/auth';

export interface WalletAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userRole: string;
  userName: string;
  walletAddress: string | null;
}

export interface AuthSession {
  walletAddress: string;
  signature: string;
  message: string;
  timestamp: number;
  role: string;
  name: string;
}

export function useWalletAuth() {
  const { connected, publicKey, signMessage } = useWallet();
  const [authState, setAuthState] = useState<WalletAuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    userRole: 'none',
    userName: '',
    walletAddress: null,
  });

  const [session, setSession] = useState<AuthSession | null>(null);

  // Check for existing session on wallet change
  useEffect(() => {
    if (connected && publicKey) {
      const storedSession = localStorage.getItem('wallet_auth_session');
      if (storedSession) {
        try {
          const parsedSession: AuthSession = JSON.parse(storedSession);
          if (parsedSession.walletAddress === publicKey.toString()) {
            // Check if session is still valid (within 24 hours) and has new signature format
            const isValidSession = Date.now() - parsedSession.timestamp < 24 * 60 * 60 * 1000;
            const hasNewSignatureFormat = !parsedSession.signature.includes(','); // Base64 doesn't have commas
            
            if (isValidSession && hasNewSignatureFormat && parsedSession.message && parsedSession.signature) {
              setSession(parsedSession);
              setAuthState({
                isAuthenticated: true,
                isLoading: false,
                error: null,
                userRole: parsedSession.role,
                userName: parsedSession.name,
                walletAddress: parsedSession.walletAddress,
              });
              return;
            }
          }
        } catch (error) {
          console.error('Error parsing stored session:', error);
        }
        // Clear invalid or old format sessions
        console.log('Clearing invalid session - please re-authenticate');
        localStorage.removeItem('wallet_auth_session');
      }
      
      // Check wallet authorization without requiring signature
      checkWalletAuthorization();
    } else {
      // Clear auth state when wallet disconnected
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        userRole: 'none',
        userName: '',
        walletAddress: null,
      });
      setSession(null);
      localStorage.removeItem('wallet_auth_session');
    }
  }, [connected, publicKey]);

  const checkWalletAuthorization = useCallback(async () => {
    if (!publicKey) return;

    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const auth = await getWalletAuthorization(publicKey.toString());
      
      // Only check authorization, but don't authenticate without signature
      setAuthState({
        isAuthenticated: false, // Must sign message to be authenticated
        isLoading: false,
        error: auth.isAuthorized ? null : 'Wallet not authorized for this application',
        userRole: auth.isAuthorized ? auth.role : 'none',
        userName: auth.isAuthorized ? auth.name : '',
        walletAddress: publicKey.toString(),
      });
    } catch (error) {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to check wallet authorization',
        userRole: 'none',
        userName: '',
        walletAddress: publicKey?.toString() || null,
      });
    }
  }, [publicKey]);

  const authenticate = useCallback(async (action: string = 'login') => {
    if (!connected || !publicKey || !signMessage) {
      setAuthState(prev => ({ 
        ...prev, 
        error: 'Wallet not connected or does not support message signing' 
      }));
      return false;
    }

    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Generate message for signing
      const timestamp = Date.now();
      const message = generateAuthMessage(action, timestamp);
      const messageBytes = new TextEncoder().encode(message);

      // Request signature from wallet
      const signature = await signMessage(messageBytes);

      // Verify signature
      const isValidSignature = await verifyWalletSignature(
        message,
        signature,
        publicKey.toString()
      );

      if (!isValidSignature) {
        throw new Error('Invalid signature');
      }

      // Check wallet authorization
      const auth = await getWalletAuthorization(publicKey.toString());

      if (!auth.isAuthorized) {
        throw new Error('Wallet not authorized for this application');
      }

      // Create and store session
      const newSession: AuthSession = {
        walletAddress: publicKey.toString(),
        signature: Buffer.from(signature).toString('base64'), // Convert Uint8Array to base64 for storage
        message,
        timestamp,
        role: auth.role,
        name: auth.name,
      };

      setSession(newSession);
      localStorage.setItem('wallet_auth_session', JSON.stringify(newSession));

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userRole: auth.role,
        userName: auth.name,
        walletAddress: publicKey.toString(),
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        isAuthenticated: false,
      }));
      return false;
    }
  }, [connected, publicKey, signMessage]);

  const logout = useCallback(() => {
    setSession(null);
    localStorage.removeItem('wallet_auth_session');
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userRole: 'none',
      userName: '',
      walletAddress: null,
    });
  }, []);

  const getAuthHeaders = useCallback(() => {
    if (!session) return {};

    // Validate session data before creating headers
    if (!session.signature || !session.walletAddress || !session.message || !session.timestamp) {
      console.error('Invalid session data:', session);
      return {};
    }

    const headers = {
      'Authorization': `Bearer ${session.signature}`,
      'X-Wallet-Address': session.walletAddress,
      'X-Auth-Message': Buffer.from(session.message).toString('base64'),
      'X-Auth-Timestamp': session.timestamp.toString(),
    };

    // Validate each header value for HTTP compliance
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value !== 'string' || value.length === 0) {
        console.error(`Invalid header value for ${key}:`, value);
        return {};
      }
      // Check for invalid characters in HTTP headers (control characters, newlines, etc.)
      if (/[\x00-\x1F\x7F]/.test(value)) {
        console.error(`Header ${key} contains invalid control characters:`, value);
        return {};
      }
    }

    return headers;
  }, [session]);

  return {
    ...authState,
    authenticate,
    logout,
    getAuthHeaders,
    session,
    hasRole: (role: string) => {
      const roleHierarchy = { admin: 3, editor: 2, viewer: 1, none: 0 };
      const userLevel = roleHierarchy[authState.userRole as keyof typeof roleHierarchy] || 0;
      const requiredLevel = roleHierarchy[role as keyof typeof roleHierarchy] || 0;
      return userLevel >= requiredLevel;
    },
  };
}