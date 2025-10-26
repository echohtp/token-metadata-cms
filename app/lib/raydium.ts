import { isValidSolanaAddress } from './auth';

export interface RaydiumTokenData {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  imgUrl: string;
  metadataUrl: string;
  decimals: number;
  creator: string;
  createAt: number;
  twitter?: string;
  telegram?: string;
  website?: string;
  platformInfo?: {
    name?: string;
    web?: string;
  };
}

export interface RaydiumApiResponse {
  data: {
    rows: RaydiumTokenData[];
  };
  success: boolean;
}

/**
 * Fetch token metadata from Raydium API
 */
export async function fetchTokenMetadata(mintAddress: string): Promise<RaydiumTokenData | null> {
  // Validate mint address format first
  if (!isValidSolanaAddress(mintAddress)) {
    throw new Error('Invalid Solana address format');
  }

  try {
    const response = await fetch(
      `https://launch-mint-v1.raydium.io/get/by/mints?ids=${mintAddress}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Token not found in Raydium
      }
      throw new Error(`Raydium API error: ${response.status} ${response.statusText}`);
    }

    const data: RaydiumApiResponse = await response.json();
    
    if (!data.success || !data.data?.rows || data.data.rows.length === 0) {
      return null; // No token data found
    }

    return data.data.rows[0]; // Return first match
  } catch (error) {
    console.error('Error fetching token metadata from Raydium:', error);
    throw error;
  }
}

/**
 * Convert Raydium token data to our form format
 */
export function raydiumToFormData(raydiumData: RaydiumTokenData): {
  name: string;
  logo: string;
  description: string;
  twitter_url: string;
  telegram_url: string;
  website_url: string;
  discord_url: string;
} {
  // Format URL properly
  const formatUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `https://${url}`;
  };

  // Use the token's website first, fallback to platform website
  const website = raydiumData.website || raydiumData.platformInfo?.web || '';

  return {
    name: raydiumData.name || raydiumData.symbol || '',
    logo: raydiumData.imgUrl || '',
    description: raydiumData.description || '',
    twitter_url: formatUrl(raydiumData.twitter || ''),
    telegram_url: formatUrl(raydiumData.telegram || ''),
    website_url: formatUrl(website),
    discord_url: '', // Not available in Raydium response
  };
}