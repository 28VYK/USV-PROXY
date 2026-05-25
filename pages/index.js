import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';

const SEMESTER_OPTIONS = [
  { value: 'all', label: 'Toate' },
  { value: 'SEM 1', label: 'SEM 1' },
  { value: 'SEM 2', label: 'SEM 2' }
];

function normalizeGradeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function detectFilterCategory(cells) {
  const text = normalizeGradeText(cells.join(' '));
  const sesiune = normalizeGradeText(cells[2] || '');

  if (sesiune.includes('1') || /\b1\b/.test(sesiune) || /\b(?:SEM(?:ESTRUL)?\.?|SM|SR)\s*1\b/.test(text)) {
    return 'SEM 1';
  }
  if (sesiune.includes('2') || /\b2\b/.test(sesiune) || /\b(?:SEM(?:ESTRUL)?\.?|SM|SR)\s*2\b/.test(text)) {
    return 'SEM 2';
  }
  return 'OTHER';
}

const SEMESTER_ORDER = {
  'SEM 1': 1,
  'SEM 2': 2,
  'OTHER': 3
};

function getSemesterOrder(semester) {
  return SEMESTER_ORDER[semester] || 99;
}

/**
 * Convert a 4-digit STRM code to a human-readable academic year label.
 * e.g. '2024' → '2024-2025'
 */
function strmToYearLabel(strm) {
  const y = parseInt(strm, 10);
  return isNaN(y) ? strm : `${y}-${y + 1}`;
}

/**
 * Extract PeopleSoft session context from a grades page HTML string.
 * Parses the strCurrUrl JS variable that PeopleSoft injects into every page.
 * Returns { emplid, acadCareer, institution, currentStrm } or null.
 */
function extractPsContextFromHtml(html) {
  try {
    const m = html.match(/strCurrUrl\s*=\s*['"](https?:[^'"]+)['"]/i);
    if (!m) return null;
    const qs = (m[1].split('?')[1] || '').replace(/&amp;/g, '&');
    const p = new URLSearchParams(qs);
    const strm = p.get('STRM');
    const emplid = p.get('EMPLID');
    const acadCareer = p.get('ACAD_CAREER');
    const institution = p.get('INSTITUTION') || 'USV';
    if (!emplid || !acadCareer || !strm) return null;
    return { emplid, acadCareer, institution, currentStrm: strm };
  } catch {
    return null;
  }
}

function parseGradesFromHtml(html) {
  const gradesData = [];

  const tableRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const rows = html.match(tableRegex) || [];

  rows.forEach(row => {
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
    
    // A valid grade row typically has at least 5 columns
    if (cells.length >= 5) {
      const filterCategory = detectFilterCategory(cells);
      // Ensure it's not a generic layout row by checking for category, percentage symbol, or FSEAP identifier
      if (filterCategory !== 'OTHER' || cells.some(c => c.includes('%')) || /FSEAP/i.test(cells.join(' '))) {
        gradesData.push({
          titlu: cells[3] || '',
          sesiune: cells[2] || '',
          filterCategory,
          pondere: cells[4] || '',
          notaCurs: cells[5] || '',
          notaSeminar: cells[6] || '',
          notaFinala: cells[7] || '',
          credite: cells[8] || '',
          puncte: cells[9] || '',
        });
      }
    }
  });

  return { grades: gradesData };
}

/**
 * Format a raw USV userid (e.g. "PRENUME.NUME1", "prenume.nume@student.usv.ro")
 * into a human-readable display name (e.g. "Prenume Nume").
 */
