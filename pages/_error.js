import Head from 'next/head';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

function Error({ statusCode }) {
  const t = useTranslations('Errors');

  return (
    <>
      <Head>
        <title>{statusCode ? `${statusCode} — ${t('pageTitle500')}` : t('pageTitle500')}</title>
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
            <div className="error-code">{statusCode || '500'}</div>
            <h1>{t('title500')}</h1>
            <p>
              {statusCode === 404 
                ? t('desc404ErrorPage')
                : t('desc500')
              }
            </p>

            <div className="actions">
              <button onClick={() => window.location.reload()} className="btn-primary">
                {t('btnReload')}
              </button>
              <Link href="/" legacyBehavior>
                <a className="btn-secondary">{t('btnBack')}</a>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 400;
  return { statusCode };
};

export default Error;
