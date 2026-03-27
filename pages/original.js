import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';

const DEFAULT_PAGE = '/psp/PT90SYS/?cmd=login&languageCd=ROM';

function buildAssetBaseHref(rawPath) {
  if (!rawPath) {
    return '/api/asset/';
  }

  const normalized = String(rawPath).startsWith('http')
    ? new URL(String(rawPath)).pathname
    : String(rawPath);

  const withoutQuery = normalized.split('?')[0] || '/';
  const directoryPath = withoutQuery.endsWith('/')
    ? withoutQuery
    : `${withoutQuery.slice(0, withoutQuery.lastIndexOf('/') + 1) || '/'}`;

  return `/api/asset${directoryPath}`;
}

function injectBridgeScript(html, assetBaseHref) {
  if (!html || typeof html !== 'string') {
    return html;
  }

  const baseTag = `<base href="${assetBaseHref}">`;
  let preparedHtml = html;

  if (preparedHtml.includes('<head>')) {
    preparedHtml = preparedHtml.replace('<head>', `<head>${baseTag}`);
  } else if (preparedHtml.includes('<html>')) {
    preparedHtml = preparedHtml.replace('<html>', `<html><head>${baseTag}</head>`);
  } else {
    preparedHtml = `${baseTag}${preparedHtml}`;
  }

  const bridgeScript = `
<script>
(function () {
  function normalizePath(rawValue) {
    if (!rawValue) return '';

    var value = String(rawValue).trim();
    if (!value || value === '#') return '';

    if (value.indexOf('javascript:') === 0) return '';

    if (value.indexOf('https://scolaritate.usv.ro') === 0) {
      return value.replace('https://scolaritate.usv.ro', '') || '/';
    }

    if (value.indexOf('/api/asset/') === 0) {
      return '/' + value.substring('/api/asset/'.length);
    }

    if (value.indexOf('http://') === 0 || value.indexOf('https://') === 0) {
      try {
        var parsed = new URL(value);
        return (parsed.pathname || '/') + (parsed.search || '');
      } catch (error) {
        return '';
      }
    }

    if (value.charAt(0) === '/') {
      return value;
    }

    return '/' + value;
  }

  function emit(payload) {
    window.parent.postMessage(payload, '*');
  }

  function toFormPayload(form) {
    var formData = new FormData(form);
    var params = new URLSearchParams();
    formData.forEach(function (value, key) {
      params.append(key, value);
    });
    return params.toString();
  }

  document.addEventListener('click', function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest('a[data-proxy-href]') : null;
    if (!anchor) {
      anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    }
    if (!anchor) return;

    var rawHref = anchor.getAttribute('data-proxy-href') || anchor.getAttribute('href') || '';
    var path = normalizePath(rawHref);
    if (!path) return;

    event.preventDefault();
    event.stopPropagation();

    emit({
      type: 'proxy:debug',
      message: 'click intercepted',
      raw: rawHref,
      path: path
    });

    emit({
      type: 'proxy:navigate',
      path: path
    });
  }, true);

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || !form.getAttribute) return;

    var action = form.getAttribute('data-original-action') || form.getAttribute('action') || '';
    var path = normalizePath(action);
    if (!path) return;

    event.preventDefault();
    event.stopPropagation();

    emit({
      type: 'proxy:debug',
      message: 'submit intercepted',
      raw: action,
      path: path
    });

    emit({
      type: 'proxy:submit',
      path: path,
      method: (form.getAttribute('method') || 'POST').toUpperCase(),
      body: toFormPayload(form)
    });
  }, true);

  emit({ type: 'proxy:bridge-ready' });
})();
</script>
`;

  if (preparedHtml.includes('</body>')) {
    return preparedHtml.replace('</body>', `${bridgeScript}</body>`);
  }

  return `${preparedHtml}${bridgeScript}`;
}

