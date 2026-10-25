import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  getCookiesForDomain,
  deleteCookie,
  deleteAllCookiesForDomain,
} from '@/background/cookie-service';

beforeEach(() => {
  vi.mocked(chrome.cookies.getAll).mockClear();
  vi.mocked(chrome.cookies.remove).mockClear();
});

describe('getCookiesForDomain', () => {
  test('returns mapped cookie info without values', async () => {
    vi.mocked(chrome.cookies.getAll).mockResolvedValue([
      {
        name: 'sid',
        value: 'secret',
        domain: '.example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        expirationDate: 1730000000,
        session: false,
        storeId: '0',
      },
    ] as any);
    const cookies = await getCookiesForDomain('example.com');
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe('sid');
    expect(cookies[0]).not.toHaveProperty('value');
  });
});

describe('deleteCookie', () => {
  test('calls chrome.cookies.remove', async () => {
    await deleteCookie({ url: 'https://example.com', name: 'sid' });
    expect(chrome.cookies.remove).toHaveBeenCalledWith({
      url: 'https://example.com',
      name: 'sid',
    });
  });
});

describe('deleteAllCookiesForDomain', () => {
  test('returns deleted count', async () => {
    vi.mocked(chrome.cookies.getAll).mockResolvedValue([
      { name: 'a', domain: '.example.com', secure: true, path: '/' },
      { name: 'b', domain: '.example.com', secure: false, path: '/' },
    ] as any);
    vi.mocked(chrome.cookies.remove).mockResolvedValue({} as any);
    const count = await deleteAllCookiesForDomain('example.com');
    expect(count).toBe(2);
  });
});
