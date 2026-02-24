import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Token auto-refresh is now active. Manual token updates are no longer required.',
      note: 'Tokens are automatically fetched using STOCKBIT_USERNAME and STOCKBIT_PASSWORD environment variables.',
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