export default function OriginalPage() {
  const [mounted, setMounted] = useState(false);
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [cookies, setCookies] = useState('');
  const [currentPath, setCurrentPath] = useState(DEFAULT_PAGE);
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bridgeStatus, setBridgeStatus] = useState('bridge init...');
  const [lastAction, setLastAction] = useState('n/a');
  const [lastResponse, setLastResponse] = useState('n/a');

  const iframeHtml = useMemo(
    () => injectBridgeScript(html, buildAssetBaseHref(currentPath)),
    [html, currentPath]
  );

  const normalizeProxyPath = (rawPath) => {
    if (!rawPath) {
      return '';
    }

    const value = String(rawPath).trim();
    if (!value) {
      return '';
    }

    if (value.startsWith('https://scolaritate.usv.ro')) {
      return value.replace('https://scolaritate.usv.ro', '') || '/';
    }

    if (value.startsWith('/api/asset/')) {
      return `/${value.slice('/api/asset/'.length)}`;
    }

    if (value.startsWith('/')) {
      return value;
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
      try {
        const parsed = new URL(value);
        return `${parsed.pathname || '/'}${parsed.search || ''}`;
      } catch (error) {
        return '';
      }
    }

    return `/${value}`;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchOriginal = async ({ path, method = 'GET', body, cookiesOverride } = {}) => {
    const activeCookies = cookiesOverride ?? cookies;

    if (!activeCookies) {
      setError('Nu există sesiune activă. Fă login din nou.');
      return;
    }

    const targetPath = normalizeProxyPath(path || currentPath || DEFAULT_PAGE);

    if (!targetPath) {
      setError('Calea pentru navigare este invalidă.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetPath,
          cookies: activeCookies,
          method,
          body,
          headers: method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {},
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Nu am putut încărca pagina originală.');
      }

      setHtml(data.html || '');
      setCurrentPath(targetPath);
      setLastResponse(`status=${data.status || response.status} final=${data.finalUrl || targetPath}`);
    } catch (requestError) {
      setError(requestError.message || 'Eroare la încărcare.');
      setLastResponse(`error=${requestError.message || 'request failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const loginAndLoad = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      const loginResponse = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid, password }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok || !loginData.success) {
        throw new Error(loginData.error || 'Login eșuat.');
      }

      const sessionCookies = loginData.cookies || '';
      setCookies(sessionCookies);

      const initialPath = loginData.redirectUrl
        ? loginData.redirectUrl.replace('https://scolaritate.usv.ro', '')
        : DEFAULT_PAGE;

      setCurrentPath(initialPath);

      await fetchOriginal({ path: initialPath, cookiesOverride: sessionCookies });
    } catch (loginError) {
      setError(loginError.message || 'Eroare la autentificare.');
      setLoading(false);
    }
  };

  useEffect(() => {
    function onMessage(event) {
      const payload = event.data;

      if (!payload || typeof payload !== 'object') {
        return;
      }

      if (payload.type === 'proxy:navigate' && payload.path) {
        setLastAction(`navigate -> ${payload.path}`);
        fetchOriginal({ path: normalizeProxyPath(payload.path), method: 'GET' });
      }

      if (payload.type === 'proxy:submit' && payload.path) {
        setLastAction(`submit -> ${payload.path}`);
        fetchOriginal({
          path: normalizeProxyPath(payload.path),
          method: payload.method || 'POST',
          body: payload.body || '',
        });
      }

      if (payload.type === 'proxy:bridge-ready') {
        setBridgeStatus('bridge ready');
      }

      if (payload.type === 'proxy:debug') {
        setLastAction(`${payload.message}: ${payload.path || payload.raw || 'n/a'}`);
      }
    }

    window.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, [cookies, currentPath]);

  return (
    <>
      <Head>
        <title>Original PeopleSoft Viewer</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main suppressHydrationWarning style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ marginBottom: 8 }}>PeopleSoft Original Viewer</h1>
        <p style={{ marginTop: 0, color: '#555' }}>
          Randare aproape raw a paginii originale prin proxy-ul local.
        </p>

        {!cookies && (
          <form onSubmit={loginAndLoad} style={{ display: 'grid', gap: 8, maxWidth: 360, marginBottom: 16 }}>
            <input
              value={userid}
              onChange={(event) => setUserid(event.target.value)}
              placeholder="User ID"
              required
              disabled={loading}
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
              disabled={loading}
            />
            <button type="submit" disabled={loading}>{loading ? 'Se autentifică...' : 'Login + Load original'}</button>
          </form>
        )}

        {cookies && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              style={{ flex: 1 }}
              value={currentPath}
              onChange={(event) => setCurrentPath(event.target.value)}
              placeholder="/psc/PT90SYS/..."
              disabled={loading}
            />
            <button type="button" onClick={() => fetchOriginal({ path: currentPath })} disabled={loading}>
              {loading ? 'Se încarcă...' : 'Go'}
            </button>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 12, color: '#9f1d1d', background: '#fde8e8', padding: 10, borderRadius: 6 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 10, color: '#4b5563', fontSize: 12 }}>
          Bridge: {bridgeStatus} | Last action: {lastAction} | Last response: {lastResponse}
        </div>

        <iframe
          title="PeopleSoft Original"
          srcDoc={mounted ? iframeHtml : ''}
          style={{ width: '100%', height: '78vh', border: '1px solid #ddd', borderRadius: 6, background: '#fff' }}
        />
      </main>
    </>
  );
}
