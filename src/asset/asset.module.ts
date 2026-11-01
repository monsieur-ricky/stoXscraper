import { Module } from '@nestjs/common';
import { AssetService } from './asset.service';
import { AssetController } from './asset.controller';
import {
  BROWSER_LAUNCHER,
  PlaywrightService,
} from '../utilities/playwright.service';
import { chromium } from 'playwright';
import {
  GOLD_API_CLOCK,
  GOLD_API_FETCH,
  GoldApiService,
  goldApiClock,
} from './gold-api.service';

@Module({
  controllers: [AssetController],
  providers: [
    AssetService,
    GoldApiService,
    { provide: GOLD_API_FETCH, useValue: globalThis.fetch },
    { provide: GOLD_API_CLOCK, useValue: goldApiClock },
    PlaywrightService,
    { provide: BROWSER_LAUNCHER, useValue: chromium },
  ],
})
export class AssetModule {}
