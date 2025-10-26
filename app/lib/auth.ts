import { PublicKey } from '@solana/web3.js';
import { supabaseAdmin } from './supabase';
import nacl from 'tweetnacl';

// Generate authentication message for wallet signing
export function generateAuthMessage(action: string, timestamp: number): string {
  return `Token Metadata CMS Authentication

Action: ${action}
Timestamp: ${timestamp}
Nonce: ${Math.random().toString(36)}

Please sign this message to verify your wallet ownership.
This signature will not trigger any blockchain transaction.`;
}

// Verify wallet signature using TweetNaCl (more reliable for Solana)
export async function verifyWalletSignature(
  message: string,
  signature: Uint8Array,
  publicKey: string
): Promise<boolean> {
  try {
    const pubKey = new PublicKey(publicKey);
    const messageBytes = new TextEncoder().encode(message);
    
    // Use TweetNaCl for signature verification
    return nacl.sign.detached.verify(
      messageBytes,
      signature,
      pubKey.toBytes()
    );
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

// Check if timestamp is valid (within 30 minutes)
export function isValidTimestamp(timestamp: number): boolean {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  return Math.abs(now - timestamp) < thirtyMinutes;
}

// Check wallet authorization from database
export async function getWalletAuthorization(walletAddress: string) {
  try {
    const { data, error } = await supabaseAdmin.rpc('is_wallet_authorized', {
      p_wallet_address: walletAddress
    });

    if (error) {
      console.error('Error checking wallet authorization:', error);
      return { isAuthorized: false, role: 'none', name: '' };
    }

    return {
      isAuthorized: data?.[0]?.is_authorized || false,
      role: data?.[0]?.role || 'none',
      name: data?.[0]?.name || ''
    };
  } catch (error) {
    console.error('Database error checking authorization:', error);
    return { isAuthorized: false, role: 'none', name: '' };
  }
}

// Role-based permission checks
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = { admin: 3, editor: 2, viewer: 1, none: 0 };
  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
  return userLevel >= requiredLevel;
}

// Validate Solana wallet address format
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}