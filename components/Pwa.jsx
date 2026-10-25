'use client';
import { useEffect } from 'react';

// Registers the service worker in production so the site can be installed and open offline.
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
