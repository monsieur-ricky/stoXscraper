import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BROWSER_LAUNCHER, PlaywrightService } from './playwright.service';
import { browserHarness } from '../../test/browser-harness';

describe('Playwright provider lifecycle integration', () => {
  let module: TestingModule;
  let service: PlaywrightService;
  let harness: ReturnType<typeof browserHarness>;
  let directory: string;
  const env = process.env.YAHOO_COOKIES_PATH;
  const cookie = {
    name: 'session',
    value: 'synthetic',
    domain: '.yahoo.com',
    path: '/',
    expires: -1,
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
  };

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'stox-cookies-'));
    process.env.YAHOO_COOKIES_PATH = join(directory, 'cookies.json');
    harness = browserHarness();
    module = await Test.createTestingModule({
      providers: [
        PlaywrightService,
        { provide: BROWSER_LAUNCHER, useValue: harness.launcher },
      ],
    }).compile();
    service = module.get(PlaywrightService);
  });

  afterEach(async () => {
    await module.close();
    rmSync(directory, { recursive: true, force: true });
    if (env === undefined) delete process.env.YAHOO_COOKIES_PATH;
    else process.env.YAHOO_COOKIES_PATH = env;
    jest.restoreAllMocks();
  });

  it('rejects requests before initialization and tolerates shutdown without a browser', async () => {
    await expect(
      service.makeBrowserRequest('https://example.com'),
    ).rejects.toThrow('not initialized');
    await service.onModuleDestroy();
    expect(harness.closeBrowser).not.toHaveBeenCalled();
  });

  it('launches once, reuses the browser, and closes every isolated context', async () => {
    await module.init();
    await service.makeBrowserRequest('https://example.com');
    await service.makeBrowserRequest('https://example.com');
    expect(harness.launch).toHaveBeenCalledTimes(1);
    expect(harness.closeContext).toHaveBeenCalledTimes(2);
    await service.onModuleDestroy();
    await service.onModuleDestroy();
    expect(harness.closeBrowser).toHaveBeenCalledTimes(1);
  });

  it('loads saved cookies by default but never sends them to an opted-out request', async () => {
    writeFileSync(process.env.YAHOO_COOKIES_PATH!, JSON.stringify([cookie]));
    await module.init();
    await service.makeBrowserRequest('https://finance.yahoo.com');
    expect(harness.addCookies).toHaveBeenCalledWith([cookie]);
    harness.addCookies.mockClear();
    await service.makeBrowserRequest('https://example.com', {
      useSavedCookies: false,
    });
    expect(harness.addCookies).not.toHaveBeenCalled();
  });

  it.each(['invalid-json', '{}', '[{}]', '[null]'])(
    'ignores malformed saved cookies: %s',
    async (content) => {
      const warning = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);
      writeFileSync(process.env.YAHOO_COOKIES_PATH!, content);
      await module.init();
      await service.makeBrowserRequest('https://example.com');
      expect(harness.addCookies).not.toHaveBeenCalled();
      expect(warning).toHaveBeenCalledTimes(1);
    },
  );

  it('closes the context when cookie insertion fails before a page exists', async () => {
    writeFileSync(process.env.YAHOO_COOKIES_PATH!, JSON.stringify([cookie]));
    await module.init();
    harness.addCookies.mockRejectedValueOnce(new Error('Cookie error'));
    await expect(
      service.makeBrowserRequest('https://example.com'),
    ).rejects.toThrow('Cookie error');
    expect(harness.closeContext).toHaveBeenCalledTimes(1);
    expect(harness.newPage).not.toHaveBeenCalled();
  });

  it('closes the context when page creation fails', async () => {
    await module.init();
    // Keep newContext behavior while replacing the returned newPage outcome.
    harness.newContext.mockImplementationOnce(async () => ({
      addCookies: harness.addCookies,
      close: harness.closeContext,
      newPage: async () => {
        throw new Error('Page error');
      },
    }));
    await expect(
      service.makeBrowserRequest('https://example.com'),
    ).rejects.toThrow('Page error');
    expect(harness.closeContext).toHaveBeenCalledTimes(1);
  });

  it('supports navigation responses without an HTTP response object', async () => {
    await module.init();
    harness.navigation.mockResolvedValueOnce(null);
    await expect(
      service.makeBrowserRequest('data:text/html,example'),
    ).resolves.toContain('Local browser fixture');
    expect(harness.closeContext).toHaveBeenCalledTimes(1);
  });

  it('propagates Chromium launch failures without attempting requests', async () => {
    harness.launch.mockRejectedValueOnce(new Error('Chromium unavailable'));
    await expect(module.init()).rejects.toThrow('Chromium unavailable');
    expect(harness.newContext).not.toHaveBeenCalled();
  });

  it('propagates selector timeouts and closes the request context', async () => {
    await module.init();
    harness.waitForSelector.mockRejectedValueOnce(
      new Error('Selector timeout'),
    );
    await expect(
      service.makeBrowserRequest('https://example.com', {
        waitForSelector: '#quote',
      }),
    ).rejects.toThrow('Selector timeout');
    expect(harness.waitForSelector).toHaveBeenCalledWith('#quote', {
      timeout: 15000,
    });
    expect(harness.closeContext).toHaveBeenCalledTimes(1);
  });
});
