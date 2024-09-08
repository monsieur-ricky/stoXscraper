import { Module } from '@nestjs/common';
import { SymbolService } from './symbol.service';
import { SymbolController } from './symbol.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [SymbolController],
  providers: [SymbolService],
  imports: [HttpModule],
})
export class SymbolModule {}
