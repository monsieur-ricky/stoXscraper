import { chromium, Browser } from 'playwright';
import * as fs from 'fs';

async function saveCookies() {
  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to Yahoo Finance to get cookie consent...');
  await page.goto('https://finance.yahoo.com/');

  try {
    // Wait for the cookie consent button and click it
    // The selector may change, so verify it's correct
    const acceptButton = page.locator(
      'button[name="agree"][value="agree"].accept-all',
    );

    if ((await acceptButton.count()) > 0) {
      await acceptButton.click();
      console.log('Cookie consent accepted.');

      // Wait for cookies to be set after the click
      await page.waitForTimeout(2000);
    }
  } catch (e) {
    console.log('Cookie consent button not found', e);
  }

  // Save the cookies to a file in your project's root directory
  const cookies = await context.cookies();
  const cookiesPath = process.env.YAHOO_COOKIES_PATH || 'yahoo-cookies.json';

  fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));

  console.log(`Cookies saved to ${cookiesPath}.`);

  await browser.close();
}

saveCookies();
