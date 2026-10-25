import { useState } from 'preact/hooks';
import type { CookieInfo } from '@/shared/types';
import { getCookiesForDomain, deleteCookie, deleteAllCookiesForDomain } from '@/background/cookie-service';

export function CookieManager() {
  const [domain, setDomain] = useState('');
  const [cookies, setCookies] = useState<CookieInfo[]>([]);
  const [confirm, setConfirm] = useState<{ action: () => Promise<void>; msg: string } | null>(null);

  const loadCookies = async () => {
    if (!domain.trim()) return;
    setCookies(await getCookiesForDomain(domain.trim()));
  };

  const handleDelete = (cookie: CookieInfo) => {
    const protocol = cookie.secure ? 'https' : 'http';
    const url = `${protocol}://${cookie.domain.replace(/^\./, '')}${cookie.path}`;
    setConfirm({
      msg: `Delete "${cookie.name}"? ${cookie.session || cookie.httpOnly ? 'Deleting cookies may sign you out of this site.' : ''}`,
      action: async () => {
        await deleteCookie({ url, name: cookie.name });
        setConfirm(null);
        await loadCookies();
      },
    });
  };

  const handleDeleteAll = () => {
    setConfirm({
      msg: `Delete all cookies for "${domain}"? Deleting cookies may sign you out of this site.`,
      action: async () => {
        await deleteAllCookiesForDomain(domain.trim());
        setConfirm(null);
        setCookies([]);
      },
    });
  };

  const formatExpiry = (cookie: CookieInfo) => {
    if (cookie.session) return 'Session';
    if (!cookie.expirationDate) return 'Unknown';
    return new Date(cookie.expirationDate * 1000).toLocaleDateString();
  };

  return (
    <div>
      <div class="section">
        <h2>Cookie Manager</h2>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input class="input-field" placeholder="Enter domain (e.g. example.com)"
            value={domain} onInput={(e) => setDomain((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === 'Enter' && loadCookies()} />
          <button class="btn btn-primary" onClick={loadCookies}>Load</button>
          <button class="btn btn-outline" onClick={() => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]?.url) {
                try { setDomain(new URL(tabs[0].url).hostname); } catch { /* ignore */ }
              }
            });
          }}>Current Tab</button>
        </div>

        {cookies.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span class="info-text">{cookies.length} cookie{cookies.length !== 1 ? 's' : ''} found</span>
              <button class="btn btn-danger" onClick={handleDeleteAll}>Delete All</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table class="cookie-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Domain</th>
                    <th>Expires</th>
                    <th>Flags</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cookies.map((c) => (
                    <tr key={`${c.domain}${c.name}${c.path}`}>
                      <td>{c.name}</td>
                      <td>{c.domain}</td>
                      <td>{formatExpiry(c)}</td>
                      <td>
                        {c.secure && <span class="badge badge-success" style={{ marginRight: '4px' }}>Secure</span>}
                        {c.httpOnly && <span class="badge badge-warning">HttpOnly</span>}
                      </td>
                      <td><button class="btn btn-outline" onClick={() => handleDelete(c)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {cookies.length === 0 && domain && (
          <div class="empty-state">No cookies found for this domain.</div>
        )}
      </div>

      {confirm && (
        <div class="confirm-dialog" onClick={() => setConfirm(null)}>
          <div class="confirm-box" onClick={(e) => e.stopPropagation()}>
            <p>{confirm.msg}</p>
            <div class="confirm-actions">
              <button class="btn btn-outline" onClick={() => setConfirm(null)}>Cancel</button>
              <button class="btn btn-danger" onClick={confirm.action}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
