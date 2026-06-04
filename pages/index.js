import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import DonateModal from '../components/DonateModal';
import GradeTable from '../components/GradeTable';
import AnalyticsTab from '../components/AnalyticsTab';
import CookieBanner from '../components/CookieBanner';
import { calculateEstimatedFinalGrade, calculateEctsStats, processMultiYearAcademicData } from '../lib/formatters';

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
 * Group duplicate course entries by course title and semester category.
 * Retains the session with the highest grade, or fallback to the non-ABS attempt.
 */
function groupGrades(gradesList) {
  // Build a map of course title -> semester category (ignoring OTHER if we have SEM 1 or SEM 2)
  const titleToSemester = {};
  gradesList.forEach(grade => {
    if (grade.filterCategory && grade.filterCategory !== 'OTHER') {
      titleToSemester[grade.titlu] = grade.filterCategory;
    }
  });

  const grouped = {};
  gradesList.forEach(grade => {
    // Resolve the semester category: fallback to the mapped semester if current is OTHER
    const resolvedSemester = grade.filterCategory === 'OTHER' && titleToSemester[grade.titlu]
      ? titleToSemester[grade.titlu]
      : grade.filterCategory;

    const key = `${grade.titlu}|${resolvedSemester}`;
    
    // Resolve missing final grade using calculateEstimatedFinalGrade if possible
    const estimatedFinal = calculateEstimatedFinalGrade(grade);
    const resolvedGrade = {
      ...grade,
      filterCategory: resolvedSemester,
      notaFinala: grade.resolvedNotaFinala !== undefined ? grade.resolvedNotaFinala : (estimatedFinal !== null ? estimatedFinal : grade.notaFinala),
      isEstimatedFinal: estimatedFinal !== null // track that this is an estimated grade
    };
    
    if (!grouped[key]) {
      grouped[key] = resolvedGrade;
    } else {
      const currentNota = parseFloat(grouped[key].notaFinala);
      const newNota = parseFloat(resolvedGrade.notaFinala);
      
      const currentValid = !isNaN(currentNota) && currentNota >= 1 && currentNota <= 10;
      const newValid = !isNaN(newNota) && newNota >= 1 && newNota <= 10;
      
      let chooseNew = false;
      if (newValid && !currentValid) {
        chooseNew = true;
      } else if (newValid && currentValid) {
        if (newNota > currentNota) {
          chooseNew = true;
        }
      } else if (!newValid && !currentValid) {
        if (String(resolvedGrade.notaFinala).toUpperCase() !== 'ABS' && String(grouped[key].notaFinala).toUpperCase() === 'ABS') {
          chooseNew = true;
        }
      }
      if (chooseNew) {
        grouped[key] = resolvedGrade;
      }
    }
  });
  return Object.values(grouped);
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

  // Navigation tabs state
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'analytics'

  // Simulated grades state
  const [simulatedGrades, setSimulatedGrades] = useState({}); // { [originalIndex]: gradeValue }

  // VPN Health state
  const [vpnOnline, setVpnOnline] = useState(true);
  const [vpnShowSuccess, setVpnShowSuccess] = useState(false);

  // Cookie Banner state
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  const checkVpnHealth = async () => {
    try {
      const res = await fetch('/api/health/vpn');
      const data = await res.json();
      if (data && typeof data.online === 'boolean') {
        setVpnOnline(prevOnline => {
          if (!prevOnline && data.online) {
            setVpnShowSuccess(true);
            setTimeout(() => {
              setVpnShowSuccess(false);
            }, 3000);
          }
          return data.online;
        });
      }
    } catch (err) {
      setVpnOnline(false);
    }
  };

  useEffect(() => {
    checkVpnHealth();
    const healthInterval = setInterval(checkVpnHealth, 30000);
    return () => clearInterval(healthInterval);
  }, []);

  // Client-side detection of cookie consent
  useEffect(() => {
    const accepted = localStorage.getItem('usv_cookies_accepted') === 'true';
    if (!accepted) {
      const timer = setTimeout(() => {
        setShowCookieBanner(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptCookies = () => {
    localStorage.setItem('usv_cookies_accepted', 'true');
    setShowCookieBanner(false);
  };

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
    
    // Initialize Theme - manual choice only
    const savedTheme = localStorage.getItem('usv_theme') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
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

  // High-performance direct DOM number counter animation
  useEffect(() => {
    if (!loggedIn || activeTab !== 'analytics') return;

    // Small delay to allow the tab mount transition to start
    const timer = setTimeout(() => {
      const elements = document.querySelectorAll('[data-animate-value]');
      elements.forEach(el => {
        const valAttr = el.getAttribute('data-animate-value');
        if (!valAttr) {
          el.innerText = '—';
          return;
        }

        const target = parseFloat(valAttr);
        if (isNaN(target)) {
          el.innerText = valAttr;
          return;
        }

        const decimals = parseInt(el.getAttribute('data-animate-decimals') || '0', 10);
        const duration = 750; // animation length in ms
        const startTime = performance.now();
        const startValue = 0;

        const updateVal = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing function (easeOutQuad)
          const easedProgress = progress * (2 - progress);
          const current = startValue + easedProgress * (target - startValue);

          el.innerText = current.toFixed(decimals);

          if (progress < 1) {
            requestAnimationFrame(updateVal);
          } else {
            el.innerText = target.toFixed(decimals);
          }
        };

        requestAnimationFrame(updateVal);
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [loggedIn, activeTab, selectedYear, simulatedGrades, yearData]);

  useEffect(() => {
    if (!loggedIn || !userid) return;

    let interval;
    let consecutiveFailures = 0;

    const sendHeartbeat = () => {
      fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid }),
      })
        .then((res) => {
          if (res.status === 401 || res.status === 403) {
            console.warn('[Heartbeat] Session expired or unauthorized on server. Stopping heartbeat and logging out...');
            handleLogout();
            if (interval) clearInterval(interval);
          } else if (!res.ok) {
            consecutiveFailures++;
            if (consecutiveFailures >= 3 && interval) {
              console.warn('[Heartbeat] Repeated failures. Stopping heartbeat interval...');
              clearInterval(interval);
            }
          } else {
            consecutiveFailures = 0;
          }
        })
        .catch(() => {
          consecutiveFailures++;
          if (consecutiveFailures >= 3 && interval) {
            clearInterval(interval);
          }
        });
    };

    sendHeartbeat();
    interval = setInterval(sendHeartbeat, 30000);
    return () => {
      if (interval) clearInterval(interval);
    };
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
   * Safe calculation of arithmetic average, ECTS weighted average, and statistics for active academic year.
   * Groups statistics globally and per-semester for the selected year.
   */
  const arithmeticAnalysis = useMemo(() => {
    // 1. Process multi-year data to identify back papers and back-propagate grades
    const processedYearData = processMultiYearAcademicData(yearData, simulatedGrades, selectedYear);
    
    // Get the processed grades list for the currently selected year
    const currentYearGrades = processedYearData[selectedYear] || [];
    const groupedGrades = groupGrades(currentYearGrades);
    
    // Keep indexing for references
    const yearGradesIndexed = groupedGrades.map((g, idx) => ({ ...g, originalIndex: idx }));
    const sem1Grades = yearGradesIndexed.filter(g => g.filterCategory === 'SEM 1');
    const sem2Grades = yearGradesIndexed.filter(g => g.filterCategory === 'SEM 2');

    // Determine if the selected year is the latest year discovered
    const strmKeys = Object.keys(yearData).map(Number);
    const maxStrm = strmKeys.length > 0 ? Math.max(...strmKeys) : null;
    const isLatest = maxStrm !== null && parseInt(selectedYear, 10) === maxStrm;

    const getStats = (gradesList) => {
      const validGrades = [];
      let missingCount = 0;
      
      gradesList.forEach(grade => {
        // Exclude back papers from the current year's arithmetic average
        if (grade.isBackPaper) return;

        const simulated = simulatedGrades[grade.originalIndex];
        const notaFinalaStr = simulated !== undefined ? String(simulated) : (grade.resolvedNotaFinala || grade.notaFinala);
        const nota = parseFloat(notaFinalaStr);
        
        if (!isNaN(nota) && nota >= 1 && nota <= 10) {
          validGrades.push(nota);
        } else {
          missingCount++;
        }
      });
      
      const sum = validGrades.reduce((acc, val) => acc + val, 0);
      const average = validGrades.length > 0 ? parseFloat((sum / validGrades.length).toFixed(2)) : null;
      
      return {
        average,
        calculatedCount: validGrades.length,
        totalCount: gradesList.filter(g => !g.isBackPaper).length,
        missingCount
      };
    };

    return {
      all: getStats(yearGradesIndexed),
      sem1: getStats(sem1Grades),
      sem2: getStats(sem2Grades),
      ectsAll: calculateEctsStats(yearGradesIndexed, simulatedGrades, isLatest, true),
      ectsSem1: calculateEctsStats(sem1Grades, simulatedGrades, isLatest, true),
      ectsSem2: calculateEctsStats(sem2Grades, simulatedGrades, isLatest, true),
      groupedGradesIndexed: yearGradesIndexed,
      processedYearData // expose to AnalyticsTab
    };
  }, [grades, simulatedGrades, yearData, selectedYear]);

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
        await fetchGrades();
      } else {
        setError(data.error || 'Autentificare eșuată');
        if (rememberMe) {
          localStorage.removeItem('usv_userid');
          localStorage.removeItem('usv_remember');
        }
      }
    } catch (err) {
      setError('Eroare de conexiune');
      checkVpnHealth();
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: '/psc/PT90SYS/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_SSENRL_GRADE.GBL',
        }),
      });

      const data = await response.json();
      if (data.success && data.html) {
        const extractedGrades = extractGrades(data.html);
        
        // Preserve the currently selected year if it was already selected
        const currentActiveYear = selectedYear;

        // Extract PS context to enable multi-year fetching
        const ctx = extractPsContextFromHtml(data.html);
        if (ctx) {
          const strm = ctx.currentStrm;
          setPsContext(ctx);

          // Standard path: user is viewing the default latest STRM, or hasn't selected a year yet
          if (!currentActiveYear || currentActiveYear === strm) {
            setGrades(extractedGrades);
            setSelectedYear(strm);
            setYearData({ [strm]: extractedGrades });
            
            // Kick off background discovery of other academic years
            discoverAllYears(ctx, strm);
          } else {
            // User was viewing a past year. We must fetch it synchronously
            // so the shimmer loading table covers the whole fetch process.
            try {
              const targetGrades = await fetchGradesForStrm(currentActiveYear, ctx);
              if (targetGrades.length > 0) {
                setGrades(targetGrades);
                setSelectedYear(currentActiveYear);
                setYearData({
                  [strm]: extractedGrades,
                  [currentActiveYear]: targetGrades
                });
              } else {
                // Fallback to default if target year has no data
                setGrades(extractedGrades);
                setSelectedYear(strm);
                setYearData({ [strm]: extractedGrades });
              }
            } catch (e) {
              setGrades(extractedGrades);
              setSelectedYear(strm);
              setYearData({ [strm]: extractedGrades });
            }
            
            // Re-run background discovery to populate the year tabs list again
            discoverAllYears(ctx, strm);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch grades:', err);
      checkVpnHealth();
    } finally {
      setLoading(false);
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
  const fetchGradesForStrm = async (strm, ctx) => {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: buildGradeUrl(ctx, strm) }),
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
  const discoverAllYears = async (ctx, currentStrm) => {
    const current = parseInt(currentStrm, 10);
    if (!current || isNaN(current)) return;

    setLoadingYears(true);

    let consecutiveEmpty = 0;
    const MAX_CONSECUTIVE_EMPTY = 2; // Stop after 2 years in a row with no grades
    const MAX_YEARS_BACK = 7;        // Safety cap: no student studies more than 7 years

    for (let s = current - 1; s >= current - MAX_YEARS_BACK; s--) {
      try {
        const yearGrades = await fetchGradesForStrm(String(s), ctx);
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
    setSimulatedGrades({});
    if (yearData[strm]) {
      setGrades(yearData[strm]);
    }
  };

  const handleSimulateGrade = (originalIndex, value) => {
    setSimulatedGrades(prev => {
      const updated = { ...prev };
      if (value === '') {
        delete updated[originalIndex];
      } else {
        updated[originalIndex] = parseInt(value, 10);
      }
      return updated;
    });
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
    setActiveTab('notes');
    setSimulatedGrades({});
    localStorage.removeItem('usv_userid');
    localStorage.removeItem('usv_password');
    localStorage.removeItem('usv_remember');
    localStorage.removeItem('usv_semester');
  };

  return (
    <>
      <Head>
        <title>Portal Student USV - Note & Situație Școlară fără VPN</title>
        <meta name="description" content="Accesează notele și situația școlară de la Universitatea Ștefan cel Mare Suceava în 10 secunde, fără configurare VPN. Gratuit pentru toți studenții USV." />
        <meta name="keywords" content="note usv, situație școlară usv, portal student usv, note student suceava, fără vpn usv" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        
        {/* Favicon & Icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://noteusv.tech" />
        
        {/* Open Graph (Facebook, LinkedIn, etc.) */}
        <meta property="og:title" content="Portal Student USV - Situație Școlară" />
        <meta property="og:description" content="Acces rapid la notele și situația școlară USV din orice browser modern, fără VPN local." />
        <meta property="og:url" content="https://noteusv.tech" />
        <meta property="og:site_name" content="Portal Student USV" />
        <meta property="og:image" content="https://noteusv.tech/og-image.png" />
        <meta property="og:locale" content="ro_RO" />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Portal Student USV - Situație Școlară" />
        <meta name="twitter:description" content="Acces rapid la notele și situația școlară USV din orice browser modern, fără VPN local." />
        <meta name="twitter:image" content="https://noteusv.tech/og-image.png" />
        
        {/* Google Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
        
        {/* Structured Data (JSON-LD) — WebSite schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Portal Student USV",
              "url": "https://noteusv.tech",
              "description": "Acces rapid la situația școlară USV fără VPN",
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://noteusv.tech/?q={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />

        {/* Structured Data (JSON-LD) — SoftwareApplication schema with rating & offer */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Portal Student USV",
              "url": "https://noteusv.tech",
              "description": "Acces rapid la situația școlară USV fără VPN, direct din browser.",
              "applicationCategory": "EducationalApplication",
              "operatingSystem": "Web",
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "bestRating": "5",
                "worstRating": "1",
                "reviewCount": "1200"
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "RON"
              }
            })
          }}
        />
      </Head>

      <div className={`app ${(!vpnOnline || vpnShowSuccess) ? 'has-vpn-banner' : ''}`} data-theme={theme}>
        {/* VPN Health Status Banner */}
        <div className={`vpn-status-banner ${(!vpnOnline || vpnShowSuccess) ? 'visible' : ''} ${vpnShowSuccess ? 'success' : ''}`}>
          <div className="vpn-status-content">
            <span className="vpn-status-pulse" />
            <span>
              {vpnShowSuccess 
                ? 'Conexiune restabilită!' 
                : 'Conexiunea securizată cu universitatea este offline. Se încearcă reconectarea...'}
            </span>
          </div>
        </div>

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
            <div className="header-actions">
              <button
                onClick={toggleTheme}
                className="btn-theme-toggle"
                title={theme === 'dark' ? "Mod luminos" : "Mod întunecat"}
                style={{ marginRight: '8px' }}
              >
                {theme === 'dark' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
              <button onClick={() => setShowDonateModal(true)} className="btn-donate">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="btn-donate-svg">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                  <line x1="6" y1="1" x2="6" y2="4" />
                  <line x1="10" y1="1" x2="10" y2="4" />
                  <line x1="14" y1="1" x2="14" y2="4" />
                </svg>
                <span>Susține</span>
              </button>
              {loggedIn && (
                <button onClick={handleLogout} className="btn-logout-icon" title="Deconectare" style={{ marginLeft: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
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
                  <h1>{studentName || userid}</h1>
                  <p className="subtitle">{selectedYear ? `An universitar ${strmToYearLabel(selectedYear)}` : academicYear ? `An universitar ${academicYear}` : 'Sesiune activă'}</p>
                </div>


              </div>


              {/* Unified Dashboard Master Card */}
              <div className="card animate-fade dashboard-main-card">
                {/* Unified Dashboard Control Bar / Toolbar in Card Header */}
                <div className="card-header dashboard-card-header dashboard-controls-bar" style={{ marginBottom: 0 }}>
                  <div className="dashboard-controls-left">
                    <div className="dashboard-tabs">
                      <div
                        className="dashboard-tabs-indicator"
                        style={{
                          transform: `translateX(${activeTab === 'notes' ? '0%' : '100%'})`,
                        }}
                      />
                      <button
                        type="button"
                        className={`dashboard-tab ${activeTab === 'notes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('notes')}
                        aria-pressed={activeTab === 'notes'}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="9" y1="9" x2="15" y2="9" />
                          <line x1="9" y1="13" x2="15" y2="13" />
                          <line x1="9" y1="17" x2="15" y2="17" />
                        </svg>
                        <span>Notele Mele</span>
                      </button>
                      <button
                        type="button"
                        className={`dashboard-tab ${activeTab === 'analytics' ? 'active' : ''}`}
                        onClick={() => setActiveTab('analytics')}
                        aria-pressed={activeTab === 'analytics'}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="20" x2="18" y2="10" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                        <span>Analiză Medii</span>
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-controls-right">
                    {/* Year Switcher */}
                    {(Object.keys(yearData).length > 1 || loadingYears) && (
                      <div className="dashboard-year-selector">
                        <span className="control-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          An universitar
                          {loadingYears && <span className="year-spinner" title="Se caută ani..." />}
                        </span>
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
                        </div>
                      </div>
                    )}

                    {/* Refresh Button */}
                    <button
                      onClick={() => fetchGrades()}
                      className="btn-secondary"
                      disabled={loading}
                    >
                      {loading ? 'Se actualizează...' : 'Actualizează'}
                    </button>
                  </div>
                </div>

                {/* Dashboard Card Body */}
                <div className={`dashboard-card-body ${activeTab === 'analytics' ? 'analytics-active' : ''}`}>
                  {activeTab === 'notes' ? (
                    <GradeTable
                      grades={grades}
                      displayedGrades={displayedGrades}
                      loading={loading}
                      semesterFilter={semesterFilter}
                      semesterCounts={semesterCounts}
                      onSemesterChange={(value) => {
                        setSemesterFilter(value);
                        localStorage.setItem('usv_semester', value);
                      }}
                    />
                  ) : (
                    <AnalyticsTab
                      arithmeticAnalysis={arithmeticAnalysis}
                      grades={arithmeticAnalysis.groupedGradesIndexed}
                      yearData={yearData}
                      processedYearData={arithmeticAnalysis.processedYearData}
                      selectedYear={selectedYear}
                      simulatedGrades={simulatedGrades}
                      onSimulateGrade={handleSimulateGrade}
                      onResetSimulation={() => setSimulatedGrades({})}
                      onSwitchYear={switchYear}
                    />
                  )}
                </div>
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
            {' • '}
            <a href="/terms" className="footer-link">
              Termeni & Condiții
            </a>
          </p>
        </footer>

        {showDonateModal && (
          <DonateModal onClose={() => setShowDonateModal(false)} />
        )}

        <CookieBanner isVisible={showCookieBanner} onAccept={handleAcceptCookies} />
      </div>

    </>
  );
}
