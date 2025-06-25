# Snuffl API Wrapper

Deze wrapper vangt een image-URL op, stuurt het naar Vertex AI en geeft de top-3 voorspellingen terug, inclusief het best passende hondenras.

## Gebruik
POST naar: `/api/predict`

Payload:
```json
{
  "userId": "abc123",
  "email": "baasje@snuffl.app",
  "imageUrl": "https://link-naar-foto.jpg"
}
```
