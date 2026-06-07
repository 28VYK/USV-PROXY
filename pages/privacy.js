import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Privacy() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Privacy');
  const tCommon = useTranslations('Common');

  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Initialize Theme - manual choice only
    const savedTheme = localStorage.getItem('usv_theme') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, []);

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

  const toggleLocale = () => {
    const nextLocale = locale === 'ro' ? 'en' : 'ro';
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.replace(router.asPath);
  };

  return (
    <>
      <Head>
        <title>{t('pageTitle')}</title>
        <meta name="description" content={t('metaDesc')} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        
        {/* Favicon & Icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://noteusv.tech/privacy" />
        
        {/* Google Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@600;700;800&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet" />
      </Head>

      <div className="app legal-page" data-theme={theme}>
        {/* Header */}
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
              <LanguageSwitcher locale={locale} onToggle={toggleLocale} />
              <button
                onClick={toggleTheme}
                className="btn-theme-toggle"
                title={theme === 'dark' ? tCommon('lightMode') : tCommon('darkMode')}
                style={{ marginLeft: '8px' }}
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
            </div>
          </div>
        </header>

        <main className="main">
          <article className="doc">

            {/* Title block */}
            <div className="doc-header">
              <p className="doc-label">{t('updatedLabel')}</p>
              <h1 dangerouslySetInnerHTML={{ __html: t('title').replace('\n', '<br />') }} />
              <p className="doc-subtitle">{t('subtitle')}</p>
            </div>

            <div className="divider" />

            {/* Section 1 */}
            <section className="section">
              <h2>{t('sec1Title')}</h2>
              <p dangerouslySetInnerHTML={{ __html: t('sec1Text1') }} />
              <p>{t('sec1Text2')}</p>
            </section>

            {/* Section 2 */}
            <section className="section">
              <h2>{t('sec2Title')}</h2>
              <div className="flow">
                <div className="flow-step">
                  <span className="flow-index">01</span>
                  <p>{t('step1')}</p>
                </div>
                <div className="flow-step">
                  <span className="flow-index">02</span>
                  <p dangerouslySetInnerHTML={{ __html: t('step2') }} />
                </div>
                <div className="flow-step">
                  <span className="flow-index">03</span>
                  <p>{t('step3')}</p>
                </div>
              </div>
              <p className="note" dangerouslySetInnerHTML={{ __html: t('statelessNote') }} />
            </section>

            {/* Section 3 */}
            <section className="section">
              <h2>{t('sec3Title')}</h2>
              <p dangerouslySetInnerHTML={{ __html: t('sec3Text') }} />
              <div className="callout">
                <p><strong>{t('securityRecommendations')}</strong></p>
                <ul>
                  <li>{t('rec1')}</li>
                  <li>{t('rec2')}</li>
                  <li>{t('rec3')}</li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section className="section">
              <h2>{t('sec4Title')}</h2>
              <p>{t('sec4Text')}</p>
              <ul>
                <li>{t('disclaimer1')}</li>
                <li>{t('disclaimer2')}</li>
                <li>{t('disclaimer3')}</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="section">
              <h2>{t('sec5Title')}</h2>
              <p>{t('sec5Text')}</p>
              <ul>
                <li dangerouslySetInnerHTML={{ __html: t('cookieDetail') }} />
              </ul>
              <p>{t('cookieMarketing')}</p>
            </section>

            {/* Section 6 */}
            <section className="section">
              <h2>{t('sec6Title')}</h2>
              <p dangerouslySetInnerHTML={{ __html: t('sec6Text1') }} />
              <p>{t('sec6Text2')}</p>
            </section>

            <div className="divider" />

            <footer className="doc-footer">
              <Link href="/" legacyBehavior>
                <a className="btn-back">{t('btnBack')}</a>
              </Link>
              <Link href="/terms" legacyBehavior>
                <a className="btn-back">{t('btnTerms')}</a>
              </Link>
            </footer>

          </article>
        </main>
      </div>
    </>
  );
}
