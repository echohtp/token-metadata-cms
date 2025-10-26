'use client';

import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getNetworkDisplayName } from '../../lib/solana';

export const WalletButton: React.FC = () => {
  const { connected, publicKey } = useWallet();

  return (
    <div className="flex items-center space-x-4">
      {/* Network indicator */}
      <div className="hidden sm:flex items-center space-x-2">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-sm text-gray-600">
          {getNetworkDisplayName()}
        </span>
      </div>

      {/* Wallet connection button */}
      <div className="wallet-adapter-button-wrapper">
        <WalletMultiButton />
      </div>

      {/* Connected wallet indicator */}
      {connected && publicKey && (
        <div className="hidden md:flex flex-col text-right">
          <span className="text-xs text-gray-500">Connected</span>
          <span className="text-sm font-mono text-gray-700">
            {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
          </span>
        </div>
      )}
    </div>
  );
};