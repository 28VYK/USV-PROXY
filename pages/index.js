import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [grades, setGrades] = useState([]);
  const [studentName, setStudentName] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  useEffect(() => {
    window.hoverLightTR = () => {};
    window.hoverOffTR = () => {};
    window.setupTimeout = () => {};
    window.cancelBubble = true;
  }, []);

  const extractGrades = (html) => {
    const gradesData = [];
    
    const nameMatch = html.match(/VICHIRIUC[^<]*/);
    if (nameMatch) setStudentName(nameMatch[0].trim());

    const yearMatch = html.match(/An academic\s*(\d{4}-\d{4})/i);
    if (yearMatch) setAcademicYear(yearMatch[1]);

    const tableRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
    const rows = html.match(tableRegex) || [];
    
    rows.forEach(row => {
      if (row.includes('FSEAP') || row.includes('SM1')) {
        const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const cells = [];
        let match;
        
        while ((match = cellRegex.exec(row)) !== null) {
          let content = match[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&#037;/g, '%')
            .replace(/&#0?37;/g, '%')
            .replace(/&amp;/g, '&')
            .replace(/\s+/g, ' ')
            .trim();
          cells.push(content);
        }
        
        if (cells.length >= 5 && cells.some(c => c.includes('SM1') || c.includes('%'))) {
          gradesData.push({
            titlu: cells[3] || '',
            sesiune: cells[2] || '',
            pondere: cells[4] || '',
            notaCurs: cells[5] || '',
            notaSeminar: cells[6] || '',
            notaFinala: cells[7] || '',
            credite: cells[8] || '',
            puncte: cells[9] || ''
          });
        }
      }
    });
    
    return gradesData;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid, password }),
      });

      const data = await response.json();

      if (data.success) {
        setLoggedIn(true);
        setResult(data);
        await fetchGrades(data.cookies);
      } else {
        setError(data.error || 'Autentificare eșuată');
      }
    } catch (err) {
      setError('Eroare de conexiune');
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async (cookies) => {
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: '/psc/PT90SYS/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_SSENRL_GRADE.GBL',
          cookies 
        }),
      });

      const data = await response.json();
      if (data.success && data.html) {
        const extractedGrades = extractGrades(data.html);
        setGrades(extractedGrades);
      }
    } catch (err) {
      console.error('Failed to fetch grades:', err);
    }
  };

  return (
    <>
      <Head>
        <title>Portal Student USV</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <div className="logo">
              <div className="logo-icon">USV</div>
              <span>Portal Student</span>
            </div>
            {loggedIn && (
              <button onClick={() => { setLoggedIn(false); setResult(null); setGrades([]); }} className="btn-logout">
                Deconectare
              </button>
            )}
          </div>
        </header>

        <main className="main">
          {!loggedIn ? (
            <div className="login-section">
              <div className="login-card">
                <div className="login-header">
                  <h1>Autentificare</h1>
                  <p>Introdu datele tale de acces pentru a vizualiza notele</p>
                </div>
                
                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleLogin}>
                  <div className="field">
                    <label>Utilizator</label>
                    <input
                      type="text"
                      value={userid}
                      onChange={(e) => setUserid(e.target.value)}
                      placeholder="PRENUME.NUME"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="field">
                    <label>Parolă</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                  </div>

                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Se conectează...' : 'Conectare'}
                  </button>
                </form>

                <div className="login-footer">
                  <div className="disclaimer">
                    <p><strong>⚠️ Atenție:</strong></p>
                    <ul>
                      <li>Acest proiect <strong>NU este afiliat</strong> cu Universitatea Ștefan cel Mare Suceava.</li>
                      <li><strong>Nu stocăm</strong> parolele, datele personale sau notele tale.</li>
                      <li>Datele sunt transmise direct către serverul universității.</li>
                      <li>Proiect open-source în scop educațional.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="dashboard">
              <div className="dashboard-header">
                <div>
                  <h1>Bun venit, {studentName || userid}</h1>
                  <p className="subtitle">{academicYear ? `An universitar ${academicYear}` : 'Vizualizare situație școlară'}</p>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2>Situație Note</h2>
                  <button onClick={() => fetchGrades(result?.cookies)} className="btn-secondary" disabled={loading}>
                    {loading ? 'Se actualizează...' : 'Actualizează'}
                  </button>
                </div>

                {loading ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Se încarcă datele...</p>
                  </div>
                ) : grades.length > 0 ? (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Disciplină</th>
                          <th>Sesiune</th>
                          <th>Pondere</th>
                          <th>Curs</th>
                          <th>Seminar</th>
                          <th>Final</th>
                          <th>Credite</th>
                          <th>Puncte</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grades.map((grade, i) => (
                          <tr key={i}>
                            <td className="course">{grade.titlu}</td>
                            <td>{grade.sesiune}</td>
                            <td className="muted">{grade.pondere}</td>
                            <td>{grade.notaCurs || '—'}</td>
                            <td>{grade.notaSeminar || '—'}</td>
                            <td className={`final ${parseFloat(grade.notaFinala) >= 5 ? 'pass' : parseFloat(grade.notaFinala) ? 'fail' : ''}`}>
                              {grade.notaFinala || '—'}
                            </td>
                            <td>{grade.credite || '—'}</td>
                            <td className="points">{grade.puncte || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>Nu am putut încărca notele. Încearcă din nou.</p>
                    <button onClick={() => fetchGrades(result?.cookies)} className="btn-secondary">Reîncearcă</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        <footer className="footer">
          <p>Proiect independent • Nu este afiliat cu USV • Nu stocăm date</p>
          <p className="footer-small">Cod sursă disponibil public • Scop educațional</p>
        </footer>
      </div>

      <style jsx>{`
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: #f5f7fa;
          color: #1a1a2e;
        }

        .header {
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
          padding: 0 24px;
          height: 64px;
          display: flex;
          align-items: center;
        }

        .header-content {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 600;
          font-size: 16px;
          color: #374151;
        }

        .logo-icon {
          background: #1e40af;
          color: #fff;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
        }

        .main {
          flex: 1;
          padding: 32px 24px;
        }

        /* Login */
        .login-section {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: calc(100vh - 180px);
        }

        .login-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          padding: 40px;
          width: 100%;
          max-width: 400px;
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-header h1 {
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 8px;
          color: #111827;
        }

        .login-header p {
          color: #6b7280;
          font-size: 14px;
          margin: 0;
        }

        .field {
          margin-bottom: 20px;
        }

        .field label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }

        .field input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 15px;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }

        .field input:focus {
          outline: none;
          border-color: #1e40af;
          box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
        }

        .field input::placeholder {
          color: #9ca3af;
        }

        .btn-primary {
          width: 100%;
          padding: 12px;
          background: #1e40af;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }

        .btn-primary:hover:not(:disabled) {
          background: #1e3a8a;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          padding: 8px 16px;
          background: #fff;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .btn-logout {
          padding: 8px 16px;
          background: transparent;
          color: #6b7280;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .btn-logout:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .alert {
          padding: 12px 14px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .alert-error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .login-footer {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
        }

        .login-footer p {
          font-size: 12px;
          color: #9ca3af;
          margin: 0;
        }

        .disclaimer {
          background: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          padding: 14px;
          text-align: left;
        }

        .disclaimer p {
          font-size: 13px;
          color: #92400e;
          margin: 0 0 8px 0;
        }

        .disclaimer ul {
          margin: 0;
          padding-left: 20px;
          font-size: 12px;
          color: #78350f;
        }

        .disclaimer li {
          margin: 4px 0;
        }

        .footer-small {
          font-size: 11px !important;
          margin-top: 4px !important;
          opacity: 0.7;
        }

        /* Dashboard */
        .dashboard {
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-header {
          margin-bottom: 24px;
        }

        .dashboard-header h1 {
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 4px;
          color: #111827;
        }

        .subtitle {
          color: #6b7280;
          font-size: 14px;
          margin: 0;
        }

        .card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .card-header h2 {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          color: #111827;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #f9fafb;
          padding: 12px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e5e7eb;
        }

        td {
          padding: 16px;
          font-size: 14px;
          color: #374151;
          border-bottom: 1px solid #f3f4f6;
        }

        tr:last-child td {
          border-bottom: none;
        }

        tr:hover td {
          background: #f9fafb;
        }

        .course {
          font-weight: 500;
          color: #111827;
          max-width: 280px;
        }

        .muted {
          color: #9ca3af;
          font-size: 13px;
        }

        .final {
          font-weight: 600;
        }

        .final.pass {
          color: #059669;
        }

        .final.fail {
          color: #dc2626;
        }

        .points {
          font-weight: 600;
          color: #1e40af;
        }

        .loading-state, .empty-state {
          padding: 60px 24px;
          text-align: center;
          color: #6b7280;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #1e40af;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .footer {
          padding: 24px;
          text-align: center;
          color: #9ca3af;
          font-size: 13px;
          border-top: 1px solid #e5e7eb;
          background: #fff;
        }

        .footer p {
          margin: 0;
        }

        @media (max-width: 768px) {
          .login-card { padding: 24px; }
          .card-header { padding: 16px; flex-direction: column; gap: 12px; align-items: flex-start; }
          th, td { padding: 12px 10px; font-size: 13px; }
          .course { max-width: 150px; }
        }
      `}</style>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-font-smoothing: antialiased; }
      `}</style>
    </>
  );
}
