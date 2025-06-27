// pages/index.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

/**
 * Home = niets meer dan een redirect naar /preview.
 * Houd deze file zo licht mogelijk; echte UI staat in pages/preview.js
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/preview');
  }, [router]);

  return null;              // laat geen content zien tijdens redirect
}
