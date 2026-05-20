# USV Portal - Next.js Reverse Proxy 🎓

O soluție completă, modernă și ultra-premium pentru accesarea platformei `scolaritate.usv.ro` din orice browser, pe orice dispozitiv. 

## 🌐 Platforma este LIVE
Poți accesa și folosi platforma chiar acum (doar pentru studenții USV) la adresa:
👉 **[http://79.76.110.185:8080/](http://79.76.110.185:8080/)**

---

## 🔴 Problema
Platforma oficială PeopleSoft folosește protocoale TLS învechite (TLS 1.0) care sunt blocate automat de browserele moderne din motive de securitate:
- Chrome: `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`
- Firefox: `SSL_ERROR_NO_CYPHER_OVERLAP`
- Edge: Conexiune refuzată

## ✅ Soluția USV Portal
Un proxy modern care intermediază conexiunea la nivel local pe server (via VPN), oferind în același timp o interfață cu un design nou, ultra-optimizat și mult mai rapid.

### 🌟 Funcționalități Cheie
- **Istoric Multi-An (Nou 🔥):** Platforma descoperă automat și inteligent toți anii de studiu asociați contului tău. Poți naviga prin notele tale din anii trecuți, totul într-o singură interfață.
- **Smart Filtering pentru Restanțe (Nou 🧠):** Ai restanțe? Platforma le mapează acum inteligent. Notele din `SR1` (Restanță Semestrul 1) sunt asignate vizual Semestrului 1, `SR2` la Semestrul 2, iar `SRE` (Reexaminări) sunt evidențiate în secțiunea generală, pentru ca nicio notă să nu se piardă.
- **Sesiuni Persistente ("Ține-mă minte"):** Sistem securizat de auto-login în fundal via `localStorage`. Credențialele tale nu părăsesc niciodată dispozitivul către baze de date terțe.
- **UI/UX Premium:** Interfață complet refăcută cu design glassmorphism, animații fluide și culori ambientale care îți fac plăcere să le folosești.
- **Filtrare Avansată:** Vizualizează instant situația școlară cu suport pentru filtrare per semestru.
- **Design Responsiv:** Optimizat impecabil atât pe mobil, cât și pe desktop.
- **Modul Comunitate (Donate):** Posibilitatea de a susține proiectul independent pentru a acoperi costurile de mentenanță ale serverului.

---

## 🚀 Rulare și Instalare (pentru dezvoltare locală)

Platforma include un fișier de Docker gata pregătit. Pentru ca requesturile să meargă în rețeaua internă a universității, containerul configurează și o conexiune OpenVPN.

### Cerințe
- Node.js 18+ (Dacă rulezi doar local fără Docker)
- Docker & Docker Compose
- Fișier valid `usv2.ovpn` pentru VPN-ul USV
- Credențiale pentru VPN în fișierul `.env`

### Pași

```bash
# Clonează repository-ul
git clone https://github.com/28VYK/USV-PROXY.git
cd USV-PROXY

# Adaugă setările de environment (.env) 
# Trebuie să conțină OPENVPN_USER și OPENVPN_PASS

# Construiește și rulează containerul în background
docker compose up --build -d
```

Accesează `http://localhost:8080` pentru interfață.

---

## 📁 Structura Proiectului

```text
usv-proxy/
├── pages/
│   ├── index.js              # Frontend - interfața principală, logica de fetch, istoric & UI
│   └── api/
│       ├── login.js          # Route proxy pentru PeopleSoft login
│       ├── proxy.js          # Route proxy pentru extragerea datelor
│       ├── session-sync.js   # Menține sesiunea PeopleSoft activă
│       └── asset/[...path].js # Reverse proxy pentru resurse CSS/JS legacy
├── vpn/
│   └── usv2.ovpn             # Fișierul de configurare VPN
├── docker-compose.yml        # Configurare servicii Docker
├── Dockerfile                # Configurația de imagine Docker cu clientul OpenVPN încorporat
├── next.config.js            # Configurare Next.js (Standalone build output)
└── package.json
```

---

## 🔐 Securitate și Confidențialitate
- **Fără stocare pe server:** Platforma **NU** stochează sub nicio formă parolele, notele sau datele personale într-o bază de date proprie. Conexiunea se face live (în timp real) între browser-ul tău și serverul USV.
- **Auto-Login Securizat:** Funcția "Ține-mă minte" stochează datele exclusiv **local, în browser-ul tău** (`localStorage`).
- Codul sursă este open-source, oferind transparență maximă pentru audit.

---

## ☕ Susține Proiectul

Acest proiect este 100% independent și open-source, creat din frustrarea lipsei unei platforme funcționale și pentru a face viața studenților mai ușoară. Menținerea platformei online, ultra-rapidă și fără erori (inclusiv costurile lunare de găzduire a serverului VPS) necesită timp și resurse financiare.

Dacă folosești USV Portal cu plăcere și vrei să ajuți la menținerea lui online, poți face o donație rapidă, oricât de mică:
👉 **[Susține proiectul prin Revolut (revolut.me/28vik)](https://revolut.me/28vik)**

Orice contribuție ajută enorm comunitatea să aibă acces în continuare la platformă! ❤️

---

## 🛠️ Tehnologii Folosite
- [Next.js](https://nextjs.org/) - Framework de React (App Logic & API Routes)
- [Node.js](https://nodejs.org/) - Backend Runtime
- [Docker](https://www.docker.com/) - Containerizare (Node + OpenVPN)
- TLS Legacy HTTPS Agent

## 📝 Licență
MIT License - Proiect open-source în scop educațional.

## 👤 Autor
Proiect 100% independent, dezvoltat de un student pentru studenți.

---
**Notă importantă:** Acest proiect **nu** este afiliat sau recunoscut oficial de Universitatea "Ștefan cel Mare" din Suceava.
