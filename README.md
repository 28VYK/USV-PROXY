# USV Portal 🎓

> Portal neoficial pentru accesarea platformei `scolaritate.usv.ro` din orice browser modern, fără VPN local.

**[→ noteusv.tech](https://noteusv.tech)** — live, gratuit, doar pentru studenții USV.

---

## ⚠️ Disclaimer

**Acest proiect nu este afiliat oficial cu Universitatea „Ștefan cel Mare" Suceava.**
Este o soluție independentă (Proof of Concept) creată de un student, utilizată pe propria răspundere.

Platforma funcționează ca **reverse proxy** — cererile (inclusiv credențialele) trec temporar prin serverul nostru, exclusiv în memorie, fără stocare persistentă.
Codul este complet open-source.

→ [Politică de Confidențialitate](./docs/PRIVACY.md) · [Politică de Securitate](./docs/SECURITY.md)

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

```
Browser → Cloudflare (HTTPS) → Caddy (TLS termination :8080)
        → Next.js App (:3000) → OpenVPN → scolaritate.usv.ro
```

| Serviciu | Rol |
|----------|-----|
| `caddy:2-alpine` | Reverse proxy cu TLS (Cloudflare Origin CA) |
| `Next.js 14` | Frontend + API Routes (proxy logic) |
| `OpenVPN` | Tunel spre rețeaua internă USV |

---

## 🛠️ Stack

- **Next.js 14** — framework + API routes
- **Caddy 2** — TLS termination
- **Docker + OpenVPN** — containerizare & VPN

---

## ☕ Susține proiectul

Serverul VPS are costuri lunare. Dacă platforma îți este utilă:

**[→ Donează pe Revolut](https://revolut.me/28vik)**

---

*MIT License · Proiect educațional open-source*
