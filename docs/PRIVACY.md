# Politică de Confidențialitate (Privacy Policy)

**Ultima actualizare:** 20 Mai 2026

## Ce date sunt procesate

Când utilizezi USV Proxy, următoarele informații trec temporar prin serverul proxy:

- Username și parola contului USV (utilizator)
- Credențialele VPN (pentru conectarea securizată la intranetul USV)
- Cookie-ul de sesiune PeopleSoft returnat de USV
- Conținutul paginilor web de la `scolaritate.usv.ro` (note, credite, semestru, ani de studiu etc.)

## Ce NU stocăm

- **Fără Bază de Date**: Serverul proxy nu are atașată o bază de date. Datele tale nu sunt stocate persistent pe disk.
- **Stateless**: Cererile sunt doar redirecționate (proxy-ate). Datele tale de logare și notele tranzitează doar memoria RAM pe durata cererii HTTP, fiind uitate imediat după răspuns.
- Nu stocăm și nu logăm parole sau date personale în jurnalele (logs) serverului.

## Opțiunea „Ține minte utilizatorul”

Dacă activezi opțiunea „Ține minte utilizatorul”:
- Doar username-ul este stocat local în browserul tău (`localStorage`) pentru auto-completare la următoarea accesare.
- Parola nu este salvată local sub nicio formă și trebuie reintrodusă la fiecare autentificare.

## Scopul procesării

Datele tale sunt folosite strict în scopul tehnic de a realiza conexiunea prin VPN la portalul `scolaritate.usv.ro` și pentru a afișa notele într-o interfață modernă și responsivă.

## Securitatea Conexiunii (HTTPS/TLS)

- **Conexiune Criptată**: Instanța demo rulează pe domeniul securizat `https://noteusv.tech` cu certificat SSL/TLS activat prin Cloudflare. Traficul dintre browser-ul tău și proxy este complet criptat și securizat.
- **Conectarea proxy → USV**: Din cauza serverului învechit al universității, legătura proxy → USV folosește protocoale TLS mai vechi (TLS 1.0) și suite de cifrare extinse pentru compatibilitate cu sistemul legacy al USV. Verificarea certificatului este **activă** (`rejectUnauthorized: true`) — conexiunea validează că serverul USV prezintă un certificat autentic.

---

Proiectul este în întregime open-source. Codul poate fi oricând inspectat sau compilat local pentru securitate sporită.
