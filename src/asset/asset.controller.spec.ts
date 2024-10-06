import { Test, TestingModule } from '@nestjs/testing';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';
import { HttpModule } from '@nestjs/axios';

describe('AssetController', () => {
  let controller: AssetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssetController],
      providers: [AssetService],
      imports: [HttpModule],
    }).compile();

    controller = module.get<AssetController>(AssetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
