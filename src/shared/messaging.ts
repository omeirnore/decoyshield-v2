import type { ExtensionMessage } from './types';

export async function sendMessage<R = unknown>(msg: ExtensionMessage): Promise<R> {
  return chrome.runtime.sendMessage(msg) as Promise<R>;
}

export function onMessage<T extends ExtensionMessage>(
  type: T['type'],
  handler: (msg: T, sender: chrome.runtime.MessageSender) => Promise<unknown>,
): void {
  chrome.runtime.onMessage.addListener(
    (message: unknown, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
      const msg = message as ExtensionMessage;
      if (msg?.type === type) {
        handler(msg as T, sender).then(sendResponse);
        return true;
      }
    },
  );
}
