/**
 * USV Portal — PeopleSoft HTML Grade Parser
 *
 * Parses raw PeopleSoft HTML pages to extract grade rows and session context.
 * Pure functions — no React, no side effects. Safe to import anywhere.
 */

import { detectFilterCategory } from './formatters';

/**
 * Parse grade rows from a PeopleSoft grades page HTML string.
 * Extracts all valid grade rows (minimum 5 columns) and maps them
 * to a structured grade object.
 *
 * @param {string} html - Raw HTML string from PeopleSoft grades page.
 * @returns {{ grades: Array<{
 *   titlu: string,
 *   sesiune: string,
 *   filterCategory: 'SEM 1'|'SEM 2'|'OTHER',
 *   pondere: string,
 *   notaCurs: string,
 *   notaSeminar: string,
 *   notaFinala: string,
 *   credite: string,
 *   puncte: string,
 * }> }}
 */
export function parseGradesFromHtml(html) {
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
      // Ensure it's not a generic layout row by checking for category,
      // percentage symbol, or FSEAP identifier
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
 * Extract PeopleSoft session context from a grades page HTML string.
 * Parses the strCurrUrl JS variable that PeopleSoft injects into every page.
 *
 * @param {string} html - Raw HTML string from PeopleSoft grades page.
 * @returns {{ emplid: string, acadCareer: string, institution: string, currentStrm: string } | null}
 */
export function extractPsContextFromHtml(html) {
  try {
    const m = html.match(/strCurrUrl\s*=\s*['\"](https?:[^'\"]+)['"]/i);
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
