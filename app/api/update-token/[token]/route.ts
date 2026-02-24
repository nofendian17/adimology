import { NextRequest, NextResponse } from 'next/server';

/**
 * DEPRECATED: This endpoint is no longer functional.
 * Token management is now fully automated via auto-login.
 * @deprecated Use the auto-login feature instead. Set STOCKBIT_USERNAME, STOCKBIT_PASSWORD, and STOCKBIT_PLAYER_ID in environment variables.
 * @see https://github.com/bhaktiutama/adimology#stockbit-integration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    return NextResponse.json({
      success: true,
      message: 'DEPRECATED: Token auto-refresh is now active. Manual token updates are no longer required.',
      deprecation: 'This endpoint is deprecated and will be removed in a future version.',
      note: 'Tokens are automatically fetched using STOCKBIT_USERNAME, STOCKBIT_PASSWORD, and STOCKBIT_PLAYER_ID environment variables.',
      documentation: 'https://github.com/bhaktiutama/adimology#stockbit-integration',
    });
  } catch (error: unknown) {
    console.error('Update Token Error:', error);
    
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
