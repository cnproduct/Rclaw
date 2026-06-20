/**
 * @license
 * Copyright 2025 Rclaw (rrennAI.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const registerMockServices = async () => {
  const { registerPlatformServices } = await import('@/common/platform');
  registerPlatformServices({
    paths: {
      getDataDir: () => '/test/path/userData',
      getTempDir: () => '/test/path/temp',
      getHomeDir: () => '/test/path/home',
      getLogsDir: () => '/test/path/logs',
      getAppPath: () => '/test/path/app',
      isPackaged: () => true,
      getSystemPath: (name: string) => `/test/path/${name}`,
      getName: () => 'Rclaw',
      getVersion: () => '1.0.0',
      needsCliSafeSymlinks: () => false,
    },
    worker: {
      fork: () => { throw new Error('Not implemented'); }
    },
    power: {
      preventSleep: () => null,
      allowSleep: () => {},
      preventDisplaySleep: () => null,
    },
    notification: {
      send: () => {}
    },
    network: {
      fetch: vi.fn(),
    }
  });
};
vi.mock('@office-ai/platform', () => ({
  bridge: {
    buildProvider: vi.fn(() => {
      const handlerMap = new Map<string, Function>();
      return {
        provider: vi.fn((handler: Function) => {
          handlerMap.set('handler', handler);
          return vi.fn();
        }),
        invoke: vi.fn(),
        _getHandler: () => handlerMap.get('handler'),
      };
    }),
    buildEmitter: vi.fn(() => ({
      emit: vi.fn(),
      on: vi.fn(),
    })),
  },
  storage: {
    buildStorage: () => ({
      getSync: () => undefined,
      setSync: () => {},
      get: () => Promise.resolve(undefined),
      set: () => Promise.resolve(),
    }),
  },
}));

vi.mock('electron', () => ({
  app: {
    getVersion: vi.fn(() => '1.0.0'),
    getPath: vi.fn(() => '/test/path'),
    isPackaged: true,
  },
}));

vi.mock('electron-updater', () => ({
  autoUpdater: {
    logger: null,
    autoDownload: false,
    autoInstallOnAppQuit: true,
    allowPrerelease: false,
    allowDowngrade: false,
    on: vi.fn(),
    removeListener: vi.fn(),
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
    checkForUpdatesAndNotify: vi.fn(),
  },
}));

vi.mock('electron-log', () => ({
  default: {
    transports: { file: { level: 'info' } },
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const makeGitHubReleaseResponse = () => [
  {
    tag_name: 'v1.9.22',
    name: 'v1.9.22',
    body: 'release notes',
    html_url: 'https://github.com/iOfficeAI/Rclaw/releases/tag/v1.9.22',
    published_at: '2026-04-29T00:00:00Z',
    prerelease: false,
    draft: false,
    assets: [
      {
        name: 'Rclaw-1.9.22-mac-arm64.dmg',
        browser_download_url:
          'https://github.com/iOfficeAI/Rclaw/releases/download/v1.9.22/Rclaw-1.9.22-mac-arm64.dmg',
        size: 123,
        content_type: 'application/x-apple-diskimage',
      },
      {
        name: 'Rclaw-1.9.22-win-x64.exe',
        browser_download_url: 'https://github.com/iOfficeAI/Rclaw/releases/download/v1.9.22/Rclaw-1.9.22-win-x64.exe',
        size: 456,
        content_type: 'application/vnd.microsoft.portable-executable',
      },
      {
        name: 'Rclaw-1.9.22-linux-amd64.deb',
        browser_download_url:
          'https://github.com/iOfficeAI/Rclaw/releases/download/v1.9.22/Rclaw-1.9.22-linux-amd64.deb',
        size: 789,
      },
    ],
  },
];

const getCheckHandler = async () => {
  vi.resetModules();
  const { initUpdateBridge } = await import('@process/bridge/updateBridge');
  const { ipcBridge } = await import('@/common');

  initUpdateBridge();

  const provider = vi.mocked(ipcBridge.update.check.provider);
  const lastCall = provider.mock.calls.at(-1);
  if (!lastCall) throw new Error('update.check handler not registered');
  return lastCall[0];
};

describe('updateBridge CDN URL rewriting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rewrites asset.url to the CDN path and keeps GitHub URL in fallbackUrl', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeGitHubReleaseResponse(),
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const handler = await getCheckHandler();
      const result = await handler({ repo: 'iOfficeAI/Rclaw' });

      expect(result.success).toBe(true);
      const assets = result.data?.latest?.assets ?? [];
      expect(assets.length).toBe(3);

      const macAsset = assets.find((a: { name: string }) => a.name === 'Rclaw-1.9.22-mac-arm64.dmg');
      expect(macAsset).toBeDefined();
      expect(macAsset?.url).toBe('https://static.rrennAI.com/releases/1.9.22/Rclaw-1.9.22-mac-arm64.dmg');
      expect(macAsset?.fallbackUrl).toBe(
        'https://github.com/iOfficeAI/Rclaw/releases/download/v1.9.22/Rclaw-1.9.22-mac-arm64.dmg'
      );

      const linuxAsset = assets.find((a: { name: string }) => a.name === 'Rclaw-1.9.22-linux-amd64.deb');
      expect(linuxAsset?.url).toBe('https://static.rrennAI.com/releases/1.9.22/Rclaw-1.9.22-linux-amd64.deb');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('uses the normalized version (no v prefix) in the CDN path', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => makeGitHubReleaseResponse(),
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const handler = await getCheckHandler();
      const result = await handler({ repo: 'iOfficeAI/Rclaw' });
      const asset = result.data?.latest?.assets?.[0];
      expect(asset?.url).toMatch(/^https:\/\/static\.rrennAI\.com\/releases\/1\.9\.22\//);
      expect(asset?.url).not.toMatch(/\/v1\.9\.22\//);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('updateBridge allowlist includes CDN host', () => {
  it('accepts static.rrennAI.com URLs for download', async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-length': '0' }),
      body: {
        getReader: () => ({
          read: async () => ({ done: true, value: undefined }),
        }),
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      await registerMockServices();
      const { initUpdateBridge } = await import('@process/bridge/updateBridge');
      const { ipcBridge } = await import('@/common');

      initUpdateBridge();

      const provider = vi.mocked(ipcBridge.update.download.provider);
      const lastCall = provider.mock.calls.at(-1);
      if (!lastCall) throw new Error('update.download handler not registered');
      const handler = lastCall[0];

      const result = await handler({
        url: 'https://static.rrennAI.com/releases/1.9.22/Rclaw-1.9.22-mac-arm64.dmg',
        fileName: 'Rclaw-1.9.22-mac-arm64.dmg',
      });

      expect(result.success).toBe(true);
      expect(result.data?.downloadId).toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('rejects non-allowlisted hosts', async () => {
    vi.resetModules();
    vi.clearAllMocks();

    try {
      await registerMockServices();
      const { initUpdateBridge } = await import('@process/bridge/updateBridge');
      const { ipcBridge } = await import('@/common');

      initUpdateBridge();

      const provider = vi.mocked(ipcBridge.update.download.provider);
      const lastCall = provider.mock.calls.at(-1);
      if (!lastCall) throw new Error('update.download handler not registered');
      const handler = lastCall[0];

      const result = await handler({
        url: 'https://evil.example.com/fake.dmg',
        fileName: 'fake.dmg',
      });

      // Download is refused before any network I/O; exact error text comes from i18n and isn't asserted here.
      expect(result.success).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
