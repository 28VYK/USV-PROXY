import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';

const SEMESTER_OPTIONS = [
  { value: 'all', label: 'Toate' },
  { value: 'SEM 1', label: 'SEM 1' },
  { value: 'SEM 2', label: 'SEM 2' }
];

const SEMESTER_ORDER = {
  'SEM 1': 1,
  'SEM 2': 2
};

function normalizeGradeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function detectSemester(cells) {
  const text = normalizeGradeText(cells.join(' '));

  if (/\b(?:SEM(?:ESTRUL)?\.?|SM)\s*1\b/.test(text)) {
    return 'SEM 1';
  }

  if (/\b(?:SEM(?:ESTRUL)?\.?|SM)\s*2\b/.test(text)) {
    return 'SEM 2';
  }

  return '';
}

function getSemesterOrder(semester) {
  return SEMESTER_ORDER[semester] || 99;
}

export default function Home() {
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [grades, setGrades] = useState([]);
  const [studentName, setStudentName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');

  useEffect(() => {
    window.hoverLightTR = () => {};
    window.hoverOffTR = () => {};
    window.setupTimeout = () => {};
    window.cancelBubble = true;

    const savedUser = localStorage.getItem('usv_userid');
    const savedPass = localStorage.getItem('usv_password');
    const savedRemember = localStorage.getItem('usv_remember') === 'true';

    if (savedUser && savedPass && savedRemember) {
      setUserid(savedUser);
      setPassword(savedPass);
      setRememberMe(true);
      
      const performAutoLogin = async () => {
        setLoading(true);
        try {
          const loginRes = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userid: savedUser, password: savedPass }),
          });
          const loginData = await loginRes.json();
          
          if (loginData.success) {
            setLoggedIn(true);
            setResult(loginData);
            
            try {
              const proxyRes = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  url: '/psc/PT90SYS/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_SSENRL_GRADE.GBL',
                  cookies: loginData.cookies 
                }),
              });
              const proxyData = await proxyRes.json();
              if (proxyData.success && proxyData.html) {
                const extractedGrades = extractGrades(proxyData.html);
                setGrades(extractedGrades);
              }
            } catch (err) {
              console.error('Failed to auto-fetch grades:', err);
            }
          } else {
            localStorage.removeItem('usv_userid');
            localStorage.removeItem('usv_password');
            localStorage.removeItem('usv_remember');
            setError(loginData.error || 'Autentificare eșuată');
          }
        } catch (err) {
          setError('Eroare de conexiune la auto-autentificare');
        } finally {
          setLoading(false);
          setIsInitializing(false);
        }
      };

      performAutoLogin();
    } else {
      setIsInitializing(false);
    }

    const savedSemester = localStorage.getItem('usv_semester');
    if (savedSemester) {
      setSemesterFilter(savedSemester);
    }
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
      const normalizedRow = normalizeGradeText(row);

      if (normalizedRow.includes('FSEAP') || /\b(?:SEM(?:ESTRUL)?\.?|SM)\s*[12]\b/.test(normalizedRow)) {
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
        
        const semester = detectSemester(cells);

        if (cells.length >= 5 && (semester || cells.some(c => c.includes('%')))) {
          gradesData.push({
            titlu: cells[3] || '',
            sesiune: cells[2] || '',
            semester,
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

  const semesterCounts = useMemo(() => {
    return grades.reduce((counts, grade) => {
      if (grade.semester) {
        counts[grade.semester] = (counts[grade.semester] || 0) + 1;
      }

      return counts;
    }, {});
  }, [grades]);

  const displayedGrades = useMemo(() => {
    return grades
      .map((grade, index) => ({ ...grade, originalIndex: index }))
      .filter(grade => semesterFilter === 'all' || grade.semester === semesterFilter)
      .sort((a, b) => {
        const semesterDifference = getSemesterOrder(a.semester) - getSemesterOrder(b.semester);

        if (semesterDifference !== 0) {
          return semesterDifference;
        }

        return a.originalIndex - b.originalIndex;
      });
  }, [grades, semesterFilter]);

  const activeSemesterLabel = SEMESTER_OPTIONS.find(option => option.value === semesterFilter)?.label || 'Toate';

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
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
        if (rememberMe) {
          localStorage.setItem('usv_userid', userid);
          localStorage.setItem('usv_password', password);
          localStorage.setItem('usv_remember', 'true');
        } else {
          localStorage.removeItem('usv_userid');
          localStorage.removeItem('usv_password');
          localStorage.removeItem('usv_remember');
        }
        await fetchGrades(data.cookies);
      } else {
        setError(data.error || 'Autentificare eșuată');
        if (rememberMe) {
          localStorage.removeItem('usv_userid');
          localStorage.removeItem('usv_password');
          localStorage.removeItem('usv_remember');
        }
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
        <header className="header">
          <div className="header-content">
            <div className="logo">
              <div className="logo-icon">USV</div>
              <div className="logo-copy">
                <span>Portal Student</span>
                <small>Proxy local</small>
              </div>
            </div>
            {loggedIn && (
              <button onClick={() => { 
                setLoggedIn(false); 
                setResult(null); 
                setGrades([]); 
                setSemesterFilter('all'); 
                setRememberMe(false);
                setUserid('');
                setPassword('');
                localStorage.removeItem('usv_userid');
                localStorage.removeItem('usv_password');
                localStorage.removeItem('usv_remember');
                localStorage.removeItem('usv_semester');
              }} className="btn-logout">
                Deconectare
              </button>
            )}
          </div>
        </header>

        <main className="main">
          {isInitializing ? (
            <div className="login-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" style={{ marginBottom: '16px' }}></div>
              <p style={{ color: 'var(--muted)', fontWeight: 500, fontSize: '15px' }}>Se verifică sesiunea...</p>
            </div>
          ) : !loggedIn ? (
            <div className="login-section">
              <div className="login-shell">
                <section className="login-card">
                  <div className="login-header">
                    <span className="eyebrow">Acces securizat</span>
                    <h1>Autentificare</h1>
                    <p>Folosește contul USV pentru sesiunea curentă.</p>
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

                    <div className="field-checkbox">
                      <label>
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          disabled={loading}
                        />
                        <span>Ține-mă minte (rămâi conectat)</span>
                      </label>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? 'Se conectează...' : 'Conectare'}
                    </button>
                  </form>
                </section>

                <aside className="trust-panel" aria-label="Detalii proiect">
                  <div className="trust-status">
                    <span className="status-dot"></span>
                    <span>Proxy local activ</span>
                  </div>

                  <div>
                    <h2>Portal curat pentru situația școlară.</h2>
                    <p>Datele sunt preluate direct din platforma universității, fără stocare locală.</p>
                  </div>

                  <div className="trust-list">
                    <div>
                      <strong>Fără parole salvate</strong>
                      <span>Credențialele sunt folosite doar pentru autentificarea sesiunii.</span>
                    </div>
                    <div>
                      <strong>Independent</strong>
                      <span>Proiect open-source, neafiliat oficial cu USV.</span>
                    </div>
                    <div>
                      <strong>Compatibil modern</strong>
                      <span>Acces prin browser actual, cu proxy pentru serviciul legacy.</span>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          ) : (
            <div className="dashboard">
              <div className="dashboard-header">
                <div className="dashboard-title">
                  <span className="eyebrow">Situație școlară</span>
                  <h1>{studentName || userid}</h1>
                  <p className="subtitle">{academicYear ? `An universitar ${academicYear}` : 'Sesiune activă'}</p>
                </div>

                <div className="summary-grid">
                  <div className="summary-item">
                    <span>Total</span>
                    <strong>{grades.length}</strong>
                  </div>
                  <div className="summary-item">
                    <span>SEM 1</span>
                    <strong>{semesterCounts['SEM 1'] || 0}</strong>
                  </div>
                  <div className="summary-item">
                    <span>SEM 2</span>
                    <strong>{semesterCounts['SEM 2'] || 0}</strong>
                  </div>
                  <div className="summary-item accent">
                    <span>Afișare</span>
                    <strong>{activeSemesterLabel}</strong>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <h2>Note</h2>
                    <p>{displayedGrades.length} afișate din {grades.length}</p>
                  </div>
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
                  <>
                    <div className="grade-controls">
                      <span className="control-label">Semestru</span>
                      <div className="segmented-control" aria-label="Semestru">
                        {SEMESTER_OPTIONS.map(option => {
                          const count = option.value === 'all' ? grades.length : semesterCounts[option.value] || 0;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              className={semesterFilter === option.value ? 'active' : ''}
                              onClick={() => {
                                setSemesterFilter(option.value);
                                localStorage.setItem('usv_semester', option.value);
                              }}
                              aria-pressed={semesterFilter === option.value}
                            >
                              <span>{option.label}</span>
                              <span className="count">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {displayedGrades.length > 0 ? (
                      <div className="table-wrapper">
                        <table>
                          <thead>
                            <tr>
                              <th>Disciplină</th>
                              <th>Semestru</th>
                              <th>Pondere</th>
                              <th>Curs</th>
                              <th>Seminar</th>
                              <th>Final</th>
                              <th>Credite</th>
                              <th>Puncte</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayedGrades.map((grade) => (
                              <tr key={grade.originalIndex}>
                                <td className="course">{grade.titlu}</td>
                                <td title={grade.sesiune}>
                                  <span className={`semester-pill ${grade.semester ? '' : 'unknown'}`}>
                                    {grade.semester || grade.sesiune || '—'}
                                  </span>
                                </td>
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
                      <div className="empty-state compact">
                        <p>Nu există note pentru {semesterFilter}.</p>
                      </div>
                    )}
                  </>
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
          --ink: #101828;
          --text: #263241;
          --muted: #667085;
          --line: #d9e0ea;
          --line-strong: #c5ceda;
          --paper: #ffffff;
          --surface: #f7f9fc;
          --surface-strong: #edf2f7;
          --blue: #214f8f;
          --blue-dark: #173d70;
          --green: #087443;
          --red: #b42318;
          --amber: #b7791f;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background:
            linear-gradient(180deg, #f8fafc 0%, #eef3f8 48%, #f7f4ef 100%);
          color: var(--text);
        }

        .header {
          background: rgba(255, 255, 255, 0.86);
          border-bottom: 1px solid rgba(217, 224, 234, 0.92);
          padding: 0 28px;
          min-height: 68px;
          display: flex;
          align-items: center;
          backdrop-filter: blur(18px);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .header-content {
          max-width: 1180px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 14px;
          font-weight: 600;
          color: var(--ink);
        }

        .logo-icon {
          background: #172033;
          color: #ffffff;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.16), 0 10px 24px rgba(16, 24, 40, 0.14);
        }

        .logo-copy {
          display: grid;
          gap: 2px;
          line-height: 1.1;
        }

        .logo-copy span {
          font-size: 15px;
          font-weight: 700;
        }

        .logo-copy small {
          color: var(--muted);
          font-size: 12px;
          font-weight: 500;
        }

        .main {
          flex: 1;
          padding: 34px 28px;
          width: 100%;
          box-sizing: border-box;
        }

        .login-section {
          display: grid;
          align-items: center;
          justify-items: center;
          width: 100%;
          min-height: calc(100vh - 210px);
        }

        .login-shell {
          width: 100%;
          max-width: min(980px, 100%);
          min-width: 0;
          box-sizing: border-box;
          display: grid;
          grid-template-columns: minmax(340px, 430px) minmax(0, 1fr);
          gap: 18px;
          align-items: stretch;
        }

        .login-card {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(217, 224, 234, 0.94);
          border-radius: 8px;
          box-shadow: 0 22px 60px rgba(16, 24, 40, 0.11);
          padding: 34px;
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
        }

        .login-header {
          margin-bottom: 28px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          padding: 0 9px;
          border: 1px solid #dbe5ef;
          border-radius: 999px;
          color: var(--blue-dark);
          background: #f2f7fb;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0;
        }

        .login-header h1 {
          font-size: 30px;
          font-weight: 750;
          margin: 16px 0 8px;
          color: var(--ink);
          letter-spacing: 0;
        }

        .login-header p {
          color: var(--muted);
          font-size: 14px;
          margin: 0;
          line-height: 1.55;
        }

        .field {
          margin-bottom: 18px;
        }

        .field label {
          display: block;
          font-size: 13px;
          font-weight: 650;
          color: var(--ink);
          margin-bottom: 8px;
        }

        .field input {
          width: 100%;
          min-height: 46px;
          padding: 12px 13px;
          background: #fbfcfe;
          border: 1px solid var(--line-strong);
          border-radius: 8px;
          font-size: 15px;
          color: var(--ink);
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
          box-sizing: border-box;
        }

        .field input:focus {
          outline: none;
          background: #ffffff;
          border-color: var(--blue);
          box-shadow: 0 0 0 4px rgba(33, 79, 143, 0.12);
        }

        .field input::placeholder {
          color: #98a2b3;
        }

        .field-checkbox {
          margin-bottom: 22px;
          margin-top: -6px;
        }

        .field-checkbox label {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 14px;
          color: var(--text);
          font-weight: 500;
        }

        .field-checkbox input[type="checkbox"] {
          width: 18px;
          height: 18px;
          border: 1px solid var(--line-strong);
          border-radius: 4px;
          accent-color: var(--blue-dark);
          cursor: pointer;
        }

        .btn-primary {
          width: 100%;
          min-height: 46px;
          padding: 12px 16px;
          background: #172033;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 14px 26px rgba(23, 32, 51, 0.18);
          box-sizing: border-box;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0f1726;
          transform: translateY(-1px);
          box-shadow: 0 18px 30px rgba(23, 32, 51, 0.22);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .btn-secondary {
          min-height: 38px;
          padding: 8px 14px;
          background: #ffffff;
          color: var(--ink);
          border: 1px solid var(--line-strong);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 650;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--surface);
          border-color: #aab5c4;
          box-shadow: 0 8px 18px rgba(16, 24, 40, 0.08);
        }

        .btn-logout {
          min-height: 38px;
          padding: 8px 14px;
          background: #ffffff;
          color: var(--text);
          border: 1px solid var(--line);
          border-radius: 8px;
          font-size: 14px;
          font-weight: 650;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }

        .btn-logout:hover {
          background: #fff7ed;
          border-color: #fed7aa;
          color: #9a3412;
        }

        .alert {
          padding: 12px 14px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
          line-height: 1.45;
        }

        .alert-error {
          background: #fff1f0;
          color: #912018;
          border: 1px solid #fecdca;
        }

        .trust-panel {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 26px;
          min-height: 440px;
          padding: 34px;
          color: #ffffff;
          background: linear-gradient(135deg, #162033 0%, #16404a 54%, #274332 100%);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          box-shadow: 0 22px 60px rgba(16, 24, 40, 0.14);
          overflow: hidden;
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
        }

        .trust-status {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          width: fit-content;
          padding: 7px 10px;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
          font-size: 13px;
          font-weight: 650;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #45d483;
          box-shadow: 0 0 0 4px rgba(69, 212, 131, 0.16);
        }

        .trust-panel h2 {
          max-width: 420px;
          font-size: 34px;
          line-height: 1.08;
          font-weight: 760;
          letter-spacing: 0;
          margin: 0 0 12px;
        }

        .trust-panel p {
          max-width: 460px;
          color: rgba(255,255,255,0.76);
          font-size: 15px;
          line-height: 1.65;
          margin: 0;
        }

        .trust-list {
          display: grid;
          gap: 0;
          border-top: 1px solid rgba(255,255,255,0.15);
        }

        .trust-list div {
          display: grid;
          gap: 4px;
          padding: 16px 0;
          border-bottom: 1px solid rgba(255,255,255,0.12);
        }

        .trust-list div:last-child {
          border-bottom: 0;
        }

        .trust-list strong {
          color: #ffffff;
          font-size: 14px;
          font-weight: 720;
        }

        .trust-list span {
          color: rgba(255,255,255,0.68);
          font-size: 13px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .dashboard {
          max-width: 1180px;
          margin: 0 auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 24px;
          margin-bottom: 22px;
        }

        .dashboard-title {
          display: grid;
          gap: 8px;
        }

        .dashboard-header h1 {
          font-size: 30px;
          font-weight: 760;
          margin: 0;
          color: var(--ink);
          letter-spacing: 0;
        }

        .subtitle {
          color: var(--muted);
          font-size: 14px;
          margin: 0;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(94px, 1fr));
          min-width: min(100%, 520px);
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid var(--line);
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 12px 28px rgba(16, 24, 40, 0.08);
        }

        .summary-item {
          display: grid;
          gap: 5px;
          padding: 14px 16px;
          border-right: 1px solid var(--line);
        }

        .summary-item:last-child {
          border-right: 0;
        }

        .summary-item span {
          color: var(--muted);
          font-size: 12px;
          font-weight: 650;
        }

        .summary-item strong {
          color: var(--ink);
          font-size: 20px;
          font-weight: 760;
          line-height: 1;
          letter-spacing: 0;
        }

        .summary-item.accent strong {
          color: var(--blue);
          font-size: 16px;
        }

        .card {
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid var(--line);
          border-radius: 8px;
          box-shadow: 0 18px 42px rgba(16, 24, 40, 0.1);
          overflow: hidden;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          padding: 22px 24px;
          border-bottom: 1px solid var(--line);
          background: #ffffff;
        }

        .card-title {
          display: grid;
          gap: 4px;
        }

        .card-header h2 {
          font-size: 20px;
          font-weight: 760;
          margin: 0;
          color: var(--ink);
          letter-spacing: 0;
        }

        .card-title p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
        }

        .table-wrapper {
          overflow-x: auto;
          background: #ffffff;
        }

        .grade-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 14px 24px;
          border-bottom: 1px solid var(--line);
          background: #fbfcfe;
        }

        .control-label {
          color: var(--muted);
          font-size: 13px;
          font-weight: 700;
        }

        .segmented-control {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px;
          background: var(--surface-strong);
          border: 1px solid var(--line);
          border-radius: 8px;
        }

        .segmented-control button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 34px;
          min-width: 78px;
          padding: 7px 12px;
          background: transparent;
          color: var(--text);
          border: 0;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, box-shadow 0.15s;
          white-space: nowrap;
        }

        .segmented-control button:hover {
          color: var(--ink);
        }

        .segmented-control button.active {
          background: #ffffff;
          color: var(--blue);
          box-shadow: 0 1px 3px rgba(16, 24, 40, 0.12);
        }

        .count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          background: #dbe2eb;
          color: var(--text);
          border-radius: 999px;
          font-size: 12px;
          font-weight: 760;
          line-height: 1;
        }

        .segmented-control button.active .count {
          background: #dceafa;
          color: var(--blue);
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #f5f7fa;
          padding: 13px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 760;
          color: #5d6b7d;
          text-transform: none;
          letter-spacing: 0;
          border-bottom: 1px solid var(--line);
          white-space: nowrap;
        }

        td {
          padding: 15px 16px;
          font-size: 14px;
          color: var(--text);
          border-bottom: 1px solid #edf1f6;
          vertical-align: middle;
        }

        tr:last-child td {
          border-bottom: none;
        }

        tbody tr:nth-child(even) td {
          background: #fcfdff;
        }

        tr:hover td {
          background: #f5f9fd;
        }

        .course {
          font-weight: 650;
          color: var(--ink);
          max-width: 340px;
          line-height: 1.42;
        }

        .semester-pill {
          display: inline-flex;
          align-items: center;
          min-width: 58px;
          justify-content: center;
          padding: 5px 9px;
          background: #edf7f2;
          color: var(--green);
          border: 1px solid #cce8d8;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 760;
          line-height: 1.2;
          white-space: nowrap;
        }

        .semester-pill.unknown {
          background: #f3f5f8;
          color: var(--muted);
          border-color: #e2e7ee;
        }

        .muted {
          color: #7b8794;
          font-size: 13px;
        }

        .final {
          font-weight: 760;
        }

        .final.pass {
          color: var(--green);
        }

        .final.fail {
          color: var(--red);
        }

        .points {
          font-weight: 760;
          color: var(--blue);
        }

        .loading-state, .empty-state {
          padding: 60px 24px;
          text-align: center;
          color: var(--muted);
        }

        .empty-state.compact {
          padding: 32px 24px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #dbe2eb;
          border-top-color: var(--blue);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .footer {
          padding: 22px 28px;
          text-align: center;
          color: #7b8794;
          font-size: 12px;
          border-top: 1px solid rgba(217, 224, 234, 0.86);
          background: rgba(255,255,255,0.74);
        }

        .footer p {
          margin: 0;
        }

        .footer-small {
          font-size: 11px !important;
          margin-top: 4px !important;
          opacity: 0.72;
        }

        @media (max-width: 768px) {
          .header { padding: 0 18px; }
          .main { padding: 22px 16px; }
          .login-section { align-items: start; }
          .login-shell { grid-template-columns: minmax(0, 1fr); max-width: 100%; }
          .login-card, .trust-panel { padding: 24px; }
          .trust-panel { min-height: auto; }
          .trust-panel h2 { font-size: 26px; }
          .dashboard-header { align-items: stretch; flex-direction: column; }
          .dashboard-header h1 { font-size: 24px; }
          .summary-grid { grid-template-columns: repeat(2, 1fr); min-width: 0; width: 100%; }
          .summary-item:nth-child(2) { border-right: 0; }
          .summary-item:nth-child(1), .summary-item:nth-child(2) { border-bottom: 1px solid var(--line); }
          .card-header { padding: 18px 16px; flex-direction: column; gap: 12px; align-items: stretch; }
          .grade-controls { padding: 12px 16px; align-items: flex-start; flex-direction: column; overflow-x: auto; }
          .segmented-control { width: max-content; }
          th, td { padding: 12px 10px; font-size: 13px; }
          .course { max-width: 190px; }
        }
      `}</style>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-font-smoothing: antialiased; }
      `}</style>
    </>
  );
}
