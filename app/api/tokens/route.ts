import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../lib/supabase';
import { authenticateRequest, requireRole } from '../../lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') !== 'false';
    const includeDeleted = searchParams.get('include_deleted') === 'true';
    const search = searchParams.get('search') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Require authentication for all token operations in CMS
    const auth = await authenticateRequest(request);
    requireRole(auth.role, 'viewer');

    const { data, error } = await supabaseAdmin.rpc('get_token_metadata_overrides', {
      p_active_only: activeOnly,
      p_include_deleted: includeDeleted,
      p_search: search,
      p_limit: limit,
      p_offset: offset
    });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        limit,
        offset,
        hasMore: (data || []).length === limit
      }
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request);
    requireRole(auth.role, 'editor');

    const body = await request.json();
    const {
      mint,
      name,
      logo,
      description,
      twitter_url,
      telegram_url,
      website_url,
      discord_url,
      is_active = true
    } = body;

    if (!mint) {
      return NextResponse.json({ error: 'Mint address is required' }, { status: 400 });
    }

    // Validate mint address format
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
      return NextResponse.json({ error: 'Invalid mint address format' }, { status: 400 });
    }

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
      return NextResponse.json({ error: 'Failed to save token metadata' }, { status: 500 });
    }

    // Fetch the created/updated token
    const { data: tokenData, error: fetchError } = await supabaseAdmin.rpc('get_token_by_mint', {
      p_mint: mint
    });

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ error: 'Token saved but failed to fetch details' }, { status: 201 });
    }

    return NextResponse.json(tokenData?.[0] || { id: data }, { status: 201 });
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