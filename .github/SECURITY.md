# Security Policy

## Versiuni Suportate

Doar ultima versiune de pe branch-ul `main` este considerată suportată activ și recomandată pentru utilizare.

| Versiune | Suportată |
| -------- | --------- |
| > 1.0.0  | ✅ Da      |
| < 1.0.0  | ❌ Nu      |

## Raportarea unei vulnerabilități

Dacă descoperi o vulnerabilitate de securitate, te rugăm să o raportezi în mod responsabil:
1. Trimite detalii printr-o sesizare privată sau contactează direct autorul prin datele din profilul GitHub.
2. Te rugăm să nu publici detaliile vulnerabilității (de exemplu, prin deschiderea unei Issue publice sau postări pe rețelele sociale) înainte ca aceasta să poată fi corectată și publicată.

## Principii de securitate implementate

- **Arhitectură Stateless**: Serverul nu reține sesiuni, nu salvează parole și nu intermediază baza de date proprie.
- **Transparență Open-Source**: Codul complet al aplicației este disponibil pentru audit public.
- **Fără stocare neautorizată**: Parolele sunt prelucrate doar în memoria RAM pe timpul efectuării request-ului către scolaritate.usv.ro.
- **Securitate Locală**: În lipsa unui context HTTPS (securizat) care să permită utilizarea cheilor criptografice native în browser (Web Crypto API), parola este salvată plain în browser doar la solicitarea expresă a utilizatorului („Ține-mă minte”). Se recomandă dezactivarea acestei opțiuni pe dispozitive partajate.
