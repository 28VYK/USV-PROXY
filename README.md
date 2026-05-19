# USV Portal - Next.js Reverse Proxy 🎓

O soluție completă, modernă și ultra-premium pentru accesarea platformei `scolaritate.usv.ro` din orice browser, pe orice dispozitiv.

## 🔴 Problema

Platforma oficială PeopleSoft folosește protocoale TLS învechite (TLS 1.0) blocate automat de browserele moderne din motive de securitate:
- Chrome: `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`
- Firefox: `SSL_ERROR_NO_CYPHER_OVERLAP`
- Edge: conexiune refuzată

## ✅ Soluția USV Portal

Un proxy modern care intermediază conexiunea, oferind în același timp o interfață cu un design nou, optimizat și mult mai rapid.

### 🌟 Funcționalități noi (Versiunea Revizuită)
- **UI/UX Premium:** Interfață complet refăcută cu design glassmorphism, animații fluide și culori ambientale.
- **Sesiuni Persistente ("Ține-mă minte"):** Sistem securizat de auto-login în fundal via `localStorage` (credidențialele tale nu părăsesc niciodată dispozitivul propriu către servere terțe, în afară de USV).
- **Filtrare Avansată:** Vizualizează instant situația școlară cu suport pentru filtrare per semestru.
- **Design Responsiv:** Optimizat impecabil atât pe mobil, cât și pe desktop.
- **Modul Comunitate (Donate):** Posibilitatea de a susține proiectul independent pentru a acoperi costurile de mentenanță.

## 🌐 Live Preview

Poți testa un **preview al interfeței de login** direct la:  
👉 **[proxy-usv.vercel.app](https://proxy-usv.vercel.app/)**



## 🚀 Instalare (pentru dezvoltare locală)

### Cerințe
- Node.js 18+
- npm sau yarn

### Pași

```bash
# Clonează repository-ul
git clone https://github.com/YOUR_USERNAME/usv-proxy.git
cd usv-proxy

# Instalează dependențele
npm install

# Pornește serverul de dezvoltare
npm run dev
```

Accesează `http://localhost:3000` (sau portul tău configurat).

## 📁 Structura Proiectului

```text
usv-proxy/
├── pages/
│   ├── index.js              # Frontend - interfața nouă și dashboard-ul de note
│   └── api/
│       ├── login.js          # Route proxy pentru PeopleSoft login
│       ├── proxy.js          # Route proxy pentru navigare date
│       └── asset/[...path].js # Route proxy pentru resurse CSS/JS legacy
├── next.config.js            # Configurare Next.js
└── package.json
```

## 🔐 Securitate și Confidențialitate

- **Fără stocare pe server:** Platforma **NU** stochează sub nicio formă parolele, notele sau datele personale pe un server propriu. Conexiunea se face direct între browser și serverul USV.
- Funcția "Ține-mă minte" stochează datele exclusiv **local, în browser-ul utilizatorului**.
- Codul sursă este open-source, oferind transparență maximă pentru audit.

## 🏢 Propunere de Implementare Instituțională

Pentru ca universitatea să poată remedia problema la sursă, am documentat o configurație simplă de Nginx care poate fi implementată de departamentul IT:

```nginx
server {
    listen 443 ssl http2;
    server_name scolaritate.usv.ro;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_certificate /etc/ssl/certs/usv.crt;
    ssl_certificate_key /etc/ssl/private/usv.key;

    location / {
        proxy_pass https://peoplesoft-intern.usv.ro;
        proxy_ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
        proxy_ssl_verify off;
        proxy_set_header Host $host;
    }
}
```

## 🛠️ Tehnologii Folosite
- [Next.js](https://nextjs.org/) - Framework de React
- [Node.js](https://nodejs.org/) - Backend Runtime
- TLS Legacy HTTPS Agent

## 📝 Licență
MIT License - Proiect open-source în scop educațional.

## 👤 Autor
Proiect 100% independent, dezvoltat de un student pentru studenți.

---
**Notă importantă:** Acest proiect **nu** este afiliat sau recunoscut oficial de Universitatea "Ștefan cel Mare" din Suceava.
