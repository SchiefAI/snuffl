import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing imageUrl in request body' });
  }

  if (!process.env.VERTEX_SERVICE_ACCOUNT_JSON) {
    return res.status(500).json({ error: 'Missing ENV variable VERTEX_SERVICE_ACCOUNT_JSON' });
  }

  try {
    // Stap 1: Image downloaden en converteren naar base64
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');

    // Stap 2: Authenticatie opzetten
    const serviceAccount = JSON.parse(process.env.VERTEX_SERVICE_ACCOUNT_JSON);
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    // Stap 3: Vertex API aanroepen
    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${serviceAccount.project_id}/locations/us-central1/publishers/google/models/imageclassification:predict`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [
          {
            image: {
              b64: base64,
            },
          },
        ],
      }),
    });

    const prediction = await response.json();

    // Stap 4: Resultaten analyseren
    const predictionResult = prediction?.predictions?.[0];

    if (
      !predictionResult ||
      !Array.isArray(predictionResult.confidences || predictionResult.scores) ||
      !Array.isArray(predictionResult.displayNames)
    ) {
      return res.status(500).json({ error: 'Invalid prediction structure', details: prediction });
    }

    const confidences = predictionResult.confidences || predictionResult.scores;
    const labels = predictionResult.displayNames;
    const maxIndex = confidences.indexOf(Math.max(...confidences));
    const label = labels[maxIndex] || 'Onbekend';

    // Stap 5: Terugsturen naar client
    return res.status(200).json({
      status: 'success',
      label,
      confidence: confidences[maxIndex],
      scores: confidences,
      labels,
    });
  } catch (error) {
    console.error('Vertex AI error', error);
    return res.status(500).json({ error: 'Vertex AI error', details: error.message });
  }
}
