import { useState } from 'react';
import Hero from '../components/Hero';
import { Typography, Container, Card, CardMedia, CardContent } from '@mui/material';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <>
      <Hero onUpload={setFile} />

      {file && (
        <Container sx={{ mt: 4 }}>
          <Card sx={{ maxWidth: 400, mx: 'auto' }}>
            <CardMedia
              component="img"
              height="240"
              image={URL.createObjectURL(file)}
              alt="Preview"
            />
            <CardContent>
              <Typography variant="subtitle1">
                Ziet er goed uit? Je kunt nu doorgaan met het profiel.
              </Typography>
            </CardContent>
          </Card>
        </Container>
      )}
    </>
  );
}
