import { vi } from 'vitest';

const storageMock = {
  local: {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  session: {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    setAccessLevel: vi.fn().mockResolvedValue(undefined),
  },
  onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
};

const runtimeMock = {
  sendMessage: vi.fn(),
  onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
  openOptionsPage: vi.fn(),
  getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
  onInstalled: { addListener: vi.fn() },
  onStartup: { addListener: vi.fn() },
};

const tabsMock = {
  query: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockResolvedValue(undefined),
};

const cookiesMock = {
  getAll: vi.fn().mockResolvedValue([]),
  remove: vi.fn().mockResolvedValue(undefined),
};

const declarativeNetRequestMock = {
  updateEnabledRulesets: vi.fn().mockResolvedValue(undefined),
  getMatchedRules: vi.fn().mockResolvedValue({ rulesMatchedInfo: [] }),
  getAvailableStaticRuleCount: vi.fn().mockResolvedValue(30000),
  getEnabledRulesets: vi.fn().mockResolvedValue([]),
};

const scriptingMock = {
  registerContentScripts: vi.fn().mockResolvedValue(undefined),
  unregisterContentScripts: vi.fn().mockResolvedValue(undefined),
};

const webNavigationMock = {
  onCommitted: { addListener: vi.fn(), removeListener: vi.fn() },
  onCompleted: { addListener: vi.fn(), removeListener: vi.fn() },
};

const i18nMock = {
  getMessage: vi.fn((key: string) => key),
};

Object.assign(globalThis, {
  chrome: {
    storage: storageMock,
    runtime: runtimeMock,
    tabs: tabsMock,
    cookies: cookiesMock,
    declarativeNetRequest: declarativeNetRequestMock,
    scripting: scriptingMock,
    webNavigation: webNavigationMock,
    i18n: i18nMock,
  },
});
