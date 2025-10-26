import { NextRequest } from 'next/server';
import { verifyWalletSignature, isValidTimestamp, getWalletAuthorization } from './auth';
import { supabaseAdmin } from './supabase';

export interface AuthenticatedRequest {
  walletAddress: string;
  role: string;
  name: string;
}

export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedRequest> {
  const authHeader = request.headers.get('authorization');
  const walletAddress = request.headers.get('x-wallet-address');
  const authMessageEncoded = request.headers.get('x-auth-message');
  const authTimestamp = request.headers.get('x-auth-timestamp');

  if (!authHeader || !walletAddress || !authMessageEncoded || !authTimestamp) {
    throw new Error('Missing authentication headers');
  }

  // Decode the base64-encoded auth message
  const authMessage = Buffer.from(authMessageEncoded, 'base64').toString('utf-8');

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization header format');
  }

  const signatureString = authHeader.substring(7);
  let signature: Uint8Array;
  
  try {
    // Try base64 decoding first (new format)
    signature = new Uint8Array(Buffer.from(signatureString, 'base64'));
  } catch (error) {
    // Fallback to comma-separated format (old format) - force re-auth by throwing error
    throw new Error('Invalid signature format - please re-authenticate');
  }
  const timestamp = parseInt(authTimestamp);

  // Verify timestamp is recent (within 30 minutes)
  if (!isValidTimestamp(timestamp)) {
    throw new Error('Authentication timestamp expired');
  }

  // Verify wallet signature
  const isValidSignature = await verifyWalletSignature(
    authMessage,
    signature,
    walletAddress
  );

  if (!isValidSignature) {
    throw new Error('Invalid wallet signature');
  }

  // Check wallet authorization
  const auth = await getWalletAuthorization(walletAddress);
  if (!auth.isAuthorized) {
    throw new Error('Wallet not authorized');
  }

  // Set wallet context for RLS
  await supabaseAdmin.rpc('set_current_wallet', { wallet_address: walletAddress });

  return {
    walletAddress,
    role: auth.role,
    name: auth.name
  };
}

export function requireRole(userRole: string, requiredRole: string): void {
  const roleHierarchy = { admin: 3, editor: 2, viewer: 1, none: 0 };
  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
  
  if (userLevel < requiredLevel) {
    throw new Error(`Insufficient permissions: ${requiredRole} role required`);
  }
}