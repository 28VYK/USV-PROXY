/**
 * USV Portal — Grade Formatting & Display Utilities
 *
 * Pure helper functions for formatting academic data for display.
 * No React dependencies — safe to import anywhere.
 */

/** Semester filter options used in the semester segmented control. */
export const SEMESTER_OPTIONS = [
  { value: 'all', label: 'Toate' },
  { value: 'SEM 1', label: 'SEM 1' },
  { value: 'SEM 2', label: 'SEM 2' },
];

/** Internal sort priority map for semester categories. */
export const SEMESTER_ORDER = {
  'SEM 1': 1,
  'SEM 2': 2,
  'OTHER': 3,
};

/**
 * Normalize a grade text value for comparison:
 * strips diacritics and converts to uppercase.
 * @param {string} value
 * @returns {string}
 */
export function normalizeGradeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

/**
 * Detect which semester filter category a row of cells belongs to.
 * @param {string[]} cells - Array of cell text values from a grade row.
 * @returns {'SEM 1' | 'SEM 2' | 'OTHER'}
 */
export function detectFilterCategory(cells) {
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

/**
 * Returns the sort order number for a given semester category.
 * @param {string} semester
 * @returns {number}
 */
export function getSemesterOrder(semester) {
  return SEMESTER_ORDER[semester] || 99;
}

/**
 * Convert a 4-digit STRM code to a human-readable academic year label.
 * e.g. '2024' → '2024-2025'
 * @param {string} strm
 * @returns {string}
 */
export function strmToYearLabel(strm) {
  const y = parseInt(strm, 10);
  return isNaN(y) ? strm : `${y}-${y + 1}`;
}

/**
 * Format a raw USV userid into a human-readable display name.
 * e.g. "PRENUME.NUME1" → "Prenume Nume"
 *      "prenume.nume@student.usv.ro" → "Prenume Nume"
 * @param {string} uid
 * @returns {string}
 */
export function formatUseridAsName(uid) {
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
 * Regex pattern matching PeopleSoft page titles that should never be
 * treated as student names (e.g. "Vizualizarea notelor mele").
 */
export const PS_PAGE_TITLE_PATTERN =
  /vizualiz|notelor|my grade|sign.in|portal|bun\s*venit|oracle|peoplesoft/i;

/**
 * Calculate the estimated final grade based on curs (course) and seminar grades
 * weighted by the pondere (weights) percentage string (e.g., "60% / 40%").
 * Returns the rounded final grade as a string, or null if cannot be calculated.
 * @param {Object} grade
 * @returns {string | null}
 */
export function calculateEstimatedFinalGrade(grade) {
  if (grade.notaFinala && grade.notaFinala !== '—' && grade.notaFinala.trim() !== '') {
    return null;
  }
  
  const curs = parseFloat(grade.notaCurs);
  const sem = parseFloat(grade.notaSeminar);
  
  if (!isNaN(curs) && !isNaN(sem)) {
    const match = String(grade.pondere || '').match(/(\d+)%\s*\/\s*(\d+)%/);
    if (match) {
      const weightCurs = parseInt(match[1], 10) / 100;
      const weightSem = parseInt(match[2], 10) / 100;
      const weighted = curs * weightCurs + sem * weightSem;
      return String(Math.round(weighted));
    }
  }
  
  return null;
}
