import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';

async function getAccessToken() {
  const auth = new GoogleAuth({
    keyFile: 'service-account.json',
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();

  console.log('Access token:', token.token);
}

getAccessToken().catch(console.error);
