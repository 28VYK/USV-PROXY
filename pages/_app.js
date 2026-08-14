import '../styles/globals.css';
import '../styles/layout.css';
import '../styles/login.css';
import '../styles/analytics.css';
import '../styles/error.css';
import '../styles/legal.css';
import '../styles/status.css';
import { useEffect } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import App from 'next/app';
import roMessages from '../messages/ro.json';
import enMessages from '../messages/en.json';

const fallbackMessages = {
  ro: roMessages,
  en: enMessages
};

export default function MyApp({ Component, pageProps }) {
  const locale = pageProps.locale || 'ro';
  const messages = pageProps.messages || fallbackMessages[locale] || roMessages;

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

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="Europe/Bucharest"
    >
      <Component {...pageProps} />
    </NextIntlClientProvider>
  );
}

MyApp.getInitialProps = async (appContext) => {
  const appProps = await App.getInitialProps(appContext);
  
  const req = appContext.ctx.req;
  let locale = 'ro';

  if (req) {
    // Server-side: parse Cookie or Accept-Language
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);
    if (match && (match[1] === 'ro' || match[1] === 'en')) {
      locale = match[1];
    } else {
      const acceptLanguage = req.headers['accept-language'] || '';
      locale = acceptLanguage.toLowerCase().includes('en') ? 'en' : 'ro';
    }
  } else {
    // Client-side: parse Cookie
    const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);
    if (match && (match[1] === 'ro' || match[1] === 'en')) {
      locale = match[1];
    }
  }

  // Load messages
  const messages = fallbackMessages[locale] || roMessages;

  return {
    pageProps: {
      ...appProps.pageProps,
      locale,
      messages
    }
  };
};
