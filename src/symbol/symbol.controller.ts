import { Controller, Get, Param } from '@nestjs/common';
import { SymbolService } from './symbol.service';

@Controller('symbol')
export class SymbolController {
  constructor(private readonly symbolService: SymbolService) {}

  @Get('search/:term')
  async search(@Param('term') term: string) {
    return await this.symbolService.search(term);
  }

  @Get('quote/:symbol')
  async quote(@Param('symbol') symbol: string) {
    return await this.symbolService.getQuote(symbol);
  }

  @Get('profile/:symbol')
  async details(@Param('symbol') symbol: string) {
    return await this.symbolService.getProfile(symbol);
  }
}
