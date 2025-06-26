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
    // 🔐 Auth via embedded service account JSON
    const serviceAccount = JSON.parse(process.env.VERTEX_SERVICE_ACCOUNT_JSON);
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const tokenResult = await client.getAccessToken();
    const accessToken = tokenResult?.token || tokenResult; // fallback if .token not present

    // 🖼️ Download & resize image
    const imageRes = await fetch(imageUrl);
    const buffer = await imageRes.arrayBuffer();
    const resized = await sharp(Buffer.from(buffer))
      .resize({ width: 512 })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64 = resized.toString('base64');

    // 🔮 Predictie via Vertex AI
    const endpoint = 'https://us-central1-aiplatform.googleapis.com/v1/projects/elated-pathway-441608-i1/locations/us-central1/endpoints/7431481444393811968:predict';

    const payload = {
      instances: [
        {
          // ✅ VARIANT A: image.content
          image: { content: base64 },

          // 🔁 VARIANT B (alternatief): gebruik image_bytes
          // image_bytes: { content: base64 }
        },
      ],
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('❌ Vertex AI error:', errText);
      return res.status(response.status).json({ error: 'Vertex AI error', details: errText });
    }

    const result = await response.json();
    const prediction = result.predictions?.[0];

    if (!prediction || !prediction.confidences || !prediction.displayNames) {
      return res.status(500).json({ error: 'Invalid prediction format', details: prediction });
    }

    const scores = prediction.confidences;
    const labels = prediction.displayNames;
    const maxIndex = scores.indexOf(Math.max(...scores));

    return res.status(200).json({
      status: 'success',
      label: labels[maxIndex] || 'Unknown',
      confidence: scores[maxIndex],
      top5: labels
        .map((label, i) => ({ label, confidence: scores[i] }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5),
    });

  } catch (err) {
    console.error('❌ Server Error:', err);
    return res.status(500).json({ error: 'Server Error', details: err.message });
  }
}
