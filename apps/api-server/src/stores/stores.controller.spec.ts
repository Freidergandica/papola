import { Test, TestingModule } from '@nestjs/testing';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';

describe('StoresController', () => {
  let controller: StoresController;

  const mockStoresService = {
    findAll: jest.fn().mockResolvedValue([
      { id: '1', name: 'Test Store', is_active: true },
    ]),
    findOne: jest.fn().mockResolvedValue(
      { id: '1', name: 'Test Store', is_active: true },
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoresController],
      providers: [{ provide: StoresService, useValue: mockStoresService }],
    }).compile();

    controller = module.get<StoresController>(StoresController);
  });

  it('should return stores', async () => {
    const result = await controller.findAll();
    expect(result).toHaveLength(1);
    expect(mockStoresService.findAll).toHaveBeenCalled();
  });

  it('should return a single store', async () => {
    const result = await controller.findOne('1');
    expect(result.name).toBe('Test Store');
  });
});
