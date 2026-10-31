import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type {
  Browser,
  BrowserContext,
  BrowserType,
  Cookie,
  Page,
} from 'playwright';
import * as fs from 'node:fs';
import type { RequestOptions } from '../asset/entities/request-options.entity';

export const BROWSER_LAUNCHER = Symbol('BROWSER_LAUNCHER');

function isCookie(value: unknown): value is Cookie {
  if (typeof value !== 'object' || value === null) return false;
  const cookie = value as Record<string, unknown>;
  return (
    ['name', 'value', 'domain', 'path'].every(
      (key) => typeof cookie[key] === 'string',
    ) &&
    typeof cookie.expires === 'number' &&
    Number.isFinite(cookie.expires) &&
    typeof cookie.httpOnly === 'boolean' &&
    typeof cookie.secure === 'boolean' &&
    ['Strict', 'Lax', 'None'].includes(String(cookie.sameSite))
  );
}

@Injectable()
export class PlaywrightService implements OnModuleInit, OnModuleDestroy {
  private browser?: Browser;
  private savedCookies: Cookie[] = [];
  private readonly logger = new Logger(PlaywrightService.name);

  constructor(
    @Inject(BROWSER_LAUNCHER)
    private readonly launcher: Pick<BrowserType, 'launch'>,
  ) {}

  async onModuleInit() {
    const cookiesPath = process.env.YAHOO_COOKIES_PATH || 'yahoo-cookies.json';
    try {
      if (fs.existsSync(cookiesPath)) {
        const parsed: unknown = JSON.parse(
          fs.readFileSync(cookiesPath, 'utf8'),
        );
        if (!Array.isArray(parsed) || !parsed.every(isCookie))
          throw new Error('Invalid cookie format.');
        this.savedCookies = parsed;
      }
    } catch {
      this.logger.warn(
        'Could not load saved Yahoo cookies; continuing without cookies.',
      );
      this.savedCookies = [];
    }
    this.browser = await this.launcher.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });
  }

  async createPage(options: RequestOptions = {}): Promise<Page> {
    if (!this.browser) throw new Error('Browser is not initialized.');
    const context: BrowserContext = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    try {
      if (options.useSavedCookies !== false && this.savedCookies.length > 0) {
        await context.addCookies(this.savedCookies);
      }
      return await context.newPage();
    } catch (error) {
      await context.close();
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.browser?.close();
    this.browser = undefined;
  }

  async makeBrowserRequest(
    url: string,
    options: RequestOptions = {},
  ): Promise<string> {
    const page = await this.createPage(options);
    try {
      const response = await page.goto(url, {
        waitUntil: options.waitForSelector ? 'domcontentloaded' : 'load',
        timeout: 30000,
      });
      if (response && !response.ok())
        throw new Error(`Provider returned HTTP ${response.status()}.`);
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 15000 });
      }
      return await page.content();
    } finally {
      // Closing a page alone leaves its per-request context alive.
      await page.context().close();
    }
  }
}
