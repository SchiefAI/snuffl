// /api/analyze.js
import { GoogleAuth } from 'google-auth-library';
import sharp from 'sharp';

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
    // ✅ Auth setup
    const serviceAccount = JSON.parse(process.env.VERTEX_SERVICE_ACCOUNT_JSON);
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    // ✅ Download en verklein afbeelding met sharp
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(buffer);

    const resizedBuffer = await sharp(imageBuffer)
      .resize({ width: 512 }) // pas aan indien nodig
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64Image = resizedBuffer.toString('base64');

    // ✅ Vertex AI aanroepen
    const endpoint = 'https://us-central1-aiplatform.googleapis.com/v1/projects/elated-pathway-441608-i1/locations/us-central1/endpoints/7431481444393811968:predict';

    const predictionRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken.token}`
      },
      body: JSON.stringify({
        instances: [
          {
            image: {
              content: base64Image // 👈 GEEN dubbele quotes!
            }
          }
        ]
      })
    });

    if (!predictionRes.ok) {
      const errorText = await predictionRes.text();
      console.error('❌ Vertex AI error:', errorText);
      return res.status(predictionRes.status).json({ error: 'Vertex AI error', details: errorText });
    }

    const prediction = await predictionRes.json();
    return res.status(200).json({
      status: 'success',
      prediction
    });

  } catch (err) {
    console.error('❌ Server error:', err.message);
    return res.status(500).json({ error: 'Server Error', details: err.message });
  }
}
