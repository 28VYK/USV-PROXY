import { useTranslations } from 'next-intl';

/**
 * DonateModal — Modal de susținere a proiectului USV Portal
 *
 * @param {{ onClose: () => void }} props
 */
export default function DonateModal({ onClose }) {
  const t = useTranslations('DonateModal');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon-container">
          <svg
            className="modal-icon-svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="24"
            height="24"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </div>

        <div className="modal-header">
          <h2>{t('title')}</h2>
        </div>

        <div className="modal-body">
          <p>{t('p1')}</p>
          <p>{t('p2')}</p>
          <p>{t('p3')}</p>
        </div>

        <div className="modal-actions">
          <a
            href="https://revolut.me/28vik/pocket/dOomdzRh2c"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-modal-donate"
            onClick={onClose}
          >
            {t('btnDonate')}
          </a>
          <button onClick={onClose} className="btn-modal-close">
            {t('btnLater')}
          </button>
        </div>
      </div>
    </div>
  );
}
