'use client';

import { AuthGuard } from './components/auth/AuthGuard';
import { TokenMetadataCMS } from './components/cms/TokenMetadataCMS';

export default function HomePage() {
  return (
    <AuthGuard requiredRole="viewer">
      <TokenMetadataCMS />
    </AuthGuard>
  );
}
