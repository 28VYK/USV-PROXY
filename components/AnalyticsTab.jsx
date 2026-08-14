import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { strmToYearLabel, calculateEstimatedFinalGrade, calculateEctsStats } from '../lib/formatters';

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
 * AnalyticsTab — Tab-ul „Analiză Medii".
 *
 * Conține: KPI cards cu media aritmetică, warning banner sesiune activă,
 * grade simulator interactiv și evolution timeline multi-an.
 *
 * @param {{
 *   arithmeticAnalysis: { all, sem1, sem2 },
 *   grades: Array,
 *   yearData: Object,
 *   selectedYear: string,
 *   simulatedGrades: Object,
 *   onSimulateGrade: (idx: number, value: string) => void,
 *   onResetSimulation: () => void,
 *   onSwitchYear: (strm: string) => void,
 * }} props
 */
export default function AnalyticsTab({
  arithmeticAnalysis,
  grades,
  yearData,
  processedYearData,
  selectedYear,
  simulatedGrades,
  onSimulateGrade,
  onResetSimulation,
  onSwitchYear,
}) {
  const t = useTranslations('Analytics');
  const tGrade = useTranslations('GradeTable');

  const resolvedYearData = processedYearData || yearData;
  const strmKeys = Object.keys(resolvedYearData).map(Number);
  const maxStrm = strmKeys.length > 0 ? Math.max(...strmKeys) : null;
  const isSelectedYearActive = maxStrm !== null && parseInt(selectedYear, 10) === maxStrm;

  const [simFilter, setSimFilter] = useState('all');

  const semesterOptions = [
    { value: 'all', label: tGrade('semesters.all') },
    { value: 'SEM 1', label: tGrade('semesters.sem1') },
    { value: 'SEM 2', label: tGrade('semesters.sem2') },
  ];

  const activeFilterIndex = semesterOptions.findIndex(option => option.value === simFilter);

  useEffect(() => {
    const savedFilter = localStorage.getItem('usv_sim_filter');
    if (savedFilter) {
      setSimFilter(savedFilter);
    }
  }, []);

  // Group grades by semester category for the simulator display
  const sem1Courses = grades.filter(g => g.filterCategory === 'SEM 1');
  const sem2Courses = grades.filter(g => g.filterCategory === 'SEM 2');
  const otherCourses = grades.filter(g => g.filterCategory !== 'SEM 1' && g.filterCategory !== 'SEM 2');

  const renderRow = (grade) => {
    const origIdx = grade.originalIndex;
    const isSimulated = simulatedGrades[origIdx] !== undefined;
    const activeVal = isSimulated ? simulatedGrades[origIdx] : '';

    return (
      <tr key={origIdx} className={isSimulated ? 'tr-simulated' : ''}>
        <td className="course">
          <div className="course-cell-wrapper">
            <span>{grade.titlu}</span>
            {isSimulated && (
              <span className="badge-simulated">{t('simulatedBadge')}</span>
            )}
            {grade.isBackPaper && (
              <span className="badge-backpaper" title={t('backPaperTitle')}>
                {t('backPaperBadge', { year: grade.originalYear ? strmToYearLabel(grade.originalYear) : '' })}
              </span>
            )}
          </div>
        </td>
        <td>
          <span className={`semester-pill ${grade.sesiune || grade.filterCategory ? '' : 'unknown'}`}>
            {grade.sesiune || grade.filterCategory || '—'}
          </span>
        </td>
        <td>{grade.credite || '—'}</td>
        <td className={`final ${parseFloat(grade.notaFinala) >= 5 ? 'pass' : parseFloat(grade.notaFinala) ? 'fail' : ''}`}>
          {grade.isEstimatedFinal ? (
            <span className="estimated-grade-badge" title={t('estimatedGradeTitle')}>
              {grade.notaFinala}<span className="est-star">*</span>
            </span>
          ) : (
            grade.notaFinala || '—'
          )}
        </td>
        <td>
          <div className="select-wrapper">
            <select
              value={activeVal}
              onChange={(e) => onSimulateGrade(origIdx, e.target.value)}
              className={`simulator-select ${isSimulated ? 'active' : ''}`}
            >
              <option value="">{t('selectEstimation')}</option>
              {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="analytics-container animate-fade">

      {/* ── KPI Statistics Grid ── */}
      <div className="analytics-kpi-grid">

        {/* Media Ponderată ECTS Anuală */}
        <div className="kpi-card">
          <div className="kpi-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5" />
            </svg>
          </div>
          <div className="kpi-info">
            <span>{t('kpiEcts')}</span>
            <strong
              data-animate-value={arithmeticAnalysis.ectsAll.average !== null ? arithmeticAnalysis.ectsAll.average : ''}
              data-animate-decimals={2}
            >
              {arithmeticAnalysis.ectsAll.average !== null
                ? arithmeticAnalysis.ectsAll.average.toFixed(2)
                : '—'}
            </strong>
            <p>
              {t('kpiEctsCredits', { count: arithmeticAnalysis.ectsAll.totalCredits })}
            </p>
          </div>
        </div>

        {/* Puncte Credit Anual */}
        <div className="kpi-card">
          <div className="kpi-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="kpi-info">
            <span>{t('kpiPoints')}</span>
            <strong
              data-animate-value={arithmeticAnalysis.ectsAll.totalPoints || 0}
            >
              {arithmeticAnalysis.ectsAll.totalPoints || 0}
            </strong>
            <p>
              {t('kpiPointsDetail')}
            </p>
          </div>
        </div>

        {/* Medie anuală aritmetică */}
        <div className="kpi-card">
          <div className="kpi-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
          <div className="kpi-info">
            <span>{t('kpiArithmetic')}</span>
            <strong
              data-animate-value={arithmeticAnalysis.all.average !== null ? arithmeticAnalysis.all.average : ''}
              data-animate-decimals={2}
            >
              {arithmeticAnalysis.all.average !== null
                ? arithmeticAnalysis.all.average.toFixed(2)
                : '—'}
            </strong>
            <p>
              {t('kpiArithmeticDetail', { count: arithmeticAnalysis.all.calculatedCount, total: arithmeticAnalysis.all.totalCount })}
            </p>
          </div>
        </div>

        {/* Medie SEM 1 */}
        <div className="kpi-card">
          <div className="kpi-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </div>
          <div className="kpi-info" style={{ width: '100%' }}>
            <span>{t('sem1')}</span>
            <div className="kpi-dual-values">
              <div>
                <strong
                  data-animate-value={arithmeticAnalysis.sem1.average !== null ? arithmeticAnalysis.sem1.average : ''}
                  data-animate-decimals={2}
                >
                  {arithmeticAnalysis.sem1.average !== null
                    ? arithmeticAnalysis.sem1.average.toFixed(2)
                    : '—'}
                </strong>
                <p className="kpi-label-sub">{t('arithmetic')}</p>
              </div>
              <div className="kpi-separator" />
              <div>
                <strong
                  data-animate-value={arithmeticAnalysis.ectsSem1.average !== null ? arithmeticAnalysis.ectsSem1.average : ''}
                  data-animate-decimals={2}
                >
                  {arithmeticAnalysis.ectsSem1.average !== null
                    ? arithmeticAnalysis.ectsSem1.average.toFixed(2)
                    : '—'}
                </strong>
                <p className="kpi-label-sub">{t('ectsPond')}</p>
              </div>
            </div>
            <p className="kpi-footer-text">
              {arithmeticAnalysis.ectsSem1.totalPoints} {t('pointsLabel')} • {arithmeticAnalysis.ectsSem1.totalCredits} {t('creditsLabel')}
            </p>
          </div>
        </div>

        {/* Medie SEM 2 */}
        <div className="kpi-card">
          <div className="kpi-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </div>
          <div className="kpi-info" style={{ width: '100%' }}>
            <span>{t('sem2')}</span>
            <div className="kpi-dual-values">
              <div>
                <strong
                  data-animate-value={arithmeticAnalysis.sem2.average !== null ? arithmeticAnalysis.sem2.average : ''}
                  data-animate-decimals={2}
                >
                  {arithmeticAnalysis.sem2.average !== null
                    ? arithmeticAnalysis.sem2.average.toFixed(2)
                    : '—'}
                </strong>
                <p className="kpi-label-sub">{t('arithmetic')}</p>
              </div>
              <div className="kpi-separator" />
              <div>
                <strong
                  data-animate-value={arithmeticAnalysis.ectsSem2.average !== null ? arithmeticAnalysis.ectsSem2.average : ''}
                  data-animate-decimals={2}
                >
                  {arithmeticAnalysis.ectsSem2.average !== null
                    ? arithmeticAnalysis.ectsSem2.average.toFixed(2)
                    : '—'}
                </strong>
                <p className="kpi-label-sub">{t('ectsPond')}</p>
              </div>
            </div>
            <p className="kpi-footer-text">
              {arithmeticAnalysis.ectsSem2.totalPoints} {t('pointsLabel')} • {arithmeticAnalysis.ectsSem2.totalCredits} {t('creditsLabel')}
            </p>
          </div>
        </div>

      </div>

      {/* ── Warning banner: note lipsă în sesiune activă ── */}
      {isSelectedYearActive && arithmeticAnalysis.all.missingCount > 0 && (
        <div className="analytics-warning-banner">
          <div className="warning-banner-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <span>
            {t('warningMissingNotes', { count: arithmeticAnalysis.all.missingCount })}
          </span>
        </div>
      )}

      {/* ── Grade Simulator ── */}
      <div className="card simulator-card">
        <div className="card-header">
          <div className="card-title">
            <h2>{t('simulatorTitle')}</h2>
            <p>{t('simulatorSub')}</p>
          </div>
          {Object.keys(simulatedGrades).length > 0 && (
            <button
              type="button"
              onClick={onResetSimulation}
              className="btn-secondary"
            >
              {t('resetSimulation')}
            </button>
          )}
        </div>

        {/* Simulator controls */}
        <div className="grade-controls">
          <span className="control-label">{t('filterSemester')}</span>
          <div className="segmented-control" aria-label={t('filterSemester')}>
            {/* Sliding Background Capsule */}
            <div
              className="segmented-indicator"
              style={{
                transform: `translateX(${activeFilterIndex * 100}%)`,
              }}
            />
            {semesterOptions.map(option => {
              const count =
                option.value === 'all'
                  ? grades.length
                  : option.value === 'SEM 1'
                  ? sem1Courses.length
                  : sem2Courses.length;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`segmented-button ${simFilter === option.value ? 'active' : ''}`}
                  onClick={() => {
                    setSimFilter(option.value);
                    localStorage.setItem('usv_sim_filter', option.value);
                  }}
                  aria-pressed={simFilter === option.value}
                >
                  <span>{option.label}</span>
                  <span className="count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{t('thDiscipline')}</th>
                <th>{t('thSemester')}</th>
                <th>{t('thCredits')}</th>
                <th>{t('thRealGrade')}</th>
                <th style={{ width: '200px' }}>{t('thEstimatedGrade')}</th>
              </tr>
            </thead>
            <tbody>
              {(simFilter === 'all' || simFilter === 'SEM 1') && sem1Courses.length > 0 && (
                <>
                  {simFilter === 'all' && (
                    <tr className="semester-section-row">
                      <td colSpan="5">{t('sem1')}</td>
                    </tr>
                  )}
                  {sem1Courses.map(renderRow)}
                </>
              )}
              {(simFilter === 'all' || simFilter === 'SEM 2') && sem2Courses.length > 0 && (
                <>
                  {simFilter === 'all' && (
                    <tr className="semester-section-row">
                      <td colSpan="5">{t('sem2')}</td>
                    </tr>
                  )}
                  {sem2Courses.map(renderRow)}
                </>
              )}
              {simFilter === 'all' && otherCourses.length > 0 && (
                <>
                  <tr className="semester-section-row">
                    <td colSpan="5">{t('otherSemesterSection')}</td>
                  </tr>
                  {otherCourses.map(renderRow)}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Evolution Timeline (apare când există mai mulți ani) ── */}
      {Object.keys(resolvedYearData).length > 1 && (
        <div className="card evolution-card">
          <div className="card-header">
            <div className="card-title">
              <h2>{t('evolutionTitle')}</h2>
              <p>{t('evolutionSub')}</p>
            </div>
          </div>
          <div className="evolution-timeline">
            <div className="timeline-global-line" />
            {Object.keys(resolvedYearData)
              .sort((a, b) => parseInt(b, 10) - parseInt(a, 10))
              .map(strm => {
                const strmGrades = resolvedYearData[strm] || [];
                const isActiveYear = selectedYear === strm;
                const isLatestYear = maxStrm !== null && parseInt(strm, 10) === maxStrm;

                // Group duplicate sessions by course title + semester to count unique subjects
                const groupedStrmGrades = groupGrades(strmGrades);

                let passedCount = 0;
                let failedCount = 0;

                groupedStrmGrades.forEach(grade => {
                  // Exclude back papers from this year's timeline counts
                  if (grade.isBackPaper) return;

                  const nota = parseFloat(grade.notaFinala);
                  if (!isNaN(nota) && nota >= 5 && nota <= 10) {
                    passedCount++;
                  } else {
                    const isExplicitFail = !isNaN(nota) && nota < 5;
                    const isAbsent = String(grade.notaFinala).toUpperCase() === 'ABS';
                    
                    if (isExplicitFail || isAbsent) {
                      failedCount++;
                    } else if (!isLatestYear) {
                      // For past academic years, empty/missing grades are counted as failed (restanțe)
                      failedCount++;
                    }
                  }
                });

                // Calculate the academic average purely from the grouped unique subjects
                const allGradedValues = groupedStrmGrades
                  .filter(g => !g.isBackPaper)
                  .map(g => parseFloat(g.notaFinala))
                  .filter(n => !isNaN(n) && n >= 1 && n <= 10);

                const strmSum = allGradedValues.reduce((acc, val) => acc + val, 0);
                const strmAvg = allGradedValues.length > 0
                  ? (strmSum / allGradedValues.length).toFixed(2)
                  : null;

                // Calculate ECTS average and points for this timeline year
                const groupedStrmGradesIndexed = groupedStrmGrades.map((g, idx) => ({ ...g, originalIndex: idx }));
                const isTimelineSelectedActive = selectedYear === strm;
                const ectsStats = calculateEctsStats(groupedStrmGradesIndexed, simulatedGrades, isLatestYear, isTimelineSelectedActive);

                return (
                  <div key={strm} className={`timeline-item ${isActiveYear ? 'active' : ''}`}>
                    <div className="timeline-dot" />
                    <div
                      className="timeline-content"
                      onClick={() => !isActiveYear && onSwitchYear(strm)}
                      role={isActiveYear ? undefined : "button"}
                      tabIndex={isActiveYear ? undefined : 0}
                      onKeyDown={(e) => {
                        if (!isActiveYear && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          onSwitchYear(strm);
                        }
                      }}
                      title={isActiveYear ? undefined : t('showGradesTitle', { year: strmToYearLabel(strm) })}
                    >
                      <div className="timeline-content-header">
                        <h3>{t('evolutionYearLabel', { year: strmToYearLabel(strm) })}</h3>
                        {isActiveYear && (
                          <span className="badge-timeline-active">{t('selectedYearBadge')}</span>
                        )}
                      </div>
                      <div className="timeline-stats">
                        <div className="timeline-stat">
                          <span className="stat-label">{t('arithmeticAverage')}</span>
                          <strong className="stat-value">
                            {strmAvg !== null ? strmAvg : '—'}
                          </strong>
                        </div>
                        <div className="timeline-stat">
                          <span className="stat-label">{t('ectsAverage')}</span>
                          <strong className="stat-value" style={{ color: 'var(--blue)' }}>
                            {ectsStats.average !== null ? ectsStats.average.toFixed(2) : '—'}
                          </strong>
                        </div>
                        <div className="timeline-stat">
                          <span className="stat-label">{t('kpiPoints')}</span>
                          <strong className="stat-value" style={{ color: 'var(--blue)' }}>
                            {ectsStats.totalPoints}
                          </strong>
                        </div>
                        <div className="timeline-stat">
                          <span className="stat-label">{t('passed')}</span>
                          <strong className="stat-value">
                            {passedCount} / {groupedStrmGrades.filter(g => !g.isBackPaper).length}
                          </strong>
                        </div>
                        {failedCount > 0 && (
                          <div className="timeline-stat">
                            <span className="stat-label">{t('backlog')}</span>
                            <strong className="stat-value restante">{failedCount}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

    </div>
  );
}
