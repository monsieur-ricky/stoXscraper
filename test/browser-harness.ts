import type { Browser, BrowserType } from 'playwright';
import { profileHtml, quoteHtml, searchHtml } from './fixtures';

export function browserHarness() {
  const document = jest
    .fn<Promise<string>, [string]>()
    .mockImplementation(async (url) => {
      if (url.includes('/getcrumb')) return '<pre>crumb-token</pre>';
      if (url.includes('/finance/search')) return searchHtml;
      if (url.includes('/finance/quote')) return quoteHtml;
      if (url.includes('/profile/')) return profileHtml;
      return '<html><body>Local browser fixture</body></html>';
    });
  const navigation = jest
    .fn()
    .mockResolvedValue({ ok: () => true, status: () => 200 });
  const waitForSelector = jest.fn().mockResolvedValue(null);
  const addCookies = jest.fn().mockResolvedValue(undefined);
  const closeContext = jest.fn().mockResolvedValue(undefined);
  const newPage = jest.fn();
  const newContext = jest.fn().mockImplementation(async () => {
    let currentUrl = '';
    const context = { addCookies, close: closeContext, newPage };
    const page = {
      goto: async (url: string, options: unknown) => {
        currentUrl = url;
        return navigation(url, options) as Promise<unknown>;
      },
      waitForSelector,
      content: () => document(currentUrl),
      context: () => context,
    };
    newPage.mockResolvedValue(page);
    return context;
  });
  const closeBrowser = jest.fn().mockResolvedValue(undefined);
  const browser = { newContext, close: closeBrowser } as unknown as Browser;
  const launch = jest.fn().mockResolvedValue(browser);
  return {
    launcher: { launch } as Pick<BrowserType, 'launch'>,
    launch,
    newContext,
    newPage,
    addCookies,
    closeContext,
    closeBrowser,
    navigation,
    waitForSelector,
    document,
  };
}
