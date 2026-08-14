/**
 * LanguageSwitcher — Elegant language toggle button in the header.
 * Following the project's stateless conventions (props only).
 * 
 * @param {{ locale: string, onToggle: () => void }} props
 */
export default function LanguageSwitcher({ locale, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="btn-lang-toggle"
      title={locale === 'ro' ? 'Switch to English' : 'Comută în Română'}
    >
      {locale.toUpperCase()}
    </button>
  );
}
