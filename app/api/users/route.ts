import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase';
import { authenticateRequest, requireRole } from '../../lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    // Require admin role for user management
    const auth = await authenticateRequest(request);
    requireRole(auth.role, 'admin');

    const { data, error } = await supabaseAdmin.rpc('get_authorized_wallets');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('permissions') ? 403 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require admin role for adding users
    const auth = await authenticateRequest(request);
    requireRole(auth.role, 'admin');

    const body = await request.json();
    const { wallet_address, name, role = 'editor', notes } = body;

    if (!wallet_address) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    // Validate wallet address format
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet_address)) {
      return NextResponse.json({ error: 'Invalid wallet address format' }, { status: 400 });
    }

    // Validate role
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc('add_authorized_wallet', {
      p_wallet_address: wallet_address,
      p_name: name || null,
      p_role: role,
      p_added_by: auth.walletAddress,
      p_notes: notes || null
    });

    if (error) {
      console.error('Database error:', error);
      if (error.message.includes('already exists')) {
        return NextResponse.json({ error: 'Wallet address already exists' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to add user' }, { status: 500 });
    }

    return NextResponse.json({ id: data, message: 'User added successfully' }, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('permissions') ? 403 : 500 }
    );
  }
}