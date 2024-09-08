import { Test, TestingModule } from '@nestjs/testing';
import { SymbolService } from './symbol.service';
import { HttpModule } from '@nestjs/axios';

describe('SymbolService', () => {
  let service: SymbolService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SymbolService],
      imports: [HttpModule],
    }).compile();

    service = module.get<SymbolService>(SymbolService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
