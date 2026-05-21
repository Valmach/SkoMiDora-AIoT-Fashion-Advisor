import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No code provided by Google' }, { status: 400 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Exchange the code for the permanent tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('\n\n=== YOUR GMAIL REFRESH TOKEN ===\n');
    console.log(tokens.refresh_token);
    console.log('\n=================================\n');

    return NextResponse.json({ 
      success: true, 
      message: 'Authentication successful! Check your terminal for the Refresh Token.' 
    });

  } catch (error) {
    console.error('Error exchanging code:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}