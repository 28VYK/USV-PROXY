import { SEMESTER_OPTIONS, strmToYearLabel } from '../lib/formatters';

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
  return (
    <div className="grade-table-content">
      {/* ── Conținut principal ── */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Se încarcă datele...</p>
        </div>
      ) : grades.length > 0 ? (
        <>
          {/* Filtru semestru */}
          <div className="grade-controls">
            <span className="control-label">Semestru</span>
            <div className="segmented-control" aria-label="Semestru">
              {SEMESTER_OPTIONS.map(option => {
                const count =
                  option.value === 'all'
                    ? grades.length
                    : semesterCounts[option.value] || 0;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={semesterFilter === option.value ? 'active' : ''}
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
            <div className="empty-state compact">
              <p>Nu există note pentru {semesterFilter}.</p>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <p>Nu am putut încărca notele. Încearcă din nou.</p>
        </div>
      )}
    </div>
  );
}
