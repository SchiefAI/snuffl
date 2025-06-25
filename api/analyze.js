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
    // 🔐 Authenticatie
    const serviceAccount = JSON.parse(process.env.VERTEX_SERVICE_ACCOUNT_JSON);
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    // 🖼️ Download en verklein de afbeelding
    const imageResponse = await fetch(imageUrl);
    const originalBuffer = await imageResponse.arrayBuffer();
    const resizedImage = await sharp(Buffer.from(originalBuffer))
      .resize({ width: 512 })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64Image = resizedImage.toString('base64'); // 🔥 geen stringify of escapes

    // 🚀 Vertex AI request
    const endpoint =
      'https://us-central1-aiplatform.googleapis.com/v1/projects/elated-pathway-441608-i1/locations/us-central1/endpoints/7431481444393811968:predict';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken.token}`,
      },
      body: JSON.stringify({
        instances: [
          {
            content: base64Image,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Vertex error response:', errorText);
      return res.status(response.status).json({ error: 'Vertex AI error', details: errorText });
    }

    const prediction = await response.json();
    return res.status(200).json({ status: 'success', prediction });
  } catch (err) {
    console.error('💥 Server error:', err);
    return res.status(500).json({ error: 'Server Error', details: err.message });
  }
}
