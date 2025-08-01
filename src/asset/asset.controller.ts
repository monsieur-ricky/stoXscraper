import { Controller, Get, Param } from '@nestjs/common';
import { AssetService } from './asset.service';

@Controller('asset')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get('search/:term')
  async search(@Param('term') term: string) {
    return await this.assetService.search(term);
  }

  @Get('quote/:symbol')
  async quote(@Param('symbol') symbol: string) {
    return await this.assetService.getQuote(symbol);
  }

  @Get('profile/:symbol')
  async details(@Param('symbol') symbol: string) {
    return await this.assetService.getProfile(symbol);
  }

  @Get('quote/metal/:metal')
  async metalQuote(@Param('metal') metal: string) {
    return await this.assetService.getMetalQuote(metal);
  }
}
