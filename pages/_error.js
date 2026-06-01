import Head from 'next/head';
import Link from 'next/link';

function Error({ statusCode }) {
  return (
    <>
      <Head>
        <title>{statusCode ? `${statusCode} — Eroare de sistem` : 'Eroare de sistem'}</title>
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
            <h1>A apărut o eroare</h1>
            <p>
              {statusCode === 404 
                ? 'Pagina pe care o cauți nu există sau a fost mutată.'
                : 'A apărut o eroare neașteptată pe server. Te rugăm să reîncarci pagina sau să încerci mai târziu.'
              }
            </p>

            <div className="actions">
              <button onClick={() => window.location.reload()} className="btn-primary">
                Reîncarcă pagina
              </button>
              <Link href="/" legacyBehavior>
                <a className="btn-secondary">Înapoi la portal</a>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        html, body, #__next {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100vh;
        }
      `}</style>

      <style jsx>{`
        .error-page-wrapper {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
          color: #334155;
          overflow: hidden;
          position: relative;
          -webkit-font-smoothing: antialiased;
          padding: 20px;
        }
        .glow-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(130px);
          z-index: 1;
          pointer-events: none;
          mix-blend-mode: multiply;
          animation: pulse 10s ease-in-out infinite alternate;
        }

        .glow-blob-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(37, 74, 165, 0.12) 0%, rgba(135, 194, 234, 0) 70%);
          top: -10%;
          left: 10%;
        }

        .glow-blob-2 {
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.10) 0%, rgba(56, 189, 248, 0) 70%);
          bottom: 0%;
          right: 5%;
          animation-delay: -5s;
        }

        @keyframes pulse {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(30px, -40px) scale(1.15); }
        }

        .container {
          position: relative;
          z-index: 5;
          width: 100%;
          max-width: 440px;
          padding: 20px;
        }

        .card {
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.6);
          border-radius: 24px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow:
            0 30px 60px rgba(15, 23, 42, 0.05),
            0 12px 24px rgba(15, 23, 42, 0.03),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          padding: 44px 36px;
          text-align: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .card:hover {
          transform: translateY(-2px);
          box-shadow:
            0 35px 70px rgba(15, 23, 42, 0.07),
            0 15px 30px rgba(15, 23, 42, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .error-code {
          font-family: 'Outfit', sans-serif;
          font-size: 72px;
          font-weight: 900;
          color: #254AA5;
          line-height: 1;
          margin-bottom: 8px;
          letter-spacing: -0.04em;
          background: linear-gradient(135deg, #254AA5 0%, #87C2EA 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 26px;
          font-weight: 800;
          margin: 0 0 14px;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        p {
          color: #64748b;
          font-size: 14.5px;
          line-height: 1.6;
          margin-bottom: 32px;
          font-weight: 500;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          width: 100%;
          max-width: 260px;
          padding: 0 28px;
          background: linear-gradient(135deg, #254AA5 0%, #87C2EA 100%);
          color: white;
          border: none;
          border-radius: 99px;
          font-size: 14px;
          font-weight: 700;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 12px rgba(37, 74, 165, 0.15);
          cursor: pointer;
        }

        .btn-primary:hover {
          transform: translateY(-1.5px);
          box-shadow: 0 8px 20px rgba(37, 74, 165, 0.25);
          filter: brightness(1.05);
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          width: 100%;
          max-width: 260px;
          padding: 0 28px;
          background: rgba(15, 23, 42, 0.05);
          color: #0f172a;
          border: 1px solid rgba(15, 23, 42, 0.1);
          border-radius: 99px;
          font-size: 14px;
          font-weight: 700;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }

        .btn-secondary:hover {
          background: rgba(15, 23, 42, 0.08);
          transform: translateY(-1px);
        }
      `}</style>
    </>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 400;
  return { statusCode };
};

export default Error;
