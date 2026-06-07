import Link from 'next/link';
import { useTranslations } from 'next-intl';

/**
 * CookieBanner — Informational banner for the strictly necessary cookie PS_PROXY_SESSION.
 * 
 * @param {{ isVisible: boolean, onAccept: () => void }} props
 */
export default function CookieBanner({ isVisible, onAccept }) {
  const t = useTranslations('CookieBanner');

  return (
    <div className={`cookie-banner ${isVisible ? 'visible' : ''}`}>
      <div className="cookie-banner-content">
        <div className="cookie-banner-text">
          <div className="cookie-icon-wrapper">
            <svg 
              className="cookie-icon-svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              width="18" 
              height="18"
            >
              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
              <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
              <circle cx="16.5" cy="15.5" r="1.5" fill="currentColor" />
              <circle cx="12" cy="13" r="1" fill="currentColor" />
              <circle cx="10.5" cy="17.5" r="1" fill="currentColor" />
              <circle cx="6.5" cy="13.5" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <p>
            {t('text')}
            <Link href="/privacy" legacyBehavior>
              <a className="cookie-link">{t('linkText')}</a>
            </Link>
            .
          </p>
        </div>
        <button className="btn-cookie-accept" onClick={onAccept}>
          {t('accept')}
        </button>
      </div>
    </div>
  );
}
