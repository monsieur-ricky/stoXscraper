import { Module } from '@nestjs/common';
import { AssetService } from './asset.service';
import { AssetController } from './asset.controller';
import { PlaywrightService } from '../utilities/playwright.service';

@Module({
  controllers: [AssetController],
  providers: [AssetService, PlaywrightService],
})
export class AssetModule {}
