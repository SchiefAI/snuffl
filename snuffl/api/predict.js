import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' });
  }

  const { userId, email, imageUrl } = req.body;

  const endpoint = 'https://us-central1-aiplatform.googleapis.com/v1/projects/elated-pathway-441608-i1/locations/us-central1/endpoints/4969010428900462592:predict';

  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  });

  const client = await auth.getClient();
  const projectId = await auth.getProjectId();

  const body = {
    instances: [
      {
        content: imageUrl,
        mimeType: "image/jpeg"
      }
    ],
    parameters: {
      confidenceThreshold: 0.2,
      maxPredictions: 5
    }
  };

  try {
    const url = endpoint;
    const resAI = await client.request({
      url,
      method: 'POST',
      data: body
    });

    const prediction = resAI.data.predictions?.[0] || {};
    const displayNames = prediction.displayNames || [];
    const confidences = prediction.confidences || [];

    const topResults = displayNames.map((breed, index) => ({
      breed,
      confidence: confidences[index] || 0
    })).sort((a, b) => b.confidence - a.confidence).slice(0, 3);

    const bestMatch = topResults[0] || { breed: "Onbekend", confidence: 0 };

    res.status(200).json({
      user_id: userId,
      email,
      name: "Onbekend",
      breed: bestMatch.breed,
      confidence: bestMatch.confidence,
      alternatives: topResults,
      weight: null,
      age: null,
      image_url: imageUrl,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error calling Vertex AI:', error);
    res.status(500).json({ error: 'Prediction failed', details: error.message });
  }
}
