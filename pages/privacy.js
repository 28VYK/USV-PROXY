import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Privacy() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Initialize Theme - manual choice only
    const savedTheme = localStorage.getItem('usv_theme') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, []);

  return (
    <>
      <Head>
        <title>Confidențialitate & Disclaimer — USV Portal</title>
        <meta name="description" content="Politica de confidențialitate și disclaimer-ul pentru utilizarea platformei neoficiale USV Portal." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        
        {/* Favicon & Icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://noteusv.tech/privacy" />
        
        {/* Google Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@600;700;800&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet" />
      </Head>

      <div className="app legal-page" data-theme={theme}>
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
              <h2>5. Utilizarea Cookie-urilor (Politica de Cookie-uri)</h2>
              <p>
                Pentru a asigura buna funcționare a sesiunii tale, această platformă utilizează un singur cookie tehnic esențial:
              </p>
              <ul>
                <li><strong>PS_PROXY_SESSION</strong>: Acest cookie funcțional de sesiune conține tokenul criptat necesar pentru a asigura comunicarea securizată între browserul tău și proxy pe parcursul interogării notelor. Este un cookie strict necesar conform ePrivacy și este șters automat la închiderea browserului sau la apăsarea butonului de deconectare.</li>
              </ul>
              <p>
                Nu utilizăm niciun cookie de marketing, publicitate, profilare sau analiză a traficului (fără Google Analytics, tracker-e sau scripturi de urmărire de la terți).
              </p>
            </section>

            {/* Section 6 */}
            <section className="section">
              <h2>6. Licență Open-Source & Copyright (MIT)</h2>
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
              <Link href="/terms" legacyBehavior>
                <a className="btn-back">Termeni & Condiții</a>
              </Link>
            </footer>

          </article>
        </main>
      </div>
    </>
  );
}
