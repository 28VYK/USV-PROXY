import { useTranslations } from 'next-intl';

/**
 * GradeTable — Card cu tabelul de note, year bar și filtru de semestru.
 *
 * @param {{
 *   grades: Array,
 *   displayedGrades: Array,
 *   yearData: Object,
 *   selectedYear: string,
 *   loadingYears: boolean,
 *   loading: boolean,
 *   semesterFilter: string,
 *   semesterCounts: Object,
 *   onRefresh: () => void,
 *   onSwitchYear: (strm: string) => void,
 *   onSemesterChange: (value: string) => void,
 * }} props
 */
export default function GradeTable({
  grades,
  displayedGrades,
  loading,
  semesterFilter,
  semesterCounts,
  onSemesterChange,
}) {
  const t = useTranslations('GradeTable');

  const semesterOptions = [
    { value: 'all', label: t('semesters.all') },
    { value: 'SEM 1', label: t('semesters.sem1') },
    { value: 'SEM 2', label: t('semesters.sem2') },
  ];

  // Find index of the active option to drive the sliding indicator
  const activeIndex = semesterOptions.findIndex(option => option.value === semesterFilter);

  return (
    <div className="grade-table-content animate-fade">
      {/* ── Conținut principal ── */}
      {loading ? (
        /* ── Modern Shimmer Skeleton Loader ── */
        <div className="skeleton-container">
          <div className="skeleton-controls">
            <div className="skeleton-label"></div>
            <div className="skeleton-segmented"></div>
          </div>
          <div className="table-wrapper">
            <table className="skeleton-table">
              <thead>
                <tr>
                  <th>{t('discipline')}</th>
                  <th>{t('semester')}</th>
                  <th>{t('weight')}</th>
                  <th>{t('course')}</th>
                  <th>{t('seminar')}</th>
                  <th>{t('final')}</th>
                  <th>{t('credits')}</th>
                  <th>{t('points')}</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <tr key={i}>
                    <td className="course">
                      <div className="skeleton-bar title"></div>
                    </td>
                    <td>
                      <div className="skeleton-bar pill"></div>
                    </td>
                    <td className="muted">
                      <div className="skeleton-bar small"></div>
                    </td>
                    <td>
                      <div className="skeleton-bar small"></div>
                    </td>
                    <td>
                      <div className="skeleton-bar small"></div>
                    </td>
                    <td className="final">
                      <div className="skeleton-bar final-pill"></div>
                    </td>
                    <td>
                      <div className="skeleton-bar small"></div>
                    </td>
                    <td className="points">
                      <div className="skeleton-bar small"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : grades.length > 0 ? (
        <>
          {/* Filtru semestru */}
          <div className="grade-controls">
            <span className="control-label">{t('semester')}</span>
            <div className="segmented-control" aria-label={t('semester')}>
              {/* Sliding Background Capsule */}
              <div
                className="segmented-indicator"
                style={{
                  transform: `translateX(${activeIndex * 100}%)`,
                }}
              />
              {semesterOptions.map(option => {
                const count =
                  option.value === 'all'
                    ? grades.length
                    : semesterCounts[option.value] || 0;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`segmented-button ${semesterFilter === option.value ? 'active' : ''}`}
                    onClick={() => onSemesterChange(option.value)}
                    aria-pressed={semesterFilter === option.value}
                  >
                    <span>{option.label}</span>
                    <span className="count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tabel sau stare goală */}
          {displayedGrades.length > 0 ? (
            <div className="table-wrapper animate-fade">
              <table>
                <thead>
                  <tr>
                    <th>{t('discipline')}</th>
                    <th>{t('semester')}</th>
                    <th>{t('weight')}</th>
                    <th>{t('course')}</th>
                    <th>{t('seminar')}</th>
                    <th>{t('final')}</th>
                    <th>{t('credits')}</th>
                    <th>{t('points')}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedGrades.map((grade) => (
                    <tr key={grade.originalIndex}>
                      <td className="course">{grade.titlu}</td>
                      <td title={grade.sesiune}>
                        <span
                          className={`semester-pill ${
                            grade.sesiune || grade.filterCategory ? '' : 'unknown'
                          }`}
                        >
                          {grade.sesiune || grade.filterCategory || '—'}
                        </span>
                      </td>
                      <td className="muted">{grade.pondere}</td>
                      <td>{grade.notaCurs || '—'}</td>
                      <td>{grade.notaSeminar || '—'}</td>
                      <td
                        className={`final ${
                          parseFloat(grade.notaFinala) >= 5
                            ? 'pass'
                            : parseFloat(grade.notaFinala)
                            ? 'fail'
                            : ''
                        }`}
                      >
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
            <div className="empty-state compact animate-fade">
              <p>
                {t('emptyState', {
                  semester: semesterFilter === 'all' ? t('semesters.all') : semesterFilter
                })}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state animate-fade">
          <p>{t('errorLoading')}</p>
        </div>
      )}
    </div>
  );
}
