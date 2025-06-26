// /api/analyze.js
import { GoogleAuth } from 'google-auth-library';
import sharp from 'sharp';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  if (!process.env.VERTEX_SERVICE_ACCOUNT_JSON) {
    return res.status(500).json({ error: 'Missing ENV variable VERTEX_SERVICE_ACCOUNT_JSON' });
  }

  try {
    const serviceAccount = JSON.parse(process.env.VERTEX_SERVICE_ACCOUNT_JSON);

    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    // Afbeelding ophalen en verkleinen naar <= 1MB
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();

    const resizedImage = await sharp(Buffer.from(buffer))
      .resize({ width: 512 })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64 = resizedImage.toString('base64');

    const endpoint = 'https://us-central1-aiplatform.googleapis.com/v1/projects/elated-pathway-441608-i1/locations/us-central1/endpoints/7431481444393811968:predict';

    const vertexRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        instances: [
          {
            image: { b64: base64 }
          }
        ]
      })
    });

    if (!vertexRes.ok) {
      const errorText = await vertexRes.text();
      console.error('❌ Vertex AI error:', errorText);
      return res.status(vertexRes.status).json({ error: 'Vertex AI error', details: errorText });
    }

    const prediction = await vertexRes.json();
    const scores = prediction.predictions?.[0]?.scores;

    // Hondenrassen importeren uit aparte file of hier hardcoden
    const labels = [...]; // hier jouw lange lijst

    if (!scores || scores.length === 0) {
      return res.status(500).json({ error: 'No prediction scores received' });
    }

    const maxIndex = scores.indexOf(Math.max(...scores));
    const label = labels[maxIndex] || 'Onbekend';

    return res.status(200).json({
      status: 'success',
      label,
      confidence: scores[maxIndex],
      scores
    });
  } catch (err) {
    console.error('❌ Server Error:', err);
    return res.status(500).json({ error: 'Server Error', details: err.message });
  }
}
