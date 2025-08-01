import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';

@Injectable()
export class PlaywrightService implements OnModuleInit, OnModuleDestroy {
  private browser: Browser;
  private savedCookies: any[];

  async onModuleInit() {
    this.browser = await chromium.launch({ headless: true });

    const cookiesPath = process.env.YAHOO_COOKIES_PATH || 'yahoo-cookies.json';

    try {
      const cookiesFile = fs.readFileSync(cookiesPath, 'utf8');
      this.savedCookies = JSON.parse(cookiesFile);
    } catch (e: unknown) {
      Logger.error('Error loading yahoo-cookies.json.', e);
      this.savedCookies = [];
    }
  }

  async createPage(): Promise<Page> {
    // Create a new context and load the saved cookies into it
    const context: BrowserContext = await this.browser.newContext();
    if (this.savedCookies.length > 0) {
      await context.addCookies(this.savedCookies);
    }
    return context.newPage();
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async makeBrowserRequest(url: string): Promise<string> {
    const page = await this.createPage();
    try {
      await page.goto(url);
      return await page.content();
    } finally {
      await page.close();
    }
  }
}
