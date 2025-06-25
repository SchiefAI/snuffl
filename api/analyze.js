// /api/analyze.js
import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { imageUrl, userId, email } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  if (!process.env.VERTEX_SERVICE_ACCOUNT_JSON) {
  return res.status(500).json({ error: 'Missing ENV variable VERTEX_SERVICE_ACCOUNT_JSON' });
}

  try {
    // ✅ Stap 1: Parse de service account JSON uit env var
    const serviceAccount = JSON.parse(process.env.VERTEX_SERVICE_ACCOUNT_JSON);

    // ✅ Stap 2: Auth client opzetten
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    // ✅ Stap 3: Vertex AI API aanroepen
    const endpoint = 'https://us-central1-aiplatform.googleapis.com/v1/projects/elated-pathway-441608-i1/locations/us-central1/models/241898055668858880:predict';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken.token}`
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: 'Wat is het ras van dit dier?',
            image: { imageUri: imageUrl }
          }
        ]
      })
    });

   if (!response.ok) {
  const errorText = await response.text();
  console.error('❌ Vertex error response:', errorText);
  return res.status(response.status).json({ error: 'Vertex AI error', details: errorText });
  }

    const prediction = await response.json();
    return res.status(200).json({
      status: 'success',
      prediction
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', details: err.message });
  }
}
