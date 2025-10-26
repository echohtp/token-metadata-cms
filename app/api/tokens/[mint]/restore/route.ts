import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { authenticateRequest, requireRole } from '../../../../lib/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request);
    requireRole(auth.role, 'editor');

    const { mint } = await params;

    const { data, error } = await supabaseAdmin.rpc('restore_token_metadata', {
      p_mint: mint,
      p_wallet_address: auth.walletAddress
    });

    if (error) {
      console.error('Database error:', error);
      if (error.message.includes('not found') || error.message.includes('not deleted')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to restore token metadata' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Token metadata restored successfully' });
  } catch (error) {
    console.error('API error:', error);
    if (error instanceof Error && error.message.includes('permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}