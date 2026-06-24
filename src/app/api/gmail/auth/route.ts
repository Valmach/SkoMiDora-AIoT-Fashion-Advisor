import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Ask for read-only access to Gmail
  const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Crucial: This forces Google to give us a Refresh Token
    prompt: 'consent',      // Forces the consent screen to appear
    scope: scopes,
  });

  return NextResponse.redirect(url);
}