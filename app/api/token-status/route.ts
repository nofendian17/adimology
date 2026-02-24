import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if auto-login credentials are configured
    const username = process.env.STOCKBIT_USERNAME;
    const password = process.env.STOCKBIT_PASSWORD;
    const isConfigured = !!(username && password);

    // Return compatible format with TokenStatusIndicator expectations
    return NextResponse.json({
      exists: isConfigured,
      isValid: isConfigured,
      isExpired: !isConfigured,
      isExpiringSoon: false,
      message: isConfigured 
        ? 'Auto-login active - tokens fetched automatically' 
        : 'Missing STOCKBIT_USERNAME or STOCKBIT_PASSWORD',
      username: username ? `${username.substring(0, 3)}***` : null,
    });
  } catch (error) {
    console.error('Error fetching token status:', error);
    return NextResponse.json(
      { 
        exists: false,
        isValid: false,
        isExpired: true,
        isExpiringSoon: false,
        message: 'Error checking token status'
      },
      { status: 500 }
    );
  }
}
