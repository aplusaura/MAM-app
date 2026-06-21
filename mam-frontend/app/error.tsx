'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui', textAlign: 'center' }}>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={() => reset()} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
        Try again
      </button>
    </div>
  );
}