function formatUseridAsName(uid) {
  const base = (uid || '').split('@')[0]; // strip email domain
  return base
    .split('.')
    .map(part => {
      const nameOnly = part.replace(/\d+$/, ''); // strip trailing digits
      if (!nameOnly) return '';
      return nameOnly.charAt(0).toUpperCase() + nameOnly.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(' ');
}

/**
 * PeopleSoft page titles that should never be treated as the student name.
 * These come from the h1 / title of grade-related pages.
 */
const PS_PAGE_TITLE_PATTERN = /vizualiz|notelor|my grade|sign.in|portal|bun\s*venit|oracle|peoplesoft/i;

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
  const [showDonateModal, setShowDonateModal] = useState(false);

  // Multi-year support
  const [psContext, setPsContext] = useState(null);        // { emplid, acadCareer, institution, currentStrm }
  const [yearData, setYearData] = useState({});            // { strm: grades[] }
  const [selectedYear, setSelectedYear] = useState('');    // Currently shown STRM
  const [loadingYears, setLoadingYears] = useState(false); // Background year discovery in progress

  // Theme state
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('usv_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  };

  useEffect(() => {
    window.hoverLightTR = () => {};
    window.hoverOffTR = () => {};
    window.setupTimeout = () => {};
    window.cancelBubble = true;
    
    // Initialize Theme
    const savedTheme = localStorage.getItem('usv_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }

    // Clean up legacy saved passwords from previous versions for security
    if (localStorage.getItem('usv_password')) {
      localStorage.removeItem('usv_password');
    }

    const savedUser = localStorage.getItem('usv_userid');
    const savedRemember = localStorage.getItem('usv_remember') === 'true';

    if (savedUser && savedRemember) {
      setUserid(savedUser);
      setRememberMe(true);
    }
    setIsInitializing(false);

    const savedSemester = localStorage.getItem('usv_semester');
    if (savedSemester) {
      setSemesterFilter(savedSemester);
    }
  }, []);

  useEffect(() => {
    if (loggedIn) {
      window.scrollTo(0, 0);
    }
  }, [loggedIn]);

  useEffect(() => {
    if (!loggedIn || !userid) return;

    const sendHeartbeat = () => {
      fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid }),
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [loggedIn, userid]);

  /**
   * Wrapper around parseGradesFromHtml that also updates React state
   * for student name and PS context (side effects kept here, out of pure fn).
   */
  const extractGrades = (html) => {
    const { grades: gradesData } = parseGradesFromHtml(html);

    // Extract student name from the page title element or h1.
    // Guard: skip any candidate that looks like a PeopleSoft page title
    // (e.g. "Vizualizarea notelor mele") — those are section headings, not names.
    const h1Match = html.match(/<h1[^>]*>([^<]{3,80})<\/h1>/i);
    const titleMatch = html.match(/<title[^>]*>([^<]{3,80})<\/title>/i);
    const candidateName = (h1Match && h1Match[1].trim()) || (titleMatch && titleMatch[1].trim()) || '';
    if (candidateName && !PS_PAGE_TITLE_PATTERN.test(candidateName)) {
      setStudentName(candidateName);
    }

    // Extract academic year label from the page for display
    const yearMatch = html.match(/An academic\s*(\d{4}-\d{4})/i);
    if (yearMatch) setAcademicYear(yearMatch[1]);

    // Extract and store PeopleSoft session context (EMPLID, ACAD_CAREER, STRM, etc.)
    const ctx = extractPsContextFromHtml(html);
    if (ctx) setPsContext(ctx);

    return gradesData;
  };

  const semesterCounts = useMemo(() => {
    return grades.reduce((counts, grade) => {
      const s = grade.filterCategory;
      if (s) {
        counts[s] = (counts[s] || 0) + 1;
      }
      return counts;
    }, {});
  }, [grades]);

  const displayedGrades = useMemo(() => {
    return grades
      .map((grade, index) => ({ ...grade, originalIndex: index }))
      .filter(grade => {
        if (semesterFilter === 'all') return true;
        return grade.filterCategory === semesterFilter;
      })
      .sort((a, b) => {
        const catDiff = getSemesterOrder(a.filterCategory) - getSemesterOrder(b.filterCategory);
        if (catDiff !== 0) return catDiff;
        
        const sesiuneDiff = (a.sesiune || '').localeCompare(b.sesiune || '');
        if (sesiuneDiff !== 0) return sesiuneDiff;

        return a.originalIndex - b.originalIndex;
      });
  }, [grades, semesterFilter]);

  const activeSemesterLabel = SEMESTER_OPTIONS.find(option => option.value === semesterFilter)?.label || 'Toate';

  /**
   * Validate that the username matches a known USV account format before
   * sending a request. Accepted formats:
   *   PRENUME.NUME | PRENUME.NUME1 | prenume.nume1@student.usv.ro | prenume.nume@usv.ro
   *
   * Uses Unicode property escapes (\p{L}) to support Romanian characters (ă, î, â, ș, ț).
   * The `i` flag handles uppercase email domains like @STUDENT.USV.RO.
   */
  const USV_USERNAME_REGEX = /^\p{L}+\.\p{L}+\d*(@student\.usv\.ro|@usv\.ro)?$/iu;

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    const trimmedUserid = userid.trim();

    if (!USV_USERNAME_REGEX.test(trimmedUserid)) {
      setError(
        'Format utilizator invalid. Folosește PRENUME.NUME, PRENUME.NUME1, prenume.nume@student.usv.ro sau prenume.nume@usv.ro.'
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid: trimmedUserid, password }),
      });

      const data = await response.json();

      if (data.success) {
        setStudentName(formatUseridAsName(trimmedUserid));
        setLoggedIn(true);
        setResult(data);
        if (rememberMe) {
          localStorage.setItem('usv_userid', trimmedUserid);
          localStorage.setItem('usv_remember', 'true');
        } else {
          localStorage.removeItem('usv_userid');
          localStorage.removeItem('usv_remember');
        }
        await fetchGrades(data.cookies);
      } else {
        setError(data.error || 'Autentificare eșuată');
        if (rememberMe) {
          localStorage.removeItem('usv_userid');
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
          cookies,
        }),
      });

      const data = await response.json();
      if (data.success && data.html) {
        const extractedGrades = extractGrades(data.html);
        setGrades(extractedGrades);

        // Extract PS context to enable multi-year fetching
        const ctx = extractPsContextFromHtml(data.html);
        if (ctx) {
          const strm = ctx.currentStrm;
          setPsContext(ctx);
          setSelectedYear(strm);
          setYearData({ [strm]: extractedGrades });
          // Kick off background discovery of other academic years (no await — fire & forget)
          discoverAllYears(ctx, cookies, strm);
        }
      }
    } catch (err) {
      console.error('Failed to fetch grades:', err);
    }
  };

  /**
   * Build the direct PeopleSoft grades URL for a given STRM (academic year code).
   */
  const buildGradeUrl = (ctx, strm) =>
    `/psc/PT90SYS/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_SSENRL_GRADE.GBL` +
    `?ACAD_CAREER=${encodeURIComponent(ctx.acadCareer)}` +
    `&EMPLID=${encodeURIComponent(ctx.emplid)}` +
    `&INSTITUTION=${encodeURIComponent(ctx.institution)}` +
    `&STRM=${encodeURIComponent(strm)}` +
    `&PAGE=SSR_SSENRL_GRADE`;

  /**
   * Fetch and parse grades for a specific academic year (STRM).
   * Validates that PeopleSoft actually returned the requested STRM —
   * if it silently redirected to a different year, returns [] to avoid false positives.
   */
  const fetchGradesForStrm = async (strm, ctx, cookies) => {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: buildGradeUrl(ctx, strm), cookies }),
    });
    const data = await response.json();
    if (data.success && data.html) {
      // Critical validation: check that PeopleSoft actually served this STRM.
      // If the student was never enrolled in this year, PeopleSoft may silently
      // redirect to the current/default STRM — we detect this via strCurrUrl.
      const returnedCtx = extractPsContextFromHtml(data.html);
      if (returnedCtx && returnedCtx.currentStrm !== strm) {
        // PeopleSoft returned a different year than we asked for — skip it.
        return [];
      }
      return parseGradesFromHtml(data.html).grades;
    }
    return [];
  };

  /**
   * Background discovery of all academic years where this student has grades.
   * Starts from (currentStrm - 1) and works backwards, stopping automatically
   * after two consecutive years with no valid data to avoid unnecessary requests.
   * Never fetches future years (above currentStrm).
   */
  const discoverAllYears = async (ctx, cookies, currentStrm) => {
    const current = parseInt(currentStrm, 10);
    if (!current || isNaN(current)) return;

    setLoadingYears(true);

    let consecutiveEmpty = 0;
    const MAX_CONSECUTIVE_EMPTY = 2; // Stop after 2 years in a row with no grades
    const MAX_YEARS_BACK = 7;        // Safety cap: no student studies more than 7 years

    for (let s = current - 1; s >= current - MAX_YEARS_BACK; s--) {
      try {
        const yearGrades = await fetchGradesForStrm(String(s), ctx, cookies);
        if (yearGrades.length > 0) {
          consecutiveEmpty = 0;
          setYearData(prev => ({ ...prev, [String(s)]: yearGrades }));
        } else {
          consecutiveEmpty++;
          if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) {
            // Two consecutive empty/invalid years — no point going further back
            break;
          }
        }
      } catch {
        consecutiveEmpty++;
        if (consecutiveEmpty >= MAX_CONSECUTIVE_EMPTY) break;
      }
    }

    setLoadingYears(false);
  };

  /**
   * Switch the displayed academic year. Pulls from the yearData cache.
   */
  const switchYear = (strm) => {
    setSelectedYear(strm);
    setSemesterFilter('all');
    if (yearData[strm]) {
      setGrades(yearData[strm]);
    }
  };

  const handleLogout = async () => {
    if (userid) {
      try {
        await fetch('/api/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userid }),
        });
      } catch (err) {
        console.error('Failed to notify logout to server:', err);
      }
    }

    setLoggedIn(false);
    setResult(null);
    setGrades([]);
    setSemesterFilter('all');
    setRememberMe(false);
    setUserid('');
    setPassword('');
    setPsContext(null);
    setYearData({});
    setSelectedYear('');
    setLoadingYears(false);
    localStorage.removeItem('usv_userid');
    localStorage.removeItem('usv_password');
    localStorage.removeItem('usv_remember');
    localStorage.removeItem('usv_semester');
  };

  return (
    <>
      <Head>
        <title>Portal Student USV</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="app" data-theme={theme}>
        <header className="header">
          <div className="header-content">
            <div className="logo">
              <span className="logo-highlight">USV</span>
              <span className="logo-text">Portal</span>
            </div>
            <div className="header-actions">
              <button 
                onClick={toggleTheme} 
                className="btn-theme-toggle"
                aria-label="Schimbă tema"
                title={theme === 'dark' ? 'Mod luminos' : 'Mod întunecat'}
              >
                {theme === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
                )}
              </button>
              <button onClick={() => setShowDonateModal(true)} className="btn-donate">
                Susține (Revolut)
              </button>
              {loggedIn && (
                <button onClick={handleLogout} className="btn-logout">
                  Deconectare
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="main">
          {isInitializing ? (
            <div className="login-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="glow-blob glow-blob-1"></div>
              <div className="glow-blob glow-blob-2"></div>
              <div className="spinner" style={{ marginBottom: '16px', zIndex: 5 }}></div>
              <p style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '15px', zIndex: 5 }}>Se verifică sesiunea...</p>
            </div>
          ) : !loggedIn ? (
            <div className="login-section">
              <div className="glow-blob glow-blob-1"></div>
              <div className="glow-blob glow-blob-2"></div>
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
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                      />
                      <span className="field-hint">Ex: Ion.Popescu sau ion.popescu@student.usv.ro</span>
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
                        <span>Ține minte utilizatorul</span>
                      </label>
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? 'Se conectează...' : 'Conectare'}
                    </button>
                  </form>

                  <div className="login-disclaimer">
                    <p>Fără parole salvate • 100% Independent</p>
                    <p className="security-hint">
                      Proxy independent. Datele tranzitează exclusiv pentru conectarea securizată la USV. <a href="/privacy" className="security-hint-link">Detalii și riscuri</a>
                    </p>
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="dashboard">
              <div className="dashboard-header">
                <div className="dashboard-title">
                  <span className="eyebrow">Situație școlară</span>
                  <h1>{studentName || userid}</h1>
                  <p className="subtitle">{selectedYear ? `An universitar ${strmToYearLabel(selectedYear)}` : academicYear ? `An universitar ${academicYear}` : 'Sesiune activă'}</p>
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

{/* Year selector — appears once multiple years are discovered */}
              {(Object.keys(yearData).length > 1 || loadingYears) && (
                <div className="year-bar">
                  <span className="control-label">An universitar</span>
                  <div className="year-tabs">
                    {Object.keys(yearData)
                      .sort((a, b) => parseInt(b, 10) - parseInt(a, 10))
                      .map(strm => (
                        <button
                          key={strm}
                          type="button"
                          className={`year-tab${selectedYear === strm ? ' active' : ''}`}
                          onClick={() => switchYear(strm)}
                          aria-pressed={selectedYear === strm}
                        >
                          <span>{strmToYearLabel(strm)}</span>
                          <span className="year-tab-count">{yearData[strm]?.length ?? 0}</span>
                        </button>
                      ))}
                    {loadingYears && (
                      <span className="year-discovering">
                        <span className="year-spinner" />
                        Se caută ani...
                      </span>
                    )}
                  </div>
                </div>
              )}

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
                                  <span className={`semester-pill ${grade.sesiune || grade.filterCategory ? '' : 'unknown'}`}>
                                    {grade.sesiune || grade.filterCategory || '—'}
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
          <p className="footer-small">
            <a href="https://github.com/28VYK/USV-PROXY" target="_blank" rel="noopener noreferrer" className="footer-link">
              Cod sursă disponibil public
            </a>
            {' • '}
            <span>Scop educațional</span>
            {' • '}
            <a href="/privacy" className="footer-link">
              Politică de Confidențialitate & Disclaimer
            </a>
          </p>
        </footer>

        {showDonateModal && (
          <div className="modal-overlay" onClick={() => setShowDonateModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <span className="eyebrow-accent">Comunitate</span>
                <h2>Susține Proiectul USV Portal</h2>
              </div>
              <div className="modal-body">
                <p>
                  Acest proiect este 100% independent și open-source, creat special pentru a face viața viitorilor colegi de facultate mult mai ușoară!
                </p>
                <p>
                  Datorită lui, oricine își poate verifica situația școlară instant, direct de pe telefon sau laptop, fără a fi nevoie să configureze manual VPN-ul greoi al universității sau să se mai lovească de erorile de certificat TLS învechit pe browserele moderne.
                </p>
                <p>
                  Pentru a menține platforma online, rapidă și gratuită pentru toată lumea, avem nevoie de susținerea ta. Orice contribuție ne ajută să acoperim costurile lunare de găzduire pe serverul VPS și lucrările de întreținere!
                </p>
              </div>
              <div className="modal-actions">
                <a
                  href="https://revolut.me/28vik/pocket/dOomdzRh2c"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-modal-donate"
                  onClick={() => setShowDonateModal(false)}
                >
                  Donează pe Revolut
                </a>
                <button onClick={() => setShowDonateModal(false)} className="btn-modal-close">
                  Mai târziu
                </button>
              </div>
            </div>
          </div>
        )}
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
          --green: #10b981;
          --red: #ef4444;
          --amber: #f59e0b;
          
          /* Premium theme-aware components */
          --glass-bg: rgba(255, 255, 255, 0.6);
          --glass-border: rgba(255, 255, 255, 0.8);
          --card-bg: rgba(255, 255, 255, 0.82);
          --card-border: rgba(255, 255, 255, 0.6);
          --card-inner-shadow: rgba(255, 255, 255, 0.8);
          --card-header-bg: rgba(255, 255, 255, 0.5);
          --table-wrapper-bg: rgba(255, 255, 255, 0.3);
          --grade-controls-bg: rgba(251, 252, 254, 0.5);
          --segmented-bg: rgba(15, 23, 42, 0.06);
          --segmented-active-bg: #ffffff;
          --count-bg: rgba(15, 23, 42, 0.08);
          
          --th-bg: rgba(15, 23, 42, 0.02);
          --th-color: #475569;
          --tr-even-bg: rgba(15, 23, 42, 0.01);
          --tr-hover-bg: rgba(99, 102, 241, 0.04);
          
          --input-bg: rgba(255, 255, 255, 0.5);
          --input-border: rgba(15, 23, 42, 0.12);
          --input-focus-bg: #ffffff;
          
          --modal-bg: rgba(255, 255, 255, 0.96);
          
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
          color: var(--text);
          position: relative;
          overflow-x: hidden;
          transition: background 0.3s ease, color 0.3s ease;
          padding-top: env(safe-area-inset-top, 0px);
        }

        .app[data-theme="dark"] {
          --ink: #f8fafc;
          --text: #cbd5e1;
          --muted: #64748b;
          --line: #1e293b;
          --line-strong: #334155;
          --paper: #0b0f19;
          --surface: #020617;
          --surface-strong: #1e293b;
          --blue: #6366f1;
          --blue-dark: #4f46e5;
          --green: #34d399;
          --red: #f87171;
          --amber: #fbbf24;
          
          /* Dark mode premium-aware components */
          --glass-bg: rgba(15, 23, 42, 0.6);
          --glass-border: rgba(255, 255, 255, 0.08);
          --card-bg: rgba(11, 15, 25, 0.8);
          --card-border: rgba(255, 255, 255, 0.08);
          --card-inner-shadow: rgba(255, 255, 255, 0.05);
          --card-header-bg: rgba(15, 23, 42, 0.4);
          --table-wrapper-bg: rgba(15, 23, 42, 0.2);
          --grade-controls-bg: rgba(11, 15, 25, 0.4);
          --segmented-bg: rgba(255, 255, 255, 0.06);
          --segmented-active-bg: #1e293b;
          --count-bg: rgba(255, 255, 255, 0.1);
          
          --th-bg: rgba(255, 255, 255, 0.02);
          --th-color: #cbd5e1;
          --tr-even-bg: rgba(255, 255, 255, 0.01);
          --tr-hover-bg: rgba(99, 102, 241, 0.1);
          
          --input-bg: rgba(15, 23, 42, 0.6);
          --input-border: rgba(255, 255, 255, 0.08);
          --input-focus-bg: #0f172a;
          
          --modal-bg: rgba(11, 15, 25, 0.96);
          
          background: linear-gradient(180deg, #0f172a 0%, #0b0f19 50%, #020617 100%);
        }

        .header, .card, .login-card, .year-tab, .segmented-control, .segmented-control button, table, th, td, input, .btn-secondary, .btn-logout, .btn-theme-toggle {
          transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease;
        }

        /* Dark mode header h1 and login h1 adjustment to be readable */
        .app[data-theme="dark"] .login-header h1,
        .app[data-theme="dark"] .dashboard-header h1 {
          background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* ── Theme Toggle Button ── */
        .btn-theme-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          background: var(--surface-strong);
          color: var(--text);
          border: 1px solid var(--line);
          border-radius: 10px;
          cursor: pointer;
        }

        .btn-theme-toggle:hover {
          background: var(--line);
          color: var(--ink);
          transform: translateY(-1px);
        }

        .btn-theme-toggle svg {
          transition: transform 0.4s ease;
        }

        .btn-theme-toggle:hover svg {
          transform: rotate(20deg);
        }

        /* Dark mode footer link hover styling */
        .app[data-theme="dark"] .footer-link:hover {
          color: #818cf8;
        }

        /* Ultra-Premium Floating Header */
        .header {
          position: relative;
          margin: 24px auto 0;
          width: max-content;
          min-width: 280px;
          height: 56px;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 99px;
          display: flex;
          align-items: center;
          padding: 0 24px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          z-index: 100;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04), inset 0 1px 0 var(--glass-border);
        }

        .header-content {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 32px;
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
          color: var(--ink);
        }

        .logo-text {
          font-weight: 500;
          color: var(--muted);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-donate {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 0 16px;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: white;
          text-decoration: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.25);
          white-space: nowrap;
          cursor: pointer;
          border: 0;
        }

        .btn-donate:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(168, 85, 247, 0.35);
          filter: brightness(1.05);
        }

        .main {
          flex: 1;
          padding: 24px 28px;
          padding-left: max(28px, env(safe-area-inset-left));
          padding-right: max(28px, env(safe-area-inset-right));
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          box-sizing: border-box;
          position: relative;
          z-index: 2;
        }

        /* Ambient Glow Blobs */
        .login-section {
          display: grid;
          align-items: center;
          justify-items: center;
          width: 100%;
          min-height: calc(100vh - 200px);
          position: relative;
        }

        .glow-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(130px);
          opacity: 0.45;
          z-index: 1;
          pointer-events: none;
          mix-blend-mode: multiply;
          animation: pulse 10s ease-in-out infinite alternate;
        }

        .glow-blob-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.6) 0%, rgba(139, 92, 246, 0) 70%);
          top: -10%;
          left: 10%;
        }

        .glow-blob-2 {
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.5) 0%, rgba(56, 189, 248, 0) 70%);
          bottom: 0%;
          right: 5%;
          animation-delay: -5s;
        }

        @keyframes pulse {
          0% {
            transform: translate(0, 0) scale(1);
          }
          100% {
            transform: translate(30px, -40px) scale(1.15);
          }
        }

        .login-shell {
          width: 100%;
          max-width: 440px;
          margin: 0 auto;
          display: block;
          position: relative;
          z-index: 5;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
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

        .login-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 24px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 
            0 30px 60px rgba(15, 23, 42, 0.05),
            0 12px 24px rgba(15, 23, 42, 0.03),
            inset 0 1px 0 var(--card-inner-shadow);
          padding: 28px 32px;
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .login-card:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 35px 70px rgba(15, 23, 42, 0.07),
            0 15px 30px rgba(15, 23, 42, 0.04),
            inset 0 1px 0 var(--card-inner-shadow);
        }

        .login-header {
          margin-bottom: 18px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          min-height: 26px;
          padding: 0 12px;
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 999px;
          color: #4f46e5;
          background: rgba(99, 102, 241, 0.06);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-family: 'Space Grotesk', sans-serif;
        }

        .login-header h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 34px;
          font-weight: 900;
          margin: 8px 0 4px;
          color: var(--ink);
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #0f172a 0%, #312e81 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .login-header p {
          color: var(--muted);
          font-size: 14px;
          margin: 0;
          line-height: 1.6;
          font-weight: 500;
        }

        .field {
          margin-bottom: 14px;
        }

        .field label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 8px;
          letter-spacing: -0.01em;
        }

        .field input {
          width: 100%;
          min-height: 48px;
          padding: 12px 16px;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 12px;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
        }

        .field input:focus {
          outline: none;
          background: var(--input-focus-bg);
          border-color: #4f46e5;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.14);
        }

        .field input::placeholder {
          color: #94a3b8;
          opacity: 0.85;
        }

        .field-hint {
          display: block;
          margin-top: 6px;
          font-size: 12px;
          color: var(--muted);
          font-weight: 500;
          opacity: 0.8;
        }

        .field-checkbox {
          margin-bottom: 18px;
          margin-top: -8px;
        }

        .field-checkbox label {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 14px;
          color: var(--text);
          font-weight: 600;
          user-select: none;
        }

        .field-checkbox input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          width: 19px;
          height: 19px;
          border: 2px solid var(--line-strong);
          border-radius: 6px;
          background: var(--input-bg);
          cursor: pointer;
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .field-checkbox input[type="checkbox"]:checked {
          background: var(--blue);
          border-color: transparent;
        }

        .field-checkbox input[type="checkbox"]:checked::after {
          content: "";
          width: 5px;
          height: 9px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
          position: absolute;
          top: 2px;
          left: 5px;
        }

        .field-checkbox input[type="checkbox"]:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
        }

        .btn-primary {
          width: 100%;
          min-height: 48px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Space Grotesk', sans-serif;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 10px 25px rgba(99, 102, 241, 0.25);
          box-sizing: border-box;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(99, 102, 241, 0.35);
          filter: brightness(1.05);
        }

        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.25);
        }

        .btn-primary:disabled {
          opacity: 0.65;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .btn-secondary {
          min-height: 38px;
          padding: 8px 16px;
          background: var(--paper);
          color: var(--ink);
          border: 1px solid var(--line);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--surface-strong);
          border-color: var(--line-strong);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .btn-logout {
          min-height: 38px;
          padding: 8px 16px;
          background: var(--paper);
          color: var(--text);
          border: 1px solid var(--line);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-logout:hover {
          background: #fff5f5;
          border-color: #feb2b2;
          color: #c53030;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 22px;
          font-size: 14px;
          line-height: 1.5;
          font-weight: 600;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        
        .app[data-theme="light"] .alert-error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fee2e2;
        }

        /* Login Disclaimer */
        .login-disclaimer {
          margin-top: 14px;
          text-align: center;
          padding-top: 12px;
          border-top: 1px dashed var(--line);
        }

        .login-disclaimer p {
          margin: 0;
          font-size: 12.5px;
          color: #64748b;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
        }

        .security-hint {
          margin-top: 6px !important;
          font-size: 11px !important;
          color: #94a3b8 !important;
          line-height: 1.45;
        }

        .security-hint-link {
          color: var(--blue) !important;
          text-decoration: underline;
          font-weight: 600;
          transition: color 0.15s ease;
        }

        .security-hint-link:hover {
          color: var(--blue-dark) !important;
        }

        .dashboard {
          max-width: 1180px;
          margin: 0 auto;
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 24px;
          margin-bottom: 24px;
        }

        .dashboard-title {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }

        .dashboard-header h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 38px;
          font-weight: 900;
          margin: 0;
          color: var(--ink);
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #0f172a 0%, #312e81 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          color: var(--muted);
          font-size: 14px;
          margin: 0;
          font-weight: 600;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(94px, 1fr));
          min-width: min(100%, 520px);
          background: var(--card-bg);
          border: 1px solid var(--line);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 
            0 10px 30px rgba(0, 0, 0, 0.03),
            inset 0 1px 0 var(--card-inner-shadow);
          backdrop-filter: blur(10px);
        }

        .summary-item {
          display: grid;
          gap: 4px;
          padding: 16px 20px;
          border-right: 1px solid var(--line);
        }

        .summary-item:last-child {
          border-right: 0;
        }

        .summary-item span {
          color: var(--muted);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .summary-item strong {
          color: var(--ink);
          font-family: 'Outfit', sans-serif;
          font-size: 22px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.01em;
        }

        .summary-item.accent strong {
          color: var(--blue);
          font-size: 16px;
          font-weight: 800;
        }

        .card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 24px;
          box-shadow: 
            0 30px 60px rgba(15, 23, 42, 0.05),
            inset 0 1px 0 var(--card-inner-shadow);
          overflow: hidden;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          padding: 24px 28px;
          border-bottom: 1px solid var(--line);
          background: var(--card-header-bg);
        }

        .card-title {
          display: grid;
          gap: 4px;
        }

        .card-header h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 22px;
          font-weight: 800;
          margin: 0;
          color: var(--ink);
          letter-spacing: -0.02em;
        }

        .card-title p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          font-weight: 500;
        }

        .table-wrapper {
          overflow-x: auto;
          background: var(--table-wrapper-bg);
        }

        .grade-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 16px 28px;
          border-bottom: 1px solid var(--line);
          background: var(--grade-controls-bg);
        }

        .control-label {
          color: var(--muted);
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .segmented-control {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px;
          background: var(--segmented-bg);
          border: 1px solid rgba(15, 23, 42, 0.04);
          border-radius: 10px;
        }

        .segmented-control button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 34px;
          min-width: 82px;
          padding: 7px 14px;
          background: transparent;
          color: var(--text);
          border: 0;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
        }

        .segmented-control button:hover {
          color: var(--ink);
        }

        .segmented-control button.active {
          background: var(--segmented-active-bg);
          color: var(--blue);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
        }

        .count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          background: var(--count-bg);
          color: var(--text);
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          line-height: 1;
        }

        .segmented-control button.active .count {
          background: rgba(99, 102, 241, 0.12);
          color: var(--blue);
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: var(--th-bg);
          padding: 16px 20px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
          color: var(--th-color);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--line);
          white-space: nowrap;
        }

        td {
          padding: 16px 20px;
          font-size: 14px;
          color: var(--text);
          border-bottom: 1px solid var(--line);
          vertical-align: middle;
        }

        tr:last-child td {
          border-bottom: none;
        }

        tbody tr:nth-child(even) td {
          background: var(--tr-even-bg);
        }

        tr:hover td {
          background: var(--tr-hover-bg);
        }

        .course {
          font-weight: 700;
          color: var(--ink);
          max-width: 340px;
          line-height: 1.45;
        }

        .semester-pill {
          display: inline-flex;
          align-items: center;
          min-width: 58px;
          justify-content: center;
          padding: 5px 10px;
          background: rgba(16, 185, 129, 0.1);
          color: var(--green);
          border: 1px solid rgba(16, 185, 129, 0.15);
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.2;
          white-space: nowrap;
        }

        .semester-pill.unknown {
          background: rgba(148, 163, 184, 0.1);
          color: var(--muted);
          border-color: rgba(148, 163, 184, 0.15);
        }

        .muted {
          color: var(--muted);
          font-size: 13px;
        }

        .final {
          font-weight: 800;
          font-size: 15px;
          font-family: 'Outfit', sans-serif;
        }

        .final.pass {
          color: var(--green);
        }

        .final.fail {
          color: var(--red);
        }

        .points {
          font-weight: 800;
          color: var(--blue);
          font-family: 'Outfit', sans-serif;
        }

        .loading-state, .empty-state {
          padding: 70px 24px;
          text-align: center;
          color: var(--muted);
        }

        .empty-state.compact {
          padding: 40px 24px;
        }

        .spinner {
          width: 36px;
          height: 36px;
          border: 3.5px solid rgba(99, 102, 241, 0.15);
          border-top-color: var(--blue);
          border-radius: 50%;
          animation: spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .footer {
          padding: 16px 28px;
          text-align: center;
          color: #64748b;
          font-size: 12px;
          font-weight: 500;
          background: transparent;
        }

        .footer p {
          margin: 0;
        }

        .footer-small {
          font-size: 11px !important;
          margin-top: 5px !important;
          opacity: 0.9;
        }

        .footer-link {
          color: var(--blue);
          text-decoration: none;
          font-weight: 600;
          transition: color 0.15s ease;
        }

        .footer-link:hover {
          color: var(--blue-dark);
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .header { 
            padding: 10px 16px; 
            width: max-content;
            max-width: calc(100% - 32px); 
            border-radius: 20px;
            height: auto;
            margin: 16px auto 0;
          }
          .header-content { 
            gap: 12px; 
            flex-wrap: wrap; 
            justify-content: center;
          }
          .header-actions {
            gap: 8px;
          }
          .btn-donate, .btn-logout {
            padding: 0 12px;
            font-size: 12px;
            min-height: 34px;
          }
          .main { 
            padding: 24px 16px; 
            padding-left: max(16px, env(safe-area-inset-left));
            padding-right: max(16px, env(safe-area-inset-right));
          }
          .login-section { align-items: start; }
          .login-shell { grid-template-columns: minmax(0, 1fr); max-width: 100%; gap: 24px; }
          .login-card, .trust-panel { padding: 28px; border-radius: 20px; }
          .field input { font-size: 16px !important; }
          .dashboard-header { align-items: center; text-align: center; flex-direction: column; gap: 16px; }
          .dashboard-title { align-items: center; }
          .dashboard-header h1 { font-size: 26px; }
          .summary-grid { grid-template-columns: repeat(2, 1fr); min-width: 0; width: 100%; }
          .summary-item:nth-child(2) { border-right: 0; }
          .summary-item:nth-child(1), .summary-item:nth-child(2) { border-bottom: 1px solid var(--line); }
          .card-header { padding: 20px 16px; flex-direction: column; gap: 14px; align-items: stretch; }
          .grade-controls { padding: 14px 16px; align-items: flex-start; flex-direction: column; overflow-x: auto; }
          .segmented-control { width: max-content; }
          th, td { padding: 14px 12px; font-size: 13px; }
          .course { max-width: 190px; }
          .glow-blob { opacity: 0.3; filter: blur(90px); }
        }

        /* Modal Overlay and Card Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          padding: 20px;
          animation: fadeIn 0.25s ease;
        }

        .modal-card {
          background: var(--modal-bg);
          border: 1px solid var(--card-border);
          border-radius: 24px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 30px 60px rgba(15, 23, 42, 0.15);
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-header h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 800;
          color: var(--ink);
          margin-top: 8px;
          margin-bottom: 0;
          letter-spacing: -0.02em;
        }

        .eyebrow-accent {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          padding: 0 10px;
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 999px;
          color: #a855f7;
          background: rgba(168, 85, 247, 0.06);
          font-size: 10.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-family: 'Space Grotesk', sans-serif;
        }

        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .modal-body p {
          color: var(--text);
          font-size: 14px;
          line-height: 1.6;
          margin: 0;
          font-weight: 500;
        }

        .modal-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 8px;
        }

        .btn-modal-donate {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: white;
          text-decoration: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          transition: all 0.2s ease;
          box-shadow: 0 8px 20px rgba(168, 85, 247, 0.25);
        }

        .btn-modal-donate:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(168, 85, 247, 0.35);
          filter: brightness(1.05);
        }

        .btn-modal-close {
          min-height: 44px;
          background: transparent;
          color: var(--muted);
          border: 1px solid var(--line);
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-modal-close:hover {
          background: var(--surface-strong);
          color: var(--ink);
        }

        /* ── Year Bar ─────────────────────────────────────────────── */
        .year-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 28px;
          border-bottom: 1px solid var(--line);
          background: var(--grade-controls-bg);
          flex-wrap: wrap;
        }

        .year-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .year-tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 10px;
          border: 1.5px solid var(--line);
          background: var(--surface);
          color: var(--muted);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s ease;
          font-family: inherit;
        }

        .year-tab:hover {
          background: var(--surface-strong);
          border-color: var(--blue);
          color: var(--blue);
          transform: translateY(-1px);
        }

        .year-tab.active {
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .year-tab-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 18px;
          padding: 0 5px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(255,255,255,0.25);
        }

        .year-tab:not(.active) .year-tab-count {
          background: var(--line-strong);
          color: var(--muted);
        }

        .year-discovering {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--muted);
          font-weight: 500;
          padding: 0 4px;
        }

        .year-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid var(--line-strong);
          border-top-color: var(--blue);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Security Banner & Privacy Link Styles */
        .security-banner {
          display: flex;
          gap: 10px;
          padding: 8px 12px;
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.25);
          border-radius: 12px;
          margin-bottom: 12px;
          font-size: 12px;
          line-height: 1.45;
          color: var(--amber);
          text-align: left;
        }

        .security-banner-icon {
          font-size: 14px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .security-banner-text strong {
          color: var(--amber);
          font-weight: 700;
        }

        .app[data-theme="light"] .security-banner {
          background: rgba(245, 158, 11, 0.07);
          border: 1px solid rgba(245, 158, 11, 0.2);
          color: #b45309;
        }

        .app[data-theme="light"] .security-banner-text strong {
          color: #78350f;
        }

        .security-banner-link {
          color: var(--blue);
          text-decoration: underline;
          font-weight: 600;
          margin-left: 4px;
          transition: color 0.15s ease;
        }

        .security-banner-link:hover {
          color: var(--blue-dark);
        }

        .privacy-link {
          color: var(--blue);
          text-decoration: none;
          font-weight: 600;
          font-size: 12px;
          transition: color 0.15s ease;
        }

        .privacy-link:hover {
          color: var(--blue-dark);
          text-decoration: underline;
        }
      `}</style>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { 
          overflow-x: hidden; 
          margin: 0; 
          padding: 0; 
          width: 100%; 
          background: #f8fafc;
          -webkit-font-smoothing: antialiased; 
          transition: background-color 0.3s ease;
        }
        html.dark-theme, html.dark-theme body {
          background: #020617;
        }
      `}</style>
    </>
  );
}
