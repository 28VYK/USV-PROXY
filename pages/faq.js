import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function FAQ() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('FAQ');
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

  // Structured Schema for SEO Rich Snippets (FAQPage + BreadcrumbList + dateModified)
  const faqSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://noteusv.tech/faq",
        "url": "https://noteusv.tech/faq",
        "name": t('pageTitle'),
        "description": t('metaDesc'),
        "dateModified": "2026-06-08T11:54:00+03:00"
      },
      {
        "@type": "FAQPage",
        "@id": "https://noteusv.tech/faq#faq",
        "isPartOf": {
          "@id": "https://noteusv.tech/faq"
        },
        "mainEntity": [
          {
            "@type": "Question",
            "name": t('q1'),
            "acceptedAnswer": {
              "@type": "Answer",
              "text": t('a1')
            }
          },
          {
            "@type": "Question",
            "name": t('q2'),
            "acceptedAnswer": {
              "@type": "Answer",
              "text": t('a2')
            }
          },
          {
            "@type": "Question",
            "name": t('q3'),
            "acceptedAnswer": {
              "@type": "Answer",
              "text": t('a3')
            }
          },
          {
            "@type": "Question",
            "name": t('q4'),
            "acceptedAnswer": {
              "@type": "Answer",
              "text": t('a4')
            }
          },
          {
            "@type": "Question",
            "name": t('q5'),
            "acceptedAnswer": {
              "@type": "Answer",
              "text": t('a5')
            }
          },
          {
            "@type": "Question",
            "name": t('q6'),
            "acceptedAnswer": {
              "@type": "Answer",
              "text": t('a6')
            }
          }
        ]
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://noteusv.tech/faq#breadcrumb",
        "isPartOf": {
          "@id": "https://noteusv.tech/faq"
        },
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": locale === 'ro' ? 'Acasă' : 'Home',
            "item": "https://noteusv.tech/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "FAQ",
            "item": "https://noteusv.tech/faq"
          }
        ]
      }
    ]
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
        <link rel="canonical" href="https://noteusv.tech/faq" />
        
        {/* Google Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@600;700;800&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet" />

        {/* Structured Data injection */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </Head>

      <div className="app legal-page" data-theme={theme}>
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <Link href="/" legacyBehavior>
              <a className="logo">
                <div className="logo-icon-wrapper">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="logo-svg">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5" />
                  </svg>
                </div>
                <span className="logo-highlight">USV</span>
                <span className="logo-text">Portal</span>
              </a>
            </Link>

            <div className="header-actions">
              <Link href="/orar" legacyBehavior>
                <a className="nav-link">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{tCommon('timetable')}</span>
                </a>
              </Link>

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

            {/* FAQ Accordion Section using native details/summary */}
            <div className="faq-container">
              <details>
                <summary>{t('q1')}</summary>
                <div className="faq-content">
                  <p>{t('a1')}</p>
                </div>
              </details>

              <details>
                <summary>{t('q2')}</summary>
                <div className="faq-content">
                  <p>{t('a2')}</p>
                </div>
              </details>

              <details>
                <summary>{t('q3')}</summary>
                <div className="faq-content">
                  <p>{t('a3')}</p>
                </div>
              </details>

              <details>
                <summary>{t('q4')}</summary>
                <div className="faq-content">
                  <p>{t('a4')}</p>
                </div>
              </details>

              <details>
                <summary>{t('q5')}</summary>
                <div className="faq-content">
                  <p>{t('a5')}</p>
                </div>
              </details>

              <details>
                <summary>{t('q6')}</summary>
                <div className="faq-content">
                  <p dangerouslySetInnerHTML={{ __html: t('a6') }} />
                </div>
              </details>
            </div>

            <div className="divider" />

            <footer className="doc-footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <Link href="/" legacyBehavior>
                <a className="btn-back">{t('btnBack')}</a>
              </Link>
              <Link href="/privacy" legacyBehavior>
                <a className="btn-back">{t('btnPrivacy')}</a>
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
