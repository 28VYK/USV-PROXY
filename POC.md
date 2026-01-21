# Proof of Concept: Demonstrație Tehnică

Acest document descrie arhitectura testată ("Proof of Concept") care a confirmat că un Reverse Proxy modern poate rezolva problemele de accesibilitate ale portalului `scolaritate.usv.ro` de pe dispozitive mobile.

## 🎯 Obiectiv

Demonstrarea fezabilității accesării portalului USV (care folosește TLS legacy) de pe telefoane mobile și browsere moderne (Chrome/Safari), eliminând erorile de tip `SSL_VERSION_OR_CIPHER_MISMATCH`.

## 🏗️ Arhitectura Testată

Pentru acest experiment, am folosit o arhitectură hibridă care separă "Gateway-ul Public" de "Nodul de Procesare".

### Diagrama Simplificată

`[Telefon Student] --(HTTPS)--> [VPS Public] --(Tunel SSH)--> [Laptop Proxy] --(VPN USV)--> [Portal Scolaritate]`

### Componente

1.  **Utilizator (Client):** Telefon mobil conectat la 4G/Internet (fără VPN instalat).
2.  **Gateway Public (VPS):** Un server VPS (Oracle Cloud Free Tier) expus la internet, care doar primește cererile HTTP.
3.  **App Server (Laptop Local):** Un laptop conectat la VPN-ul Universității. Aici rulează efectiv aplicația Node.js.
4.  **Tunel Securizat:** O conexiune Reverse SSH Tunnel care leagă Gateway-ul de App Server.

## 🧪 Rezultate

| Test Efectuat            | Rezultat  | Observații           |
| :----------------------- | :-------- | :------------------- |
| Login Desktop (Chrome)   | ✅ SUCCES | Note afișate corect  |
| Login Mobil (iOS 17)     | ✅ SUCCES | Nicio eroare SSL     |
| Login Mobil (Android 14) | ✅ SUCCES | Nicio eroare SSL     |
| Performanță              | ⚡ Rapid  | Timp răspuns < 200ms |

## 💡 Concluzie

Experimentul confirmă că **interpunerea unui Proxy compatibil TLS 1.2/1.3** între utilizator și serverul PeopleSoft rezolvă total problemele de compatibilitate.

Dacă universitatea ar implementa un proxy similar (chiar și simplu Nginx, vezi [README](README.md#propunere-pentru-implementare-instituțională)) direct pe infrastructura proprie, **necesitatea acestei arhitecturi complexe (cu tuneluri) ar dispărea**, iar studenții ar avea acces direct și sigur.
