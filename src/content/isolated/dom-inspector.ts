import type { RiskIndicator } from '@/shared/types';

export interface DomInspectionResult {
  indicators: RiskIndicator[];
}

export function inspectDom(): DomInspectionResult {
  const indicators: RiskIndicator[] = [];
  const isHttps = location.protocol === 'https:';

  const passwordFields = document.querySelectorAll('input[type="password"]');
  if (passwordFields.length > 0 && !isHttps) {
    indicators.push({
      type: 'password-no-https',
      description: 'Password field on non-HTTPS page',
      weight: 0.8,
    });
  }

  const forms = document.querySelectorAll('form[action]');
  for (const form of forms) {
    const action = (form as HTMLFormElement).action;
    try {
      const actionUrl = new URL(action, location.href);
      if (actionUrl.hostname !== location.hostname) {
        indicators.push({
          type: 'cross-origin-form',
          description: `Form submits to ${actionUrl.hostname}`,
          weight: 0.6,
        });
      }
    } catch {
      // Malformed action
    }
  }

  const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
  if (hiddenInputs.length > 10) {
    indicators.push({
      type: 'excessive-hidden-inputs',
      description: `${hiddenInputs.length} hidden form inputs`,
      weight: 0.3,
    });
  }

  return { indicators };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'INSPECT_DOM') {
    sendResponse(inspectDom());
    return true;
  }
});
