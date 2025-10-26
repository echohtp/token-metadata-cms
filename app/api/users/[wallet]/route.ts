import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { authenticateRequest, requireRole } from '../../../lib/api-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    // Require admin role for updating users
    const auth = await authenticateRequest(request);
    requireRole(auth.role, 'admin');

    const walletAddress = params.wallet;
    const body = await request.json();
    const { name, role, is_active, notes } = body;

    // Validate role if provided
    if (role && !['admin', 'editor', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Build update object with only provided fields
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabaseAdmin
      .from('authorized_wallets')
      .update(updates)
      .eq('wallet_address', walletAddress)
      .select();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('permissions') ? 403 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    // Require admin role for deactivating users
    const auth = await authenticateRequest(request);
    requireRole(auth.role, 'admin');

    const walletAddress = params.wallet;

    // Don't allow admins to deactivate themselves
    if (walletAddress === auth.walletAddress) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('authorized_wallets')
      .update({ is_active: false })
      .eq('wallet_address', walletAddress)
      .select();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('permissions') ? 403 : 500 }
    );
  }
}