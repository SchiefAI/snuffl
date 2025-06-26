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
    const accessToken = tokenResult?.token || tokenResult;

    // 🖼️ Download & resize image
    const imageRes = await fetch(imageUrl);
    const buffer = await imageRes.arrayBuffer();
    const resized = await sharp(Buffer.from(buffer))
      .resize({ width: 512 })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64 = resized.toString('base64');

    // 🔮 Vertex AI prediction - FIXED PAYLOAD STRUCTURE
    const endpoint = 'https://us-central1-aiplatform.googleapis.com/v1/projects/elated-pathway-441608-i1/locations/us-central1/endpoints/7431481444393811968:predict';

    // 🔄 OPTION 1: AutoML Vision format
    // const payload = {
    //   instances: [
    //     {
    //       content: base64
    //     }
    //   ]
    // };

    // 🔄 OPTION 2: Als Option 1 niet werkt, probeer deze:
    // const payload = {
    //   instances: [
    //     {
    //       image_bytes: {
    //         b64: base64
    //       }
    //     }
    //   ]
    // };

    // ✅ OPTION 3: Als een custom model, probeer deze:
    const payload = {
      instances: [
        {
          bytes_inputs: {
            b64: base64
          }
        }
      ]
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
    console.log('✅ Vertex AI response:', JSON.stringify(result, null, 2));
    
    const prediction = result.predictions?.[0];

    // Handle different response formats
    if (prediction) {
      // AutoML Vision format
      if (prediction.confidences && prediction.displayNames) {
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
      }
      
      // Custom model format - adapt based on your model's output
      else if (prediction.classes) {
        return res.status(200).json({
          status: 'success',
          prediction: prediction
        });
      }
      
      // Generic format
      else {
        return res.status(200).json({
          status: 'success',
          prediction: prediction
        });
      }
    }

    return res.status(500).json({ error: 'No prediction found', details: result });

  } catch (err) {
    console.error('❌ Server Error:', err);
    return res.status(500).json({ error: 'Server Error', details: err.message });
  }
}