import type { CookieInfo } from '@/shared/types';

export async function getCookiesForDomain(domain: string): Promise<CookieInfo[]> {
  const cookies = await chrome.cookies.getAll({ domain });
  return cookies.map((c) => ({
    name: c.name,
    domain: c.domain,
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite: c.sameSite,
    expirationDate: c.expirationDate,
    session: c.session,
    ...(c.partitionKey ? { partitionKey: c.partitionKey } : {}),
  }));
}

export async function deleteCookie(details: {
  url: string;
  name: string;
  storeId?: string;
}): Promise<void> {
  await chrome.cookies.remove(details);
}

export async function deleteAllCookiesForDomain(domain: string): Promise<number> {
  const cookies = await chrome.cookies.getAll({ domain });
  await Promise.all(
    cookies.map((c) => {
      const protocol = c.secure ? 'https' : 'http';
      const url = `${protocol}://${c.domain.replace(/^\./, '')}${c.path}`;
      return chrome.cookies.remove({ url, name: c.name });
    }),
  );
  return cookies.length;
}
