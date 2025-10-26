import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Only apply CORS checks to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    
    // Define allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001',
    ];
    
    // Add Vercel deployment URLs if in production
    if (process.env.VERCEL_URL) {
      allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
    }
    
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      allowedOrigins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
    }
    
    // Add custom domain if set
    if (process.env.NEXT_PUBLIC_APP_URL) {
      allowedOrigins.push(process.env.NEXT_PUBLIC_APP_URL);
    }
    
    // Check if request is from allowed origin
    const isAllowedOrigin = origin && allowedOrigins.includes(origin);
    const isAllowedReferer = referer && allowedOrigins.some(allowed => referer.startsWith(allowed));
    
    // Allow requests from allowed origins or same-site requests
    if (!isAllowedOrigin && !isAllowedReferer) {
      console.warn('Blocked request from unauthorized origin:', { origin, referer, allowed: allowedOrigins });
      return NextResponse.json(
        { error: 'Unauthorized origin' },
        { status: 403 }
      );
    }
    
    // Add CORS headers for preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin || allowedOrigins[0],
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Wallet-Address, X-Auth-Message, X-Auth-Timestamp',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    
    // Add CORS headers to the response
    const response = NextResponse.next();
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Wallet-Address, X-Auth-Message, X-Auth-Timestamp');
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};