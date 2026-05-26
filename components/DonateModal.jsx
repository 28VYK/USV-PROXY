/**
 * DonateModal — Modal de susținere a proiectului USV Portal
 *
 * @param {{ onClose: () => void }} props
 */
export default function DonateModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="eyebrow-accent">Comunitate</span>
          <h2>Susține Proiectul USV Portal</h2>
        </div>

        <div className="modal-body">
          <p>
            Acest proiect este 100% independent și open-source, creat special pentru a face viața viitorilor colegi de facultate mult mai ușoară!
          </p>
          <p>
            Datorită lui, oricine își poate verifica situația școlară instant, direct de pe telefon sau laptop, fără a fi nevoie să configureze manual VPN-ul greoi al universității sau să se mai lovească de erorile de certificat TLS învechit pe browserele moderne.
          </p>
          <p>
            Pentru a menține platforma online, rapidă și gratuită pentru toată lumea, avem nevoie de susținerea ta. Orice contribuție ne ajută să acoperim costurile lunare de găzduire pe serverul VPS și lucrările de întreținere!
          </p>
        </div>

        <div className="modal-actions">
          <a
            href="https://revolut.me/28vik/pocket/dOomdzRh2c"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-modal-donate"
            onClick={onClose}
          >
            Donează pe Revolut
          </a>
          <button onClick={onClose} className="btn-modal-close">
            Mai târziu
          </button>
        </div>
      </div>
    </div>
  );
}
