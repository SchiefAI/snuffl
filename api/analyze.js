import { GoogleAuth } from 'google-auth-library';

export default async function handler(req, res) {
  try {
    const { imageUrl, userId, email } = req.body;

    if (!imageUrl || !userId || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const endpoint = 'https://us-central1-aiplatform.googleapis.com/v1/projects/elated-pathway-441608-i1/locations/us-central1/endpoints/7431481444393811968:predict';

    const auth = new GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
      scopes: 'https://www.googleapis.com/auth/cloud-platform'
    });

    const client = await auth.getClient();
    const url = `${endpoint}`;
    const body = {
      instances: [{ image_uri: imageUrl }]
    };

    const response = await client.request({
      url,
      method: 'POST',
      data: body,
      headers: { 'Content-Type': 'application/json' }
    });

    res.status(200).json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
}