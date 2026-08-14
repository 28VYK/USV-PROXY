import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslations, useLocale } from 'next-intl';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function Status() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Status');
  const tCommon = useTranslations('Common');

  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [countdown, setCountdown] = useState(30);

  const countdownIntervalRef = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    // Initialize Theme - manual choice only
    const savedTheme = localStorage.getItem('usv_theme') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }

    // Fetch initial status data
    fetchStatus();

    // Start polling and countdown
    startTimer();

    return () => {
      stopTimer();
    };
  }, []);

  // Cursor tracking for ambient glow blobs
  useEffect(() => {
    // Only track cursor on desktop devices with a mouse
    const mediaQuery = window.matchMedia('(pointer: fine)');
    if (!mediaQuery.matches) return;

    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const blob1 = document.querySelector('.glow-blob-1');
      const blob2 = document.querySelector('.glow-blob-2');
      
      if (blob1 && blob2) {
        const xPercent = (clientX / window.innerWidth - 0.5) * 45;
        const yPercent = (clientY / window.innerHeight - 0.5) * 45;
        
        blob1.style.transform = `translate(${xPercent}px, ${yPercent}px)`;
        blob2.style.transform = `translate(${-xPercent}px, ${-yPercent}px)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
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

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status');
      if (!response.ok) {
        throw new Error('Nu s-a putut prelua starea sistemelor.');
      }
      const data = await response.json();
      setStatusData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    stopTimer();

    // Reset countdown
    setCountdown(30);

    // Countdown interval (tick every 1s)
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchStatus();
          return 30; // Reset countdown
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  // Determine overall status based on active monitors
  const getOverallState = () => {
    if (loading || error || !statusData) return 'loading';

    let totalMonitors = 0;
    let upMonitors = 0;
    let downMonitors = 0;

    statusData.publicGroupList.forEach((group) => {
      group.monitorList.forEach((monitor) => {
        totalMonitors++;
        const hbList = statusData.heartbeatList[monitor.id] || [];
        const lastHb = hbList[hbList.length - 1];
        if (lastHb) {
          if (lastHb.status === 1) {
            upMonitors++;
          } else if (lastHb.status === 0) {
            downMonitors++;
          }
        }
      });
    });

    if (totalMonitors === 0) return 'operational';
    if (downMonitors === totalMonitors) return 'down';
    if (downMonitors > 0) return 'partial';
    return 'operational';
  };

  const overallState = getOverallState();

  const getStatusText = (status) => {
    switch (status) {
      case 1:
        return locale === 'ro' ? 'Online' : 'Online';
      case 0:
        return locale === 'ro' ? 'Offline' : 'Offline';
      case 2:
        return locale === 'ro' ? 'În așteptare' : 'Pending';
      case 3:
        return locale === 'ro' ? 'Mentenanță' : 'Maintenance';
      default:
        return locale === 'ro' ? 'Necunoscut' : 'Unknown';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 1:
        return 'bg-success';
      case 0:
        return 'bg-danger';
      case 2:
        return 'bg-warning';
      case 3:
        return 'bg-maintenance';
      default:
        return '';
    }
  };

  const formatBeatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr.replace(' ', 'T'));
      return date.toLocaleTimeString(locale === 'ro' ? 'ro-RO' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return timeStr;
    }
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
        
        {/* Google Fonts */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      <div className="app status-page" data-theme={theme}>
        {/* Glow Blobs */}
        <div className="glow-blob glow-blob-1"><div className="glow-blob-inner"></div></div>
        <div className="glow-blob glow-blob-2"><div className="glow-blob-inner"></div></div>

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
                <a className="nav-link">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{tCommon('timetable')}</span>
                </a>
              </Link>
              
              <Link href="/status" legacyBehavior>
                <a className="nav-link active">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                  <span>Status</span>
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
          <div className="status-page-container">
            {/* Header Text */}
            <div className="status-header-text">
              <h1>{t('title')}</h1>
              <p>{t('subtitle')}</p>
            </div>

            {/* Overall Status Banner */}
            {loading ? (
              <div className="status-banner shimmer status-shimmer" style={{ height: '64px', borderRadius: '20px' }}></div>
            ) : error ? (
              <div className="status-banner state-down">
                <div className="status-banner-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <span>{error}</span>
              </div>
            ) : (
              <div className={`status-banner state-${overallState}`}>
                <div className="status-banner-icon">
                  {overallState === 'operational' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : overallState === 'partial' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  )}
                </div>
                <span className="status-banner-text-wrapper">
                  <span>
                    {overallState === 'operational'
                      ? t('systemsOperational')
                      : overallState === 'partial'
                      ? t('systemsPartial')
                      : t('systemsDown')}
                  </span>
                  {overallState === 'operational' && <span className="pulse-dot" />}
                </span>
              </div>
            )}

            {/* Incident Alert if exists */}
            {!loading && !error && statusData?.incident && (
              <div className="status-banner state-down" style={{ marginBottom: '24px' }}>
                <div className="status-banner-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <strong>{statusData.incident.title}</strong>
                  {statusData.incident.description && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', fontWeight: 400 }}>
                      {statusData.incident.description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Loading Shimmer Card */}
            {loading && (
              <div className="status-skeleton">
                <div className="status-skeleton-title shimmer status-shimmer"></div>
                <div className="status-skeleton-row">
                  <div className="status-skeleton-left">
                    <div className="status-skeleton-name shimmer status-shimmer"></div>
                    <div className="status-skeleton-text shimmer status-shimmer"></div>
                  </div>
                  <div className="status-skeleton-right shimmer status-shimmer"></div>
                </div>
                <div className="status-skeleton-row">
                  <div className="status-skeleton-left">
                    <div className="status-skeleton-name shimmer status-shimmer"></div>
                    <div className="status-skeleton-text shimmer status-shimmer"></div>
                  </div>
                  <div className="status-skeleton-right shimmer status-shimmer"></div>
                </div>
                <div className="status-skeleton-row">
                  <div className="status-skeleton-left">
                    <div className="status-skeleton-name shimmer status-shimmer"></div>
                    <div className="status-skeleton-text shimmer status-shimmer"></div>
                  </div>
                  <div className="status-skeleton-right shimmer status-shimmer"></div>
                </div>
              </div>
            )}

            {/* Loaded Monitor Cards */}
            {!loading && !error && statusData && (
              <div className="status-services-group">
                {statusData.publicGroupList.map((group) => (
                  <div key={group.id} className="card shadow-box" style={{ padding: 0 }}>
                    <div className="status-card-header">
                      <h2 className="status-card-title">{group.name}</h2>
                    </div>
                    <div className="status-services-list">
                      {group.monitorList.map((monitor) => {
                        const hbs = statusData.heartbeatList[monitor.id] || [];
                        const lastHb = hbs[hbs.length - 1];
                        const activeStatus = lastHb ? lastHb.status : -1;
                        
                        // Map status names for localization
                        let displayMonitorName = monitor.name;
                        if (monitor.name === 'Conexiune VPN USV') displayMonitorName = t('serviceVPN');
                        else if (monitor.name === 'Server Note USV') displayMonitorName = t('serviceServer');
                        else if (monitor.name === 'Portal NoteUSV') displayMonitorName = t('servicePortal');

                        // Average ping calculation
                        const validPings = hbs.filter(h => h.ping !== null).map(h => h.ping);
                        const avgPing = validPings.length > 0 
                          ? Math.round(validPings.reduce((sum, p) => sum + p, 0) / validPings.length)
                          : null;

                        // 24h Uptime calculation
                        const uptimeKey = `${monitor.id}_24`;
                        const rawUptime = statusData.uptimeList[uptimeKey];
                        const uptimePct = rawUptime !== undefined 
                          ? Math.round(rawUptime * 10000) / 100
                          : null;

                        // Ensure we always render exactly 50 ticks, padding with -1 on the left
                        const paddedHbs = [];
                        const ticksCount = 50;
                        if (hbs.length < ticksCount) {
                          for (let i = 0; i < ticksCount - hbs.length; i++) {
                            paddedHbs.push({ status: -1 });
                          }
                        }
                        paddedHbs.push(...hbs.slice(-ticksCount));

                        return (
                          <div key={monitor.id} className="status-service-row">
                            {/* Service Info */}
                            <div className="status-service-info">
                              <div className="status-service-header-line">
                                <span className="status-service-name">{displayMonitorName}</span>
                                <span className={`status-badge ${getStatusClass(activeStatus)}`}>
                                  {getStatusText(activeStatus)}
                                </span>
                                {uptimePct !== null && (
                                  <span className="status-badge bg-success">
                                    {t('uptime24h')}: {uptimePct}%
                                  </span>
                                )}
                              </div>
                              <div className="status-service-subtext">
                                {avgPing !== null ? (
                                  <span className={`ping-badge ${avgPing < 100 ? 'ping-fast' : avgPing < 300 ? 'ping-medium' : 'ping-slow'}`}>
                                    {t('avgPing', { ping: avgPing })}
                                  </span>
                                ) : (
                                  t('notAvailable')
                                )}
                              </div>
                            </div>

                            {/* Heartbeat Ticks Bar */}
                            <div className="status-heartbeat-container">
                              <div className="status-heartbeat-bar">
                                {paddedHbs.map((hb, hbIdx) => {
                                  let tickClass = 'tick-empty';
                                  if (hb.status === 1) tickClass = 'tick-up';
                                  else if (hb.status === 0) tickClass = 'tick-down';
                                  else if (hb.status === 2) tickClass = 'tick-pending';
                                  else if (hb.status === 3) tickClass = 'tick-maintenance';

                                  const formattedTime = hb.time ? formatBeatTime(hb.time) : '';
                                  const tooltipTitle = hb.status === -1 
                                    ? t('notAvailable')
                                    : `${formattedTime} - ${
                                        hb.status === 1 
                                          ? `${t('pingTime')}: ${hb.ping || 0}ms` 
                                          : getStatusText(hb.status)
                                      }`;

                                  return (
                                    <div
                                      key={hbIdx}
                                      className={`status-beat-tick ${tickClass}`}
                                      title={tooltipTitle}
                                    />
                                  );
                                })}
                              </div>
                              <div className="status-heartbeat-labels">
                                <span>50m ago</span>
                                <span>now</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Meta */}
            {!loading && !error && (
              <div className="status-meta-info">
                <div className="status-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <span>{t('refreshIn', { seconds: countdown })}</span>
                </div>
                <div className="status-meta-item">
                  <span>
                    {t('updated')}: {new Date().toLocaleTimeString(locale === 'ro' ? 'ro-RO' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            )}

            {/* Back Button */}
            <div className="status-back-wrapper">
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
