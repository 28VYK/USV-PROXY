import Head from 'next/head';
import Link from 'next/link';

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Confidențialitate & Disclaimer - Portal Student USV</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="app">
        {/* Ambient Glow Blobs */}
        <div className="glow-blob glow-blob-1"></div>
        <div className="glow-blob glow-blob-2"></div>

        {/* Header */}
        <header className="header">
          <div className="logo">
            <span className="logo-highlight">USV</span>
            <span className="logo-text">Proxy</span>
          </div>
        </header>

        <main className="main">
          <section className="privacy-card">
            <div className="privacy-header">
              <span className="eyebrow">Transparență Totală</span>
              <h1>Politică de Confidențialitate & Disclaimer</h1>
              <p>Informații importante despre securitatea datelor tale și modul în care funcționează acest proiect.</p>
            </div>

            <div className="privacy-body">
              <div className="section-block">
                <h2>1. Caracterul Neoficial al Soluției</h2>
                <p>
                  Această aplicație este un <strong>proiect independent (Proof of Concept)</strong> și nu este afiliat, asociat, autorizat, susținut sau în vreun fel legat oficial de Universitatea „Ștefan cel Mare” din Suceava (USV).
                </p>
                <p>
                  Scopul acestui proxy este de a oferi o interfață modernă, rapidă și adaptată pentru dispozitive mobile pentru portalul studențesc (PeopleSoft), ocolind limitările tehnice și de design ale platformei originale.
                </p>
              </div>

              <div className="section-block">
                <h2>2. Cum sunt gestionate datele tale</h2>
                <div className="data-flow-box">
                  <div className="data-flow-step">
                    <span className="step-num">1</span>
                    <p>Introduci datele în browserul tău local.</p>
                  </div>
                  <div className="data-flow-step">
                    <span className="step-num">2</span>
                    <p>Serverul nostru (Proxy) le trimite direct către scolaritate.usv.ro prin VPN-ul universitar.</p>
                  </div>
                  <div className="data-flow-step">
                    <span className="step-num">3</span>
                    <p>USV întoarce notele tale, iar serverul le formatează și le trimite înapoi în browserul tău.</p>
                  </div>
                </div>
                <p>
                  Serverul proxy este <strong>stateless</strong>: nu deține o bază de date cu studenți sau parole și nu stochează parolele sau datele tale cu caracter personal pe disc. Tranzitul datelor prin proxy este necesar exclusiv pentru că serverul USV nu acceptă conexiuni directe din afara rețelei universitare decât printr-un VPN pe care proxy-ul îl are configurat intern.
                </p>
              </div>

              <div className="section-block warning-box">
                <h2>3. Criptarea Conexiunii (HTTPS) & Recomandări de Securitate</h2>
                <p>
                  În prezent, această instanță folosește domeniul securizat <strong>https://noteusv.tech</strong>. Conexiunea dintre browserul tău și serverul proxy este complet criptată (SSL/TLS) prin intermediul rețelei securizate Cloudflare.
                </p>
                <p><strong>Recomandări:</strong></p>
                <ul>
                  <li>Chiar dacă conexiunea este criptată, este întotdeauna o bună practică să fii prudent când introduci date de conectare.</li>
                  <li>Nu activa opțiunea „Ține minte utilizatorul” dacă folosești un calculator public sau partajat cu alte persoane.</li>
                  <li>Proiectul este open-source, oferind transparență totală. Dacă dorești un nivel suplimentar de control, poți clona repository-ul și rula serverul local pe calculatorul tău.</li>
                </ul>
              </div>

              <div className="section-block">
                <h2>4. Declinarea Răspunderii (Disclaimer)</h2>
                <p>
                  Serviciul este furnizat „ca atare” (as is), fără niciun fel de garanție explicită sau implicită. Autorul proiectului nu își asumă răspunderea pentru:
                </p>
                <ul>
                  <li>Eventuale erori, indisponibilitate a serverelor sau disfuncționalități ale platformei USV.</li>
                  <li>Orice incident de securitate cauzat de utilizarea pe conexiuni necriptate sau rețele Wi-Fi publice.</li>
                  <li>Orice blocare a contului ca urmare a utilizării repetate sau incorecte a API-ului de login.</li>
                </ul>
              </div>
            </div>

            <div className="privacy-footer">
              <Link href="/" className="btn-back">
                ← Înapoi la Autentificare
              </Link>
            </div>
          </section>
        </main>
      </div>

      <style jsx>{`
        .app {
          --ink: #0f172a;
          --text: #334155;
          --muted: #64748b;
          --line: #e2e8f0;
          --line-strong: #cbd5e1;
          --paper: #ffffff;
          --surface: #f8fafc;
          --surface-strong: #f1f5f9;
          --blue: #4f46e5;
          --blue-dark: #3730a3;
          --amber: #f59e0b;
          --amber-dark: #b45309;
          
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
          color: var(--text);
          position: relative;
          overflow-x: hidden;
        }

        .glow-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(130px);
          opacity: 0.4;
          z-index: 1;
          pointer-events: none;
          mix-blend-mode: multiply;
          animation: pulse 10s ease-in-out infinite alternate;
        }

        .glow-blob-1 {
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.45) 0%, rgba(139, 92, 246, 0) 70%);
          top: -10%;
          left: 10%;
        }

        .glow-blob-2 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, rgba(236, 72, 153, 0) 70%);
          bottom: 10%;
          right: 15%;
        }

        @keyframes pulse {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(20px) scale(1.05); }
        }

        .header {
          position: relative;
          margin: 24px auto 0;
          width: max-content;
          min-width: 200px;
          height: 56px;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 99px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 24px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          z-index: 100;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 1);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 20px;
          letter-spacing: -0.04em;
          user-select: none;
        }

        .logo-highlight {
          font-weight: 700;
          color: #0f172a;
        }

        .logo-text {
          font-weight: 500;
          color: #64748b;
        }

        .main {
          flex: 1;
          padding: 40px 24px;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          box-sizing: border-box;
          position: relative;
          z-index: 2;
        }

        .privacy-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 50px rgba(15, 23, 42, 0.06), 
                      inset 0 1px 0 rgba(255, 255, 255, 0.6);
        }

        .privacy-header {
          margin-bottom: 32px;
          text-align: left;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          padding: 0 10px;
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 999px;
          color: var(--blue);
          background: rgba(99, 102, 241, 0.05);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 12px;
          font-family: 'Space Grotesk', sans-serif;
        }

        .privacy-header h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 32px;
          font-weight: 900;
          color: var(--ink);
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin-bottom: 12px;
        }

        .privacy-header p {
          color: var(--muted);
          font-size: 15px;
          line-height: 1.5;
          font-weight: 500;
        }

        .privacy-body {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .section-block h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 18px;
          font-weight: 800;
          color: var(--ink);
          margin-bottom: 12px;
          letter-spacing: -0.01em;
        }

        .section-block p {
          font-size: 14.5px;
          line-height: 1.6;
          color: var(--text);
          margin-bottom: 10px;
        }

        .section-block p:last-child {
          margin-bottom: 0;
        }

        .section-block ul {
          padding-left: 20px;
          margin-top: 8px;
        }

        .section-block li {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text);
          margin-bottom: 8px;
        }

        .warning-box {
          background: rgba(245, 158, 11, 0.06);
          border: 1px solid rgba(245, 158, 11, 0.2);
          padding: 24px;
          border-radius: 16px;
        }

        .warning-box h2 {
          color: var(--amber-dark);
        }

        .warning-box li strong {
          color: #78350f;
        }

        .data-flow-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 16px 0;
          background: rgba(15, 23, 42, 0.02);
          border: 1px solid var(--line);
          padding: 20px;
          border-radius: 16px;
        }

        .data-flow-step {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .step-num {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--blue);
          color: white;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .data-flow-step p {
          font-size: 13.5px;
          line-height: 1.45;
          margin: 0;
          color: var(--text);
          font-weight: 500;
        }

        .privacy-footer {
          margin-top: 40px;
          border-top: 1px solid var(--line);
          padding-top: 24px;
          display: flex;
          justify-content: flex-start;
        }

        .btn-back {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 20px;
          background: var(--paper);
          color: var(--ink);
          text-decoration: none;
          border: 1px solid var(--line);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(15, 23, 42, 0.02);
        }

        .btn-back:hover {
          background: var(--surface-strong);
          border-color: var(--line-strong);
          transform: translateY(-1px);
        }

        @media (max-width: 640px) {
          .privacy-card {
            padding: 24px 16px;
          }

          .privacy-header h1 {
            font-size: 26px;
          }

          .main {
            padding: 20px 12px;
          }
        }
      `}</style>
    </>
  );
}
