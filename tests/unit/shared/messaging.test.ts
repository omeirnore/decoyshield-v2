import { describe, test, expect, vi } from 'vitest';
import { sendMessage, onMessage } from '@/shared/messaging';

describe('sendMessage', () => {
  test('calls chrome.runtime.sendMessage with typed message', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({ ok: true });
    const result = await sendMessage({ type: 'GET_SETTINGS' });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'GET_SETTINGS' });
    expect(result).toEqual({ ok: true });
  });
});

describe('onMessage', () => {
  test('registers handler for specific message type', () => {
    const handler = vi.fn();
    onMessage('GET_SETTINGS', handler);
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });
});
