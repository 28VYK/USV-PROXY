# USV Portal 🎓

<p align="left">
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/Licen%C8%9B%C4%83-MIT-6366f1?style=flat-square" alt="Licență: MIT" />
  </a>
  <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat-square&logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/Caddy-Reverse_Proxy-00E5FF?style=flat-square&logo=caddy" alt="Caddy" />
  <img src="https://img.shields.io/badge/OpenVPN-Secure_Tunnel-EA7B00?style=flat-square&logo=openvpn" alt="OpenVPN" />
</p>

> Portal neoficial pentru accesarea platformei `scolaritate.usv.ro` din orice browser modern, fără VPN local.

**Dezvoltat de:** [Vichiriuc Adrian](https://github.com/28VYK) (@28VYK)  

**[→ noteusv.tech](https://noteusv.tech)** — live, gratuit, doar pentru studenții USV.

---

## ⚠️ Disclaimer

**Acest proiect nu este afiliat oficial cu Universitatea „Ștefan cel Mare" Suceava.**
Este o soluție independentă (Proof of Concept) creată de un student, utilizată pe propria răspundere.

Platforma funcționează ca **reverse proxy** — cererile (inclusiv credențialele) trec temporar prin serverul nostru, exclusiv în memorie, fără stocare persistentă.
Codul este complet open-source.

→ [Politică de Confidențialitate](./docs/PRIVACY.md) · [Politică de Securitate](./docs/SECURITY.md) · [Ghid de Contribuție](./docs/CONTRIBUTING.md) · [Credite & Autori](./docs/CREDITS.md)

---

## 🔴 Problema

`scolaritate.usv.ro` folosește TLS 1.0 — blocat de toate browserele moderne:

```
Chrome  → ERR_SSL_VERSION_OR_CIPHER_MISMATCH
Firefox → SSL_ERROR_NO_CYPHER_OVERLAP
```

USV Portal rezolvă asta intermediind conexiunea pe server (via VPN intern USV), expunând o interfață modernă și accesibilă.

---

## 🚀 Rulare locală

```bash
git clone https://github.com/28VYK/USV-PROXY.git
cd USV-PROXY

# Configurează .env cu credentialele VPN (vezi .env.example)
# Adaugă fișierul usv2.ovpn în vpn/

docker compose up --build -d
```

> **Notă:** Certificatele SSL (`certs/`) și fișierele private (`vpn/`, `.env`) nu sunt incluse în repository.

---

## 🏗️ Arhitectură

```mermaid
flowchart LR
    A[Browser] -->|HTTPS| B[Cloudflare]
    B --> C[Caddy :8080]
    C --> D[usv-vpn :3000]
    D -->|OpenVPN Tunnel| E[scolaritate.usv.ro]
    style D fill:#0066FF,stroke:#333,stroke-width:2px,color:#fff
    style C fill:#00E5FF,stroke:#333,stroke-width:2px
```

| Serviciu | Rol | Tehnologie |
|----------|-----|------------|
| **Caddy** | Reverse proxy cu TLS (Cloudflare Origin CA) | `caddy:2-alpine` |
| **Next.js 14** | Frontend + API Routes (proxy logic) — rulează ca user non-root | `Next.js` |
| **usv-vpn** (sidecar) | Container izolat: OpenVPN + NET_ADMIN + /dev/net/tun | `openvpn` |

---

## 🛠️ Stack

- **Next.js 14** — framework + API routes `![](https://img.shields.io/badge/Next.js-black?style=flat-square&logo=nextdotjs&logoColor=white)`
- **Caddy 2** — TLS termination `![](https://img.shields.io/badge/Caddy-00E5FF?style=flat-square&logo=caddy&logoColor=white)`
- **Docker + OpenVPN** — containerizare & VPN `![](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)` `![](https://img.shields.io/badge/OpenVPN-EA7B00?style=flat-square&logo=openvpn&logoColor=white)`

---

## 🤝 Contribuie la proiect

Proiectul este 100% open-source și dezvoltat din pasiune în timpul liber. Orice ajutor este binevenit! 
Dacă vrei să contribui cu cod, să raportezi un bug sau să îmbunătățești documentația, te rugăm să citești mai întâi **[Ghidul de Contribuție](./docs/CONTRIBUTING.md)** pentru detalii legate de rularea locală cu Docker și stilul de cod.

---

## ☕ Susține proiectul

Serverul VPS are costuri lunare. Dacă platforma îți este utilă:

**[→ Donează pe Revolut](https://revolut.me/28vik/pocket/dOomdzRh2c)**

---

## ⚖️ Licență & Credite

Acest proiect este distribuit în mod deschis sub licența **MIT**. Întregul cod sursă și designul platformei sunt dezvoltate de **Vichiriuc Adrian (28VYK)**.

Vezi fișierele [LICENSE](LICENSE) și [docs/CREDITS.md](./docs/CREDITS.md) pentru textul juridic complet și lista detaliată a creditelor de dezvoltare.
