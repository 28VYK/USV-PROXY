import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Orar() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Orar');
  const tCommon = useTranslations('Common');

  const [theme, setTheme] = useState('light');
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    // Initialize Theme - manual choice only
    const savedTheme = localStorage.getItem('usv_theme') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('usv_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  };

  const toggleLocale = () => {
    const nextLocale = locale === 'ro' ? 'en' : 'ro';
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.replace(router.asPath);
  };

  const faqQuestions = locale === 'ro' ? [
    {
      "@type": "Question",
      "name": "Cum accesez notele și situația școlară USV fără VPN?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Portalul nostru funcționează ca un proxy securizat intermediar. Când te autentifici pe noteusv.tech, serverul nostru realizează automat conexiunea necesară și interoghează sistemul oficial USV (scolaritate.usv.ro) în locul tău. Astfel, poți vedea notele, examenele și situația școlară instant de pe orice dispozitiv (telefon, tabletă sau laptop), fără să mai instalezi FortiClient sau alte aplicații VPN. Este soluția ideală pentru studenții USV care vor acces rapid la note USV fără complicații."
      }
    },
    {
      "@type": "Question",
      "name": "Este sigur să-mi introduc datele de login pe acest portal?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Da, securitatea și confidențialitatea datelor tale sunt prioritățile noastre principale. Portalul funcționează complet stateless — nu stocăm nicio parolă sau informație personală. Datele tale de autentificare sunt transmise criptat prin HTTPS (protejate de Cloudflare) direct către serverele universității și sunt șterse imediat după utilizare. Tot codul sursă este open-source pe GitHub, deci poate fi auditat oricând de oricine. Portal Student USV a fost creat special pentru a oferi un acces sigur la note USV."
      }
    },
    {
      "@type": "Question",
      "name": "De ce nu mai merge direct scolaritate.usv.ro și cum rezolvăm asta?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Platforma oficială de școlaritate USV (scolaritate.usv.ro) folosește tehnologii vechi (PeopleSoft) și un certificat SSL care nu mai este compatibil cu browserele moderne (Chrome, Firefox, Safari). Acestea blochează accesul din motive de securitate. Portalul nostru acționează ca un translator modern: preia datele în mod securizat din spate și ți le afișează într-o interfață rapidă, curată și complet compatibilă cu standardele actuale de web. Astfel, ai acces la situația școlară USV fără probleme."
      }
    },
    {
      "@type": "Question",
      "name": "Ce fac dacă nu pot intra în cont sau primesc eroare la autentificare pe note USV?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Mai întâi verifică formatul corect al utilizatorului (de obicei PRENUME.NUME sau prenume.nume@student.usv.ro). Dacă datele sunt corecte dar tot primești eroare, cel mai probabil serverul oficial al Universității Ștefan cel Mare Suceava este temporar indisponibil (mentenanță, supraîncărcare sau problemă tehnică). Așteaptă 5-10 minute și încearcă din nou. Dacă problema persistă, poți verifica statusul pe grupul de Facebook al facultății tale sau contacta secretariatul."
      }
    },
    {
      "@type": "Question",
      "name": "Cum pot calcula media și simula notele înainte de sesiune?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "După autentificare în portalul student USV, mergi la secțiunea Analiză Medii. Acolo ai un simulator complet de note. Poți introduce note estimate pentru curs, seminar sau laborator la materiile care nu au încă note finale. Sistemul calculează automat media aritmetică, media ponderată ECTS, totalul creditelor și punctelor necesare. Este un instrument extrem de util pentru a planifica sesiunea și a vedea exact ce note îți trebuie pentru bursă sau promovare."
      }
    },
    {
      "@type": "Question",
      "name": "Unde găsesc orarul complet al facultății mele?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Situația completă și actualizată a orarului pentru toate facultățile, specializările și grupele de la Universitatea „Ștefan cel Mare” din Suceava o găsești pe platforma dedicată orar.usv.ro. Pe site-ul nostru ai un link direct în header și pe pagina /orar. Acolo poți filtra ușor după facultate, grupă, serie sau profesor. Platforma de orar este dezvoltată de studenți USV și este cea mai bună sursă oficială pentru informații actualizate."
      }
    },
    {
      "@type": "Question",
      "name": "Unde găsesc orarul FIESC USV (Inginerie Electrică și Știința Calculatoarelor)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Orarul complet pentru FIESC USV este disponibil pe orar.usv.ro. Acesta include specializările: Calculatoare, Automatică și Informatică Aplicată, Electronică, Informatică Economică. Pe noteusv.tech poți accesa orarul FIESC USV rapid."
      }
    },
    {
      "@type": "Question",
      "name": "Cum accesez orarul FEAA USV (Economie, Administrație și Afaceri)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Orarul FEAA USV pentru specializările Contabilitate, Finanțe-Bănci, Management, Administrarea Afacerilor, Economia Comerțului, Turismului și Serviciilor este disponibil pe orar.usv.ro. Folosește scurtătura din header-ul noteusv.tech pentru a deschide orarul FEAA USV."
      }
    },
    {
      "@type": "Question",
      "name": "Care este orarul pentru Informatică USV (Știința Calculatoarelor)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Orarul pentru Informatică de la Universitatea Ștefan cel Mare Suceava este publicat pe orar.usv.ro pentru toți anii de studii (licență și masterat). noteusv.tech/orar oferă linkul direct către orarul de Informatică USV."
      }
    },
    {
      "@type": "Question",
      "name": "Unde pot vedea orarul FDSA USV (Drept și Științe Administrative)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Orarul FDSA USV pentru Drept, Administrație Publică sau Asistență Managerială se găsește actualizat pe orar.usv.ro. noteusv.tech te ajută să intri pe orarul FDSA rapid de pe telefon."
      }
    },
    {
      "@type": "Question",
      "name": "Cum găsesc orarul Silvicultură USV?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Orarul pentru Silvicultură sau Ecologie și Protecția Mediului USV este disponibil online pe orar.usv.ro. noteusv.tech/orar oferă link direct către orarul de Silvicultură USV."
      }
    },
    {
      "@type": "Question",
      "name": "Unde găsesc orarul FIMAR USV (Inginerie Mecanică, Autovehicule și Robotică)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Orarul pentru Facultatea de Inginerie Mecanică, Autovehicule și Robotică (FIMAR USV) de la Universitatea Ștefan cel Mare Suceava se află pe orar.usv.ro. noteusv.tech oferă acces rapid la orarul FIMAR USV."
      }
    },
    {
      "@type": "Question",
      "name": "Unde găsesc orarul FLSC USV (Litere și Științe ale Comunicării)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Orarul pentru Facultatea de Litere și Științe ale Comunicării (FLSC) de la Universitatea Ștefan cel Mare Suceava este disponibil online pe orar.usv.ro. Acesta conține specializările de Română, Engleză, Franceză, Germană, Comunicare și Relații Publice sau Asistență Managerială. noteusv.tech îți pune la dispoziție o scurtătură rapidă către orarul FLSC USV."
      }
    },
    {
      "@type": "Question",
      "name": "Cum accesez orarul FIGSS USV (Istorie, Geografie și Științe Sociale)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Orarul complet pentru FIGSS USV (Istorie, Geografie, Asistență Socială, Relații Internaționale) se află pe platforma orar.usv.ro. Studenții pot vizualiza orarul pe grupe și profesori selectând FIGSS în meniul de filtrare. Pe noteusv.tech ai acces direct la orarul FIGSS USV de pe orice dispozitiv."
      }
    },
    {
      "@type": "Question",
      "name": "Care este orarul pentru FPSE USV (Psihologie și Științe ale Educației)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Orarul pentru Facultatea de Psihologie și Științe ale Educației (FPSE USV - Pedagogia Învățământului Primar și Preșcolar - PIPP, Pedagogie) din cadrul USV se poate consulta pe site-ul orar.usv.ro. Portalul noteusv.tech te ajută să vizualizezi orarul FPSE USV instant, ocolind conexiunile VPN."
      }
    },
    {
      "@type": "Question",
      "name": "Unde pot vedea orarul FIA USV (Inginerie Alimentară)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Orarul FIA USV pentru specializări precum Controlul și Expertiza Produselor Alimentare (CEPA), Protecția Consumatorului și a Mediului sau Ingineria Produselor Alimentare este publicat pe orar.usv.ro. Folosește noteusv.tech/orar pentru a deschide rapid orarul FIA USV."
      }
    },
    {
      "@type": "Question",
      "name": "Cum găsesc orarul FEFS USV (Educație Fizică și Sport)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Orarul Facultății de Educație Fizică și Sport (FEFS) de la USV Suceava (Educație Fizică, Kinetoterapie, Performanță Sportivă) poate fi accesat pe orar.usv.ro. noteusv.tech îți oferă acces direct la orarul FEFS USV, fără timp de așteptare."
      }
    },
    {
      "@type": "Question",
      "name": "Unde găsesc orarul FMSB USV (Medicină și Științe Biologice)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Orarul pentru Facultatea de Medicină și Științe Biologice (FMSB USV - Asistență Medicală Generală, Nutriție și Dietetică, Balneofiziokinetoterapie, Biologie) este disponibil pe orar.usv.ro. noteusv.tech facilitează verificarea rapidă a orarului FMSB USV."
      }
    }
  ] : [
    {
      "@type": "Question",
      "name": "How do I access USV grades and academic status without a VPN?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our portal acts as a secure intermediate proxy. When you log in on noteusv.tech, our server automatically establishes the necessary connection and queries the official USV system (scolaritate.usv.ro) on your behalf. Consequently, you can view your grades, exams, and academic status instantly from any device (phone, tablet, or laptop) without installing FortiClient or other VPN applications. It is the ideal solution for USV students who want quick access to USV grades without complications."
      }
    },
    {
      "@type": "Question",
      "name": "Is it safe to enter my login credentials on this portal?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, the security and privacy of your data are our top priorities. The portal operates in a completely stateless manner — we do not store any passwords or personal information. Your authentication credentials are transmitted fully encrypted via HTTPS (secured by Cloudflare) directly to the university's servers and are deleted immediately after use. The entire project's source code is open-source on GitHub, so it can be audited by anyone at any time. USV Student Portal was created specifically to provide secure access to USV grades."
      }
    },
    {
      "@type": "Question",
      "name": "Why doesn't scolaritate.usv.ro work directly anymore and how do we solve this?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The official USV student platform (scolaritate.usv.ro) uses legacy technologies (PeopleSoft) and an SSL certificate that is no longer compatible with modern web browsers (Chrome, Firefox, Safari). These browsers block direct access for security reasons. Our portal acts as a modern translator: securely retrieving data in the background and displaying it in a fast, clean interface that is fully compatible with current web standards. This way, you can access your USV academic status without issues."
      }
    },
    {
      "@type": "Question",
      "name": "What do I do if I can't log in or get an authentication error on USV grades?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "First, verify that your username is in the correct format (typically FIRSTNAME.LASTNAME or firstname.lastname@student.usv.ro). If the credentials are correct but you still get an error, the official server of the Stefan cel Mare University of Suceava is likely temporarily unavailable (due to maintenance, overload, or technical issues). Please wait 5-10 minutes and try again. If the issue persists, you can check the status on your faculty's Facebook groups or contact the student registry."
      }
    },
    {
      "@type": "Question",
      "name": "How can I calculate my GPA and simulate grades before the exam session?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Once logged in to the USV student portal, go to the GPA Analysis section. There you will find a complete grade simulator. You can enter estimated grades for courses, seminars, or labs for subjects that do not have final grades entered yet. The system automatically calculates your annual arithmetic average, ECTS weighted GPA, and total credits and points. It is an extremely useful tool to plan your exam session and see exactly what grades you need for a scholarship or promotion."
      }
    },
    {
      "@type": "Question",
      "name": "Where can I find my faculty's timetable?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The complete and updated schedule for all faculties, specializations, and groups at Stefan cel Mare University of Suceava can be found on the dedicated platform orar.usv.ro. On our website, you have a direct link in the header and on the /orar page. There you can easily filter by faculty, group, series, or professor. The timetable platform is developed by USV students and is the best official source for updated information."
      }
    },
    {
      "@type": "Question",
      "name": "Where do I find the FIESC USV timetable?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The complete timetable for FIESC USV is available on orar.usv.ro. This covers specializations such as Computers, Automation & Applied Informatics, Electronics, and Economic Informatics. You can access the FIESC USV timetable quickly via noteusv.tech."
      }
    },
    {
      "@type": "Question",
      "name": "How do I access the FEAA USV timetable?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The FEAA USV timetable for specializations like Accounting, Finance-Banking, Management, Business Administration, and Tourism is hosted on orar.usv.ro. Use the shortcut in the header of noteusv.tech to open the FEAA USV timetable."
      }
    },
    {
      "@type": "Question",
      "name": "What is the schedule for Computer Science USV?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The timetable for Computer Science at Stefan cel Mare University of Suceava is published on orar.usv.ro for all study years (BSc and MSc). noteusv.tech/orar provides a direct link to the Computer Science USV schedule."
      }
    },
    {
      "@type": "Question",
      "name": "Where can I see the FDSA USV (Law) timetable?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The FDSA USV timetable for Law, Public Administration, or Managerial Assistance is updated on orar.usv.ro. noteusv.tech helps you open the FDSA schedule quickly from your smartphone."
      }
    },
    {
      "@type": "Question",
      "name": "How do I find the Forestry USV timetable?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The schedule for Forestry or Ecology and Environmental Protection at USV is available online on orar.usv.ro. noteusv.tech/orar provides a direct link to the Forestry USV timetable."
      }
    },
    {
      "@type": "Question",
      "name": "Where can I find the FIMAR USV (Mechanical Engineering, Automotive and Robotics) timetable?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The schedule for the Faculty of Mechanical Engineering, Automotive and Robotics (FIMAR USV) at Stefan cel Mare University of Suceava is hosted on orar.usv.ro. noteusv.tech offers rapid access to the FIMAR USV timetable."
      }
    },
    {
      "@type": "Question",
      "name": "Where do I find the FLSC USV (Letters and Communication Sciences) timetable?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The timetable for the Faculty of Letters and Communication Sciences (FLSC) at Stefan cel Mare University of Suceava is available online at orar.usv.ro. It includes majors like Romanian, English, French, German, and Communication and Public Relations. noteusv.tech provides a quick shortcut to the FLSC USV schedule."
      }
    },
    {
      "@type": "Question",
      "name": "How do I access the FIGSS USV (History, Geography and Social Sciences) timetable?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The complete timetable for FIGSS USV (History, Geography, Social Work, International Relations) is hosted on the orar.usv.ro platform. Students can view the schedule by group or professor by selecting FIGSS. noteusv.tech offers direct access to the FIGSS USV timetable on any device."
      }
    },
    {
      "@type": "Question",
      "name": "What is the timetable for FPSE USV (Psychology and Educational Sciences)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The timetable for the Faculty of Psychology and Educational Sciences (FPSE USV - Pedagogy of Primary and Preschool Education - PIPP) at USV is available on orar.usv.ro. The noteusv.tech portal helps you view the FPSE USV schedule instantly without VPN configurations."
      }
    },
    {
      "@type": "Question",
      "name": "Where can I see the FIA USV (Food Engineering) timetable?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The FIA USV timetable for majors such as Food Control and Expertise (CEPA), Consumer and Environmental Protection, or Food Engineering is published on orar.usv.ro. Use noteusv.tech/orar to quickly load the FIA USV timetable."
      }
    },
    {
      "@type": "Question",
      "name": "How do I find the FEFS USV (Physical Education and Sport) timetable?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The timetable for the Faculty of Physical Education and Sport (FEFS) at USV Suceava (Physical Education, Kinetotherapy, Sports Performance) can be accessed on orar.usv.ro. noteusv.tech offers direct access to the FEFS USV schedule."
      }
    },
    {
      "@type": "Question",
      "name": "Where do I find the FMSB USV (Medicine and Biological Sciences) timetable?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The timetable for the Faculty of Medicine and Biological Sciences (FMSB USV - General Nursing, Nutrition and Dietetics, Balneophysiokinetotherapy, Biology) is available at orar.usv.ro. noteusv.tech facilitates quick checks of the FMSB USV schedule."
      }
    }
  ];

  // Structured Schema for SEO Rich Snippets (WebPage + BreadcrumbList + FAQPage + EducationalOrganization)
  const orarSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": "https://noteusv.tech/orar",
        "url": "https://noteusv.tech/orar",
        "name": t('pageTitle'),
        "description": t('metaDesc'),
        "dateModified": "2026-06-08T22:00:00+03:00",
        "publisher": {
          "@id": "https://www.usv.ro/#organization"
        },
        "about": {
          "@id": "https://www.usv.ro/#organization"
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://noteusv.tech/orar#breadcrumb",
        "isPartOf": {
          "@id": "https://noteusv.tech/orar"
        },
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": locale === 'ro' ? 'Acasă' : 'Home',
            "item": "https://noteusv.tech/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": locale === 'ro' ? 'Orar' : 'Timetable',
            "item": "https://noteusv.tech/orar"
          }
        ]
      },
      {
        "@type": "FAQPage",
        "@id": "https://noteusv.tech/orar#faq",
        "mainEntity": faqQuestions
      },
      {
        "@type": "EducationalOrganization",
        "@id": "https://www.usv.ro/#organization",
        "name": "Universitatea „Ștefan cel Mare” din Suceava",
        "alternateName": "USV Suceava",
        "url": "https://www.usv.ro/",
        "logo": "https://www.usv.ro/wp-content/themes/usv/images/logo.png",
        "sameAs": [
          "https://ro.wikipedia.org/wiki/Universitatea_%E2%80%9E%C8%98tefan_cel_Mare%E2%80%9D_din_Suceava",
          "https://www.facebook.com/USV.ro/"
        ]
      }
    ]
  };


  return (
    <>
      <Head>
        <title>{t('pageTitle')}</title>
        <meta name="description" content={t('metaDesc')} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        
        {/* Favicon & Icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        {/* Canonical URL */}
        <link rel="canonical" href="https://noteusv.tech/orar" />
        
        {/* Google Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />

        {/* Structured Data injection */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orarSchema) }}
        />
      </Head>

      <div className="app orar-page" data-theme={theme}>
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <Link href="/" legacyBehavior>
              <a className="logo">
                <div className="logo-icon-wrapper">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="logo-svg">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5" />
                  </svg>
                </div>
                <span className="logo-highlight">USV</span>
                <span className="logo-text">Portal</span>
              </a>
            </Link>
            <div className="header-actions">
              <Link href="/orar" legacyBehavior>
                <a className="nav-link active">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{tCommon('timetable')}</span>
                </a>
              </Link>

              <LanguageSwitcher locale={locale} onToggle={toggleLocale} />

              <button
                onClick={toggleTheme}
                className="btn-theme-toggle"
                title={theme === 'dark' ? tCommon('lightMode') : tCommon('darkMode')}
                style={{ marginLeft: '8px' }}
              >
                {theme === 'dark' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="main">
          <div className="orar-page-container">
            {/* Elegant info bar above iframe to credit the authors and blend it in */}
            <div className="orar-info-bar">
              <div className="orar-info-text">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>
                  {t('infoBar')}{' '}
                  <a href="https://orar.usv.ro/" target="_blank" rel="noopener noreferrer" className="orar-info-link">
                    orar.usv.ro
                  </a>
                </span>
              </div>
              
              <a href="https://orar.usv.ro/" target="_blank" rel="noopener noreferrer" className="orar-info-link">
                <span>{t('openDirect')}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </a>
            </div>

            {/* Timetable Iframe Widget Container */}
            <div className="orar-iframe-wrapper">
              {iframeLoading && (
                <div className="orar-skeleton-loader">
                  <div className="orar-skeleton-header">
                    <div className="orar-skeleton-pill p-small"></div>
                    <div className="orar-skeleton-pill p-medium"></div>
                    <div className="orar-skeleton-pill p-large"></div>
                  </div>
                  <div className="orar-skeleton-grid">
                    {[...Array(20)].map((_, i) => (
                      <div key={i} className="orar-skeleton-cell"></div>
                    ))}
                  </div>
                </div>
              )}
              <iframe 
                src="https://orar.usv.ro/" 
                className="orar-iframe" 
                title={t('pageTitle')}
                sandbox="allow-scripts allow-same-origin allow-forms"
                onLoad={() => setIframeLoading(false)}
              />
            </div>

            {/* Back Button */}
            <div className="orar-back-btn-wrapper">
              <Link href="/" legacyBehavior>
                <a className="btn-secondary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>{t('btnBack')}</span>
                </a>
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="footer">
          <p>{tCommon('footerText')}</p>
          <p className="footer-small">
            <a href="https://github.com/28VYK/USV-PROXY" target="_blank" rel="noopener noreferrer" className="footer-link">
              {tCommon('footerSource')}
            </a>
            {' • '}
            <span>{tCommon('footerEdu')}</span>
            {' • '}
            <a href="/privacy" className="footer-link">
              {tCommon('footerPrivacy')}
            </a>
            {' • '}
            <a href="/terms" className="footer-link">
              {tCommon('footerTerms')}
            </a>
            {' • '}
            <a href="/faq" className="footer-link">
              {tCommon('footerFaq')}
            </a>
            {' • '}
            <a href="/status" className="footer-link">
              {tCommon('footerStatus')}
            </a>
          </p>
        </footer>
      </div>
    </>
  );
}
