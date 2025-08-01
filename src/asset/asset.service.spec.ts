import { Test, TestingModule } from '@nestjs/testing';
import { AssetService } from './asset.service';
import { HttpModule } from '@nestjs/axios';
import { PlaywrightService } from '../utilities/playwright.service';

describe('AssetService', () => {
  let service: AssetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssetService, PlaywrightService],
      imports: [HttpModule],
    }).compile();

    service = module.get<AssetService>(AssetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
