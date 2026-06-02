# Ghid de Contribuție la USV Portal 🎓

Îți mulțumim că ești interesat să contribui la proiectul USV Portal! Ajutorul tău este extrem de prețios și ne ajută să menținem platforma stabilă, rapidă și sigură pentru toți studenții USV.

---

## 📌 Cuprins
- [Cod de conduită](#cod-de-conduită)
- [Tipuri de contribuții](#tipuri-de-contribuții)
- [Rulare locală (Dezvoltare)](#rulare-locală-dezvoltare)
- [Stil de cod și bune practici](#stil-de-cod-și-bune-practici)
- [Cum trimiți un Pull Request](#cum-trimiți-un-pull-request)
- [Reguli Critice de Securitate & Privacy (MANDATORIU)](#reguli-critice-de-securitate--privacy-mandatoriu)

---

## 🤝 Cod de conduită

- **Fii respectuos și constructiv** în discuții, Issues și Pull Request-uri.
- Concentrează-te pe îmbunătățirea tehnică și experiența utilizatorilor.
- Păstrează un mediu de colaborare plăcut și profesionist pentru toți colegii.

---

## 💡 Tipuri de contribuții acceptate

Suntem deschiși la o gamă largă de îmbunătățiri:
- 🐛 **Raportarea de bug-uri:** Deschide un Issue descriind bug-ul, pașii de reproducere și comportamentul așteptat.
- 💡 **Sugestii de feature-uri:** Propune idei noi sau îmbunătățiri pentru UI/UX.
- 🔒 **Securitate:** Dacă identifici o problemă de securitate, te rugăm să citești cu atenție [Regulile de Securitate](#reguli-critice-de-securitate--privacy-mandatoriu) înainte de a o face publică.
- 📝 **Documentație:** Corectarea textelor, actualizarea ghidurilor sau îmbunătățirea README-ului.

---

## 💻 Rulare locală (Dezvoltare)

Pentru a rula și testa aplicația pe calculatorul tău, urmează acești pași simple:

1. **Clonează repository-ul:**
   ```bash
   git clone https://github.com/28VYK/USV-PROXY.git
   cd USV-PROXY
   ```

2. **Configurează variabilele de mediu:**
   Copiază template-ul de configurare pentru a crea fișierul `.env` local:
   ```bash
   cp .env.example .env
   ```
   Deschide fișierul `.env` proaspăt creat și completează credențialele tale de VPN universitar (`VPN_USER` și `VPN_PASS`).

3. **Adaugă configurația VPN:**
   Pune fișierul oficial de configurare OpenVPN (`usv2.ovpn`) în folderul `/vpn/`.

4. **Pornește containerele:**
   Lansează serviciile folosind Docker Compose:
   ```bash
   docker compose up --build
   ```
   Aplicația se va construi și va porni. O poți accesa în browser la: **`http://localhost:3000`**

### Comenzi Utile

- `docker compose up -d` — Pornește serviciile în fundal (detached mode).
- `docker compose logs -f` — Vezi log-urile în timp real.
- `docker compose down` — Oprește și șterge containerele active.

---

## 🎨 Stil de cod și bune practici

Pentru a păstra codul curat și uniform, te rugăm să respecți următoarele reguli:
- **Indentare:** Folosește indentare cu 2 spații (standard Next.js / JavaScript).
- **Limba codului:** Toate numele de variabile, funcții, fișiere și comentariile din cod trebuie scrise în **limba engleză**.
- **Comentarii:** Adaugă comentarii profesioniste în limba engleză care să explice „de ce” și „cum” pentru funcționalitățile complexe (în special la parserul HTML și proxy-ul pentru PeopleSoft).

---

## 🚀 Cum trimiți un Pull Request

1. **Fă un Fork** la proiect și creează un branch descriptiv:
   - Pentru bug-uri: `fix/nume-bug`
   - Pentru feature-uri: `feature/nume-feature`
2. **Scrie commit-uri clare:** Folosește titluri descriptive (ex: `fix: validate redirect host in login endpoint`).
3. **Păstrează PR-urile mici:** PR-urile concentrate pe o singură problemă sunt mult mai ușor de analizat și de acceptat rapid.
4. **Testează modificările:** Asigură-te că aplicația pornește local fără erori înainte de a trimite PR-ul.

---

## 🚨 Reguli Critice de Securitate & Privacy (MANDATORIU)

> [!WARNING]
> **NU adăuga și nu urca niciodată fișiere sensibile sau credențiale private pe GitHub.**
> Repository-ul public este conceput să funcționeze fără codul sau datele de monitorizare personală.

### 🚫 NU introduce niciodată în Git următoarele fișiere:
- Fișierele locale de configurare: `.env`
- Configurația de VPN a universității: `vpn/usv2.ovpn`
- Certificatele SSL private: `certs/origin.pem`, `certs/origin.key`
- Cheile SSH de deploy: `bot_key`, `bot_key.pub`

Verifică întotdeauna rezultatul comenzii `git status` înainte de a face commit. Dacă oricare dintre aceste fișiere sensibile apare în zona de staging, scoate-le imediat (`git restore --staged <file>`).

---

## 🏆 Mulțumiri

Orice contribuție, oricât de mică, este extrem de apreciată! Îți mulțumim anticipat pentru implicare și pentru susținerea comunității studențești USV! 🎓
