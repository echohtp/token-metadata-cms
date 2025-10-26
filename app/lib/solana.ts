import { Connection, clusterApiUrl } from '@solana/web3.js';

// Get Solana network configuration
function getSolanaNetwork(): string {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta';
  if (!['mainnet-beta', 'testnet', 'devnet'].includes(network)) {
    console.warn(`Invalid SOLANA_NETWORK: ${network}, defaulting to mainnet-beta`);
    return 'mainnet-beta';
  }
  return network;
}

// Get RPC URL - use custom if provided, otherwise use default for network
function getRpcUrl(): string {
  const customRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  
  if (customRpc) {
    console.log('Using custom Solana RPC:', customRpc);
    return customRpc;
  }

  const network = getSolanaNetwork();
  const defaultRpc = clusterApiUrl(network as 'mainnet-beta' | 'testnet' | 'devnet');
  console.log(`Using default Solana RPC for ${network}:`, defaultRpc);
  return defaultRpc;
}

// Create Solana connection
export const connection = new Connection(getRpcUrl(), 'confirmed');

// Export network info for wallet adapters
export const solanaNetwork = getSolanaNetwork();
export const rpcUrl = getRpcUrl();

// Utility to get network display name
export function getNetworkDisplayName(): string {
  switch (solanaNetwork) {
    case 'mainnet-beta':
      return 'Mainnet';
    case 'testnet':
      return 'Testnet';
    case 'devnet':
      return 'Devnet';
    default:
      return 'Unknown';
  }
}