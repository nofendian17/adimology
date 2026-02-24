import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Token auto-refresh is now active. Manual token updates are no longer required.',
      note: 'Tokens are automatically fetched using STOCKBIT_USERNAME and STOCKBIT_PASSWORD environment variables.',
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
