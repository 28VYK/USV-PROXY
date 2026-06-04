import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Terms() {
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
        <title>Termeni și Condiții — USV Portal</title>
        <meta name="description" content="Termenii și condițiile de utilizare pentru platforma neoficială USV Portal." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        
        {/* Favicon & Icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://noteusv.tech/terms" />
        
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
              <p className="doc-label">Document public · Actualizat Iunie 2026</p>
              <h1>Termeni și Condiții<br />de Utilizare</h1>
              <p className="doc-subtitle">
                Regulile și limitele legale privind utilizarea platformei neoficiale USV Portal.
              </p>
            </div>

            <div className="divider" />

            {/* Section 1 */}
            <section className="section">
              <h2>1. Modul de Utilizare Acceptabil</h2>
              <p>
                Platforma <strong>USV Portal</strong> (<code>noteusv.tech</code>) este pusă la dispoziție exclusiv studenților și cadrelor didactice ale Universității „Ștefan cel Mare” din Suceava în scopuri informative și personale.
              </p>
              <p>
                Prin utilizarea acestui serviciu, te angajezi să nu:
              </p>
              <ul>
                <li>Utilizezi scripturi automate, boți sau alte tehnici de scraping agresiv care pot supraîncărca serverul proxy sau infrastructura oficială USV.</li>
                <li>Abuzezi de API-ul de autentificare prin trimiterea de cereri repetate sau malițioase (brute-force).</li>
                <li>Folosești platforma în scopul obținerii de acces neautorizat la conturile altor studenți.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="section">
              <h2>2. Declinarea Răspunderii (Disclaimer)</h2>
              <p>
                Acest serviciu funcționează ca un <strong>reverse proxy independent</strong> menit să modernizeze experiența de vizualizare a notelor.
              </p>
              <div className="callout">
                <p><strong>Limitări tehnice și juridice importante:</strong></p>
                <ul>
                  <li><strong>Lipsa de afiliere:</strong> Proiectul nu are nicio legătură administrativă sau juridică cu Universitatea „Ștefan cel Mare” din Suceava.</li>
                  <li><strong>Acuratețea datelor:</strong> Datele afișate sunt preluate în timp real din sistemul PeopleSoft original. În caz de neconcordanțe sau erori de parsare, datele oficiale din registrul universității rămân singura sursă de adevăr incontestabilă.</li>
                  <li><strong>Securitatea locală:</strong> Deși conexiunea este criptată cap-la-cap (HTTPS), utilizatorul este direct responsabil de securitatea dispozitivului propriu de pe care se autentifică.</li>
                </ul>
              </div>
            </section>

            {/* Section 3 */}
            <section className="section">
              <h2>3. Limitarea Răspunderii Dezvoltatorului</h2>
              <p>
                În limitele permise de legea aplicabilă, autorul și dezvoltatorul acestui proiect <strong>nu pot fi trași la răspundere</strong> sub nicio formă pentru:
              </p>
              <ul>
                <li>Orice daune directe, indirecte, accidentale sau speciale rezultate din utilizarea sau imposibilitatea de utilizare a platformei.</li>
                <li>Întreruperi ale serviciului, erori de conexiune VPN cu rețeaua universității, pierderi temporare de acces sau blocări ale contului de student survenite în urma politicilor de securitate ale universității.</li>
                <li>Modificări ale structurii platformei oficiale USV care pot dezactiva parțial sau total funcționalitățile acestui portal.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="section">
              <h2>4. Proprietate Intelectuală & Open-Source</h2>
              <p>
                Codul sursă al platformei este public și disponibil sub <strong>Licența MIT</strong>. Utilizatorii au libertatea de a audita, modifica sau rula instanțe proprii ale acestui serviciu pe servere locale pentru a beneficia de control complet și transparență totală asupra modului de procesare a datelor.
              </p>
            </section>

            {/* Section 5 */}
            <section className="section">
              <h2>5. Modificări ale Termenilor</h2>
              <p>
                Deoarece infrastructura universității și tehnologiile web evoluează, acești termeni pot fi actualizați periodic pentru a reflecta noile realități de securitate și funcționalitate. Continuarea utilizării platformei după publicarea modificărilor constituie acceptarea implicită a noilor termeni.
              </p>
            </section>

            <div className="divider" />

            <footer className="doc-footer">
              <Link href="/" legacyBehavior>
                <a className="btn-back">← Înapoi la autentificare</a>
              </Link>
              <Link href="/privacy" legacyBehavior>
                <a className="btn-back">Politică de Confidențialitate</a>
              </Link>
            </footer>

          </article>
        </main>
      </div>
    </>
  );
}
