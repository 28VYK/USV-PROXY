import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Privacy() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Initialize Theme - temporarily locked to light mode
    setTheme('light');
    document.documentElement.classList.remove('dark-theme');
  }, []);

  return (
    <>
      <Head>
        <title>Confidențialitate & Disclaimer — USV Portal</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@600;700;800&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet" />
      </Head>

      <div className="app" data-theme={theme}>
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <div className="logo">
              <div className="logo-icon-wrapper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="logo-svg">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                  <path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5" />
                </svg>
              </div>
              <span className="logo-highlight">USV</span>
              <span className="logo-text">Portal</span>
            </div>
          </div>
        </header>

        <main className="main">
          <article className="doc">

            {/* Title block */}
            <div className="doc-header">
              <p className="doc-label">Document public · Actualizat Mai 2026</p>
              <h1>Politică de Confidențialitate<br />& Disclaimer</h1>
              <p className="doc-subtitle">
                Informații despre cum funcționează acest proiect și cum sunt gestionate datele tale.
              </p>
            </div>

            <div className="divider" />

            {/* Section 1 */}
            <section className="section">
              <h2>1. Caracterul Neoficial al Soluției</h2>
              <p>
                Această aplicație este un <strong>proiect independent (Proof of Concept)</strong> și nu este afiliat, asociat, autorizat sau în vreun fel legat oficial de Universitatea „Ștefan cel Mare" din Suceava.
              </p>
              <p>
                Scopul este de a oferi o interfață modernă pentru portalul studențesc PeopleSoft, ocolind limitările tehnice ale platformei originale care blochează accesul din browserele moderne.
              </p>
            </section>

            {/* Section 2 */}
            <section className="section">
              <h2>2. Cum sunt gestionate datele tale</h2>
              <div className="flow">
                <div className="flow-step">
                  <span className="flow-index">01</span>
                  <p>Introduci datele de conectare în browserul tău local.</p>
                </div>
                <div className="flow-step">
                  <span className="flow-index">02</span>
                  <p>Serverul proxy le transmite direct către <code>scolaritate.usv.ro</code> prin VPN-ul universitar intern.</p>
                </div>
                <div className="flow-step">
                  <span className="flow-index">03</span>
                  <p>USV răspunde cu datele tale, serverul le formatează și le returnează browserului tău.</p>
                </div>
              </div>
              <p className="note">
                Serverul este <strong>stateless</strong> — nu există baze de date, nu se stochează parole sau date personale pe disc. Datele există exclusiv în memorie pe durata sesiunii.
              </p>
            </section>

            {/* Section 3 */}
            <section className="section">
              <h2>3. Criptarea Conexiunii (HTTPS)</h2>
              <p>
                Platforma este accesibilă la <strong>https://noteusv.tech</strong>. Conexiunea dintre browser și server este complet criptată prin rețeaua Cloudflare (SSL/TLS).
              </p>
              <div className="callout">
                <p><strong>Recomandări de securitate:</strong></p>
                <ul>
                  <li>Nu activa „Ține minte utilizatorul" pe calculatoare publice sau partajate.</li>
                  <li>Utilizează întotdeauna conexiunea HTTPS — nu accesa portalul pe rețele Wi-Fi nesecurizate.</li>
                  <li>Codul este open-source — poți clona repository-ul și rula serverul local pentru control deplin.</li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section className="section">
              <h2>4. Declinarea Răspunderii (Disclaimer)</h2>
              <p>
                Serviciul este furnizat „ca atare" (as is), fără nicio garanție explicită sau implicită. Autorul nu își asumă răspunderea pentru:
              </p>
              <ul>
                <li>Erori, indisponibilitate sau disfuncționalități ale platformei USV.</li>
                <li>Incidente de securitate cauzate de utilizarea pe rețele nesecurizate.</li>
                <li>Blocarea contului ca urmare a utilizării incorecte a API-ului de autentificare.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="section">
              <h2>5. Licență Open-Source & Copyright (MIT)</h2>
              <p>
                Acest proiect este distribuit în mod deschis ca software liber sub <strong>Licența MIT</strong>. Întregul cod sursă, designul interfeței și arhitectura platformei sunt concepute și dezvoltate în totalitate de către <strong>Vichiriuc Adrian</strong> (@28VYK).
              </p>
              <p>
                Codul fiind complet public, oricine are posibilitatea de a-i inspecta transparența, securitatea și de a rula propria instanță locală pentru control deplin. Condițiile legale complete și detaliile de atribuire pot fi consultate în fișierele de licență din repository-ul proiectului.
              </p>
            </section>

            <div className="divider" />

            <footer className="doc-footer">
              <Link href="/" legacyBehavior>
                <a className="btn-back">← Înapoi la autentificare</a>
              </Link>
            </footer>

          </article>
        </main>
      </div>

      <style jsx>{`
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #fafafa;
          color: #1a1a1a;
          transition: background-color 0.3s ease, color 0.3s ease;
        }

        .app[data-theme="dark"] {
          background: #020617;
          color: #cbd5e1;
        }

        .header, .doc-header, .logo-highlight, h1, h2, strong, p, li, .divider, code, .flow, .flow-step, .note, .callout, .btn-back {
          transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
        }

        .app[data-theme="dark"] .header {
          background: #0b0f19;
          border-bottom-color: #1e293b;
        }

        .app[data-theme="dark"] .logo-highlight {
          color: #f8fafc;
        }

        .app[data-theme="dark"] h1,
        .app[data-theme="dark"] h2,
        .app[data-theme="dark"] strong {
          color: #f8fafc;
        }

        .app[data-theme="dark"] p,
        .app[data-theme="dark"] li,
        .app[data-theme="dark"] .doc-subtitle {
          color: #cbd5e1;
        }

        .app[data-theme="dark"] .divider {
          background: #1e293b;
        }

        .app[data-theme="dark"] code {
          background: #1e293b;
          color: #cbd5e1;
        }

        .app[data-theme="dark"] .flow {
          border-color: #1e293b;
        }

        .app[data-theme="dark"] .flow-step {
          border-bottom-color: #1e293b;
        }

        .app[data-theme="dark"] .flow-step p {
          color: #cbd5e1;
        }

        .app[data-theme="dark"] .note {
          background: #0f172a;
          border-left-color: #334155;
          color: #94a3b8;
        }

        .app[data-theme="dark"] .callout {
          background: #0f172a;
          border-color: #1e293b;
        }

        .app[data-theme="dark"] .callout p,
        .app[data-theme="dark"] .callout li {
          color: #cbd5e1;
        }

        .app[data-theme="dark"] .btn-back {
          background: #0b0f19;
          border-color: #1e293b;
          color: #cbd5e1;
        }

        .app[data-theme="dark"] .btn-back:hover {
          background: #1e293b;
          border-color: #334155;
          color: #f8fafc;
        }

        /* ── Header ── */
        .header {
          padding: 20px 32px;
          border-bottom: 1px solid #ebebeb;
          background: #fff;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 18px;
          letter-spacing: -0.03em;
          user-select: none;
          width: fit-content;
        }

        .logo-highlight {
          font-weight: 600;
          color: #0f172a;
        }

        .logo-text {
          font-weight: 500;
          color: #94a3b8;
        }

        /* ── Main ── */
        .main {
          flex: 1;
          padding: 48px 24px 80px;
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
          box-sizing: border-box;
        }

        /* ── Document ── */
        .doc-header {
          margin-bottom: 36px;
        }

        .doc-label {
          font-size: 12px;
          font-weight: 500;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 16px;
        }

        h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 34px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin: 0 0 14px;
        }

        .doc-subtitle {
          font-size: 15px;
          color: #64748b;
          line-height: 1.55;
          margin: 0;
        }

        .divider {
          height: 1px;
          background: #ebebeb;
          margin: 32px 0;
        }

        /* ── Sections ── */
        .section {
          margin-bottom: 36px;
        }

        h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 17px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 12px;
          letter-spacing: -0.01em;
        }

        p {
          font-size: 14.5px;
          line-height: 1.65;
          color: #374151;
          margin: 0 0 10px;
        }

        p:last-child {
          margin-bottom: 0;
        }

        ul {
          padding-left: 18px;
          margin: 8px 0 0;
        }

        li {
          font-size: 14px;
          line-height: 1.65;
          color: #374151;
          margin-bottom: 6px;
        }

        strong {
          color: #0f172a;
          font-weight: 600;
        }

        code {
          font-family: 'SF Mono', 'Fira Code', monospace;
          font-size: 13px;
          background: #f1f5f9;
          padding: 1px 5px;
          border-radius: 4px;
          color: #334155;
        }

        /* ── Flow steps ── */
        .flow {
          display: flex;
          flex-direction: column;
          gap: 0;
          margin: 16px 0;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }

        .flow-step {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 18px;
          border-bottom: 1px solid #f1f5f9;
        }

        .flow-step:last-child {
          border-bottom: none;
        }

        .flow-index {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          letter-spacing: 0.04em;
          flex-shrink: 0;
          width: 22px;
        }

        .flow-step p {
          font-size: 13.5px;
          line-height: 1.5;
          color: #374151;
          margin: 0;
        }

        /* ── Note / Callout ── */
        .note {
          font-size: 13.5px;
          color: #64748b;
          background: #f8fafc;
          border-left: 3px solid #e2e8f0;
          padding: 12px 16px;
          border-radius: 0 8px 8px 0;
          margin-top: 16px !important;
          line-height: 1.6;
        }

        .callout {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 18px 20px;
          margin-top: 14px;
        }

        .callout p {
          font-size: 13.5px;
          color: #374151;
          margin-bottom: 8px;
        }

        .callout ul {
          margin: 0;
        }

        .callout li {
          font-size: 13.5px;
          color: #4b5563;
        }

        /* ── Footer ── */
        .doc-footer {
          display: flex;
          justify-content: flex-start;
        }

        .btn-back {
          display: inline-flex;
          align-items: center;
          height: 40px;
          padding: 0 18px;
          background: #fff;
          color: #374151;
          text-decoration: none;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          transition: all 0.15s ease;
          font-family: 'Inter', sans-serif;
        }

        .btn-back:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .header {
            padding: 16px 20px;
          }

          h1 {
            font-size: 26px;
          }

          .main {
            padding: 32px 16px 60px;
          }
        }
      `}</style>

      <style jsx global>{`
        html {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100vh;
          overflow-x: hidden;
          background-color: #fafafa;
          -webkit-font-smoothing: antialiased;
          transition: background-color 0.3s ease;
        }
        html.dark-theme {
          background-color: #020617;
        }
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100vh;
          background-color: inherit;
        }
      `}</style>
    </>
  );
}
