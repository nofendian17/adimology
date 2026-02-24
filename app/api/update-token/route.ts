import { NextRequest, NextResponse } from 'next/server';

/**
 * DEPRECATED: This endpoint is no longer functional.
 * Token management is now fully automated via auto-login.
 * @deprecated Use the auto-login feature instead. Set STOCKBIT_USERNAME, STOCKBIT_PASSWORD, and STOCKBIT_PLAYER_ID in environment variables.
 * @see https://github.com/bhaktiutama/adimology#stockbit-integration
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * DEPRECATED: This endpoint is no longer functional.
 * Token management is now fully automated via auto-login.
 * @deprecated Use the auto-login feature instead. Set STOCKBIT_USERNAME, STOCKBIT_PASSWORD, and STOCKBIT_PLAYER_ID in environment variables.
 * @see https://github.com/bhaktiutama/adimology#stockbit-integration
 */
export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'DEPRECATED: Token auto-refresh is now active. Manual token updates are no longer required.',
      deprecation: 'This endpoint is deprecated and will be removed in a future version.',
      note: 'Tokens are automatically fetched using STOCKBIT_USERNAME, STOCKBIT_PASSWORD, and STOCKBIT_PLAYER_ID environment variables.',
      documentation: 'https://github.com/bhaktiutama/adimology#stockbit-integration',
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error: unknown) {
    console.error('Update Token Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
