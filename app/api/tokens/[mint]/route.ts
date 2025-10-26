import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { authenticateRequest, requireRole } from '../../../lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  try {
    const { mint } = await params;

    const { data, error } = await supabaseAdmin.rpc('get_token_by_mint', {
      p_mint: mint
    });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch token' }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request);
    requireRole(auth.role, 'editor');

    const { mint } = await params;
    const body = await request.json();
    const {
      name,
      logo,
      description,
      twitter_url,
      telegram_url,
      website_url,
      discord_url,
      is_active = true
    } = body;

    const { data, error } = await supabaseAdmin.rpc('upsert_token_metadata', {
      p_mint: mint,
      p_name: name || null,
      p_logo: logo || null,
      p_description: description || null,
      p_twitter_url: twitter_url || null,
      p_telegram_url: telegram_url || null,
      p_website_url: website_url || null,
      p_discord_url: discord_url || null,
      p_is_active: is_active,
      p_wallet_address: auth.walletAddress
    });

    if (error) {
      console.error('Database error:', error);
      if (error.message.includes('Invalid')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to update token metadata' }, { status: 500 });
    }

    // Fetch the updated token
    const { data: tokenData, error: fetchError } = await supabaseAdmin.rpc('get_token_by_mint', {
      p_mint: mint
    });

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ error: 'Token updated but failed to fetch details' }, { status: 200 });
    }

    return NextResponse.json(tokenData?.[0] || { id: data });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request);
    requireRole(auth.role, 'editor');

    const { mint } = await params;

    const { data, error } = await supabaseAdmin.rpc('soft_delete_token_metadata', {
      p_mint: mint,
      p_wallet_address: auth.walletAddress
    });

    if (error) {
      console.error('Database error:', error);
      if (error.message.includes('not found') || error.message.includes('already deleted')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to delete token metadata' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Token metadata deleted successfully' });
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