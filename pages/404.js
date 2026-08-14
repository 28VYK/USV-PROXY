import Head from 'next/head';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('Errors');

  return (
    <>
      <Head>
        <title>{t('pageTitle404')}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        
        {/* Favicon & Icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@600;700;800;900&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="error-page-wrapper">
        <div className="glow-blob glow-blob-1"></div>
        <div className="glow-blob glow-blob-2"></div>

        <div className="container">
          <div className="card">
            <div className="error-code">404</div>
            <h1>{t('title404')}</h1>
            <p>{t('desc404')}</p>

            <Link href="/" legacyBehavior>
              <a className="btn-back">{t('btnBack')}</a>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
