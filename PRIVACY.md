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

## Opțiunea „Ține-mă minte”

Dacă activezi opțiunea „Ține-mă minte”:
- Username-ul și parola sunt stocate exclusiv **local, în browserul tău (localStorage)**.
- Acestea sunt trimise către serverul proxy doar în momentul în care este necesară o nouă autentificare sau o reîmprospătare a sesiunii.

## Scopul procesării

Datele tale sunt folosite strict în scopul tehnic de a realiza conexiunea prin VPN la portalul `scolaritate.usv.ro` și pentru a afișa notele într-o interfață modernă și responsivă.

## Limitări și Riscuri cunoscute

- **Protocol HTTP simplu**: În prezent, instanța demo rulează pe un protocol `http://` (fără SSL/TLS) direct pe adresa de IP a VPS-ului. De aceea, traficul de data din browser până la serverul proxy este necriptat.
- **Recomandare critică**: Nu utilizați portalul când sunteți conectați la rețele Wi-Fi publice sau nesigure (cafenele, hotspoturi deschise). Este recomandat să folosiți datele mobile (4G/5G) sau o rețea privată de acasă.
- **Legătura cu USV**: Din cauza serverului învechit al universității, legătura proxy → USV folosește protocoale TLS mai vechi (TLS 1.0) cu ocolirea verificării certificatului (`rejectUnauthorized: false`), fapt impus de API-ul USV.

---

Proiectul este în întregime open-source. Codul poate fi oricând inspectat sau compilat local pentru securitate sporită.
