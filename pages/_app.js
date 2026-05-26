import '../styles/globals.css';
import '../styles/layout.css';
import '../styles/login.css';
import '../styles/analytics.css';
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Only run Service Worker registration in the client browser, not during SSR
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('PWA Service Worker înregistrat cu succes! Scope:', registration.scope);
          })
          .catch((err) => {
            console.error('Înregistrarea PWA Service Worker a eșuat:', err);
          });
      });
    }
  }, []);

  return <Component {...pageProps} />;
}
