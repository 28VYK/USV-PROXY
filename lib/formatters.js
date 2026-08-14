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

/**
 * Processes the multi-year yearData object to identify back papers (recontracted courses)
 * and resolve/back-propagate grades to their original years.
 *
 * @param {Object} yearData - Raw academic year data map { [strm]: grades[] }
 * @param {Object} simulatedGrades - Simulated grades map for current year
 * @param {string} selectedYear - Currently active STRM year
 * @returns {Object} Enriched year data map with correct references
 */
export function processMultiYearAcademicData(yearData, simulatedGrades = {}, selectedYear = '') {
  const processedData = {};
  const allStrms = Object.keys(yearData).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  // Initialize processed structure
  allStrms.forEach(strm => {
    processedData[strm] = (yearData[strm] || []).map((grade, idx) => ({
      ...grade,
      originalIndex: idx,
      isBackPaper: false,
      originalYear: null,
      resolvedNotaFinala: grade.notaFinala
    }));
  });

  // Track if a course has been passed in any year before the current strm
  allStrms.forEach((strm, strmIdx) => {
    processedData[strm].forEach(grade => {
      const title = grade.titlu;
      
      let appearedBefore = false;
      let passedBefore = false;
      let earliestYear = null;

      for (let i = 0; i < strmIdx; i++) {
        const prevStrm = allStrms[i];
        const prevAttempts = processedData[prevStrm].filter(c => c.titlu === title);
        
        if (prevAttempts.length > 0) {
          appearedBefore = true;
          if (!earliestYear) earliestYear = prevStrm;
          
          // Check if any attempt in this previous year was passed (original grade >= 5)
          const hasPassedAttempt = prevAttempts.some(attempt => {
            const nota = parseFloat(attempt.notaFinala);
            return !isNaN(nota) && nota >= 5 && nota <= 10;
          });
          
          if (hasPassedAttempt) {
            passedBefore = true;
          }
        }
      }

      if (appearedBefore && !passedBefore) {
        // This is a back paper in the current year because it was not passed in previous years
        grade.isBackPaper = true;
        grade.originalYear = earliestYear;
      }
    });
  });

  // Back-propagate grades from recontracted years to original years
  allStrms.forEach(strm => {
    processedData[strm].forEach(grade => {
      if (grade.isBackPaper && grade.originalYear) {
        const origYear = grade.originalYear;
        // Determine the grade achieved (simulated or real) in the recontracted year
        let activeGradeStr = grade.notaFinala || '';
        if (strm === selectedYear && simulatedGrades[grade.originalIndex] !== undefined) {
          activeGradeStr = String(simulatedGrades[grade.originalIndex]);
        }

        const activeParsed = parseFloat(activeGradeStr);
        const activeValid = !isNaN(activeParsed) && activeParsed >= 1 && activeParsed <= 10;

        // Find the target course in the original year and update it if the new grade is better
        if (processedData[origYear]) {
          const origCourse = processedData[origYear].find(c => c.titlu === grade.titlu);
          if (origCourse) {
            const currentOrigParsed = parseFloat(origCourse.resolvedNotaFinala);
            const currentOrigValid = !isNaN(currentOrigParsed) && currentOrigParsed >= 1 && currentOrigParsed <= 10;

            let shouldUpdate = false;
            if (activeValid && !currentOrigValid) {
              shouldUpdate = true;
            } else if (activeValid && currentOrigValid && activeParsed > currentOrigParsed) {
              shouldUpdate = true;
            }

            if (shouldUpdate) {
              origCourse.resolvedNotaFinala = activeGradeStr;
              origCourse.isUpdatedFromRecontract = true;
            }
          }
        }
      }
    });
  });

  return processedData;
}

/**
 * Calculate ECTS-weighted statistics for a list of grades.
 * Accounts for simulated grades, administrative placeholders (99), absences (ABS),
 * and missing grades (differently depending on whether it is the latest/current year or a past year).
 * 
 * @param {Array} gradesList - List of course/grade objects.
 * @param {Object} simulatedGrades - Map of course index to simulated grade value.
 * @param {boolean} isLatestYear - Whether calculating for the current/active academic year.
 * @param {boolean} isSelectedYearActive - Whether calculating for the currently active/selected year view.
 * @returns {{average: number|null, totalPoints: number, totalCredits: number}}
 */
export function calculateEctsStats(gradesList, simulatedGrades = {}, isLatestYear = false, isSelectedYearActive = false) {
  let totalCredits = 0;
  let weightedSum = 0;
  let totalPoints = 0;

  gradesList.forEach(grade => {
    // Exclude back papers (restante din anii anteriori) from the current year's statistics
    if (grade.isBackPaper) return;

    // Get the grade value (either simulated or actual)
    const simulated = isSelectedYearActive ? simulatedGrades[grade.originalIndex] : undefined;
    const gradeStr = simulated !== undefined ? String(simulated) : (grade.resolvedNotaFinala || grade.notaFinala || '');
    
    // Ignore administrative placeholder grade '99'
    const parsedGrade = parseFloat(gradeStr);
    if (parsedGrade === 99) return;

    const credits = parseFloat(grade.credite) || 0;

    // 2. Evaluate the grade based on presence and value
    const isAbs = gradeStr.toUpperCase() === 'ABS';
    const isMissing = !gradeStr || gradeStr === '—' || gradeStr.trim() === '';

    let calculationGrade = 0;
    let shouldIncludeInDenominator = true;

    if (parsedGrade >= 1 && parsedGrade <= 10) {
      calculationGrade = parsedGrade;
    } else if (isAbs) {
      calculationGrade = 0;
    } else if (isMissing) {
      if (isLatestYear) {
        // For the current academic year, ignore courses with missing grades to avoid penalization
        shouldIncludeInDenominator = false;
        calculationGrade = 0;
      } else {
        // For past academic years, a missing grade represents an outstanding back paper (0 points, credits count)
        calculationGrade = 0;
      }
    }

    if (shouldIncludeInDenominator) {
      weightedSum += calculationGrade * credits;
      totalCredits += credits;
      if (calculationGrade >= 5) {
        totalPoints += calculationGrade * credits;
      }
    }
  });

  const average = totalCredits > 0 ? parseFloat((weightedSum / totalCredits).toFixed(2)) : null;

  return {
    average,
    totalPoints,
    totalCredits
  };
}
