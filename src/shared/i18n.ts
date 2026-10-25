export function t(key: string, substitutions?: string[]): string {
  const msg = chrome.i18n.getMessage(key, substitutions);
  return msg || key;
}
