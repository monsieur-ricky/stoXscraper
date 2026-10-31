import { Module } from '@nestjs/common';
import { AssetService } from './asset.service';
import { AssetController } from './asset.controller';
import {
  BROWSER_LAUNCHER,
  PlaywrightService,
} from '../utilities/playwright.service';
import { chromium } from 'playwright';

@Module({
  controllers: [AssetController],
  providers: [
    AssetService,
    PlaywrightService,
    { provide: BROWSER_LAUNCHER, useValue: chromium },
  ],
})
export class AssetModule {}
