import { Module } from '@nestjs/common';
import { AssetService } from './asset.service';
import { AssetController } from './asset.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [AssetController],
  providers: [AssetService],
  imports: [HttpModule],
})
export class AssetModule {}
