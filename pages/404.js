import Head from 'next/head';
import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 — Pagina nu a fost găsită</title>
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
            <h1>Pagina nu există</h1>
            <p>Adresa pe care ai încercat să o accesezi nu există, a fost ștearsă sau mutată permanent.</p>

            <Link href="/" legacyBehavior>
              <a className="btn-back">Înapoi la portal</a>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
