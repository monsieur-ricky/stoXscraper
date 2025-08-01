import { Module } from '@nestjs/common';
import { AssetService } from './asset.service';
import { AssetController } from './asset.controller';
import { HttpModule } from '@nestjs/axios';
import { PlaywrightService } from 'src/utilities/playwright.service';

@Module({
  controllers: [AssetController],
  providers: [AssetService, PlaywrightService],
  imports: [HttpModule],
})
export class AssetModule {}
