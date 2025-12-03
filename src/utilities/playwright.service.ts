import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'node:fs';
import { RequestOptions } from '../asset/entities/request-options.entity';

@Injectable()
export class PlaywrightService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser;
  private savedCookies: any[];

  async onModuleInit() {
    const cookiesPath = process.env.YAHOO_COOKIES_PATH || 'yahoo-cookies.json';

    // Launch with stealth args (Safe for Yahoo, Required for Veracash)
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled', // Hides "navigator.webdriver"
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    try {
      if (fs.existsSync(cookiesPath)) {
        const cookiesFile = fs.readFileSync(cookiesPath, 'utf8');
        this.savedCookies = JSON.parse(cookiesFile);
      } else {
        this.savedCookies = [];
      }
    } catch (e: unknown) {
      Logger.error('Error loading yahoo-cookies.json.', e);
      this.savedCookies = [];
    }
  }

  async createPage(options: RequestOptions): Promise<Page> {
    const userAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

    const context: BrowserContext = await this.browser.newContext({
      userAgent: userAgent, // Consistent User Agent for everyone
      viewport: { width: 1280, height: 800 },
    });

    // Only add cookies if requested (Default to TRUE to keep Yahoo working)
    if (options.useSavedCookies !== false && this.savedCookies.length > 0) {
      await context.addCookies(this.savedCookies);
    }

    return context.newPage();
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Universal browser request method
   * @param url The URL to visit
   * @param options Configuration options
   */
  async makeBrowserRequest(
    url: string,
    options: RequestOptions = {},
  ): Promise<string> {
    // Default useSavedCookies to true if not specified (Backward Compatibility)
    const finalOptions = { useSavedCookies: true, ...options };

    const page = await this.createPage(finalOptions);

    try {
      // 'domcontentloaded' is faster for Yahoo; Cloudflare needs patience
      const waitState = finalOptions.waitForSelector
        ? 'domcontentloaded'
        : 'load';

      await page.goto(url, { waitUntil: waitState });

      // If a specific selector is provided (e.g. for VeraCash), wait for it
      if (finalOptions.waitForSelector) {
        try {
          await page.waitForSelector(finalOptions.waitForSelector, {
            timeout: 15000,
          });
        } catch {
          Logger.warn(
            `Timeout waiting for selector: ${finalOptions.waitForSelector} on ${url}`,
          );
        }
      }

      return await page.content();
    } catch (e: unknown) {
      Logger.error(`Error requesting ${url}`, e);
      throw e;
    } finally {
      await page.close();
    }
  }
}
