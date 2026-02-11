import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;

  const mockProductsService = {
    findByStore: jest.fn().mockResolvedValue([
      { id: '1', name: 'Whopper', price: 8.5, is_available: true },
    ]),
    findOne: jest.fn().mockResolvedValue(
      { id: '1', name: 'Whopper', price: 8.5, is_available: true },
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: mockProductsService }],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should return products by store', async () => {
    const result = await controller.findByStore('store-1');
    expect(result).toHaveLength(1);
    expect(mockProductsService.findByStore).toHaveBeenCalledWith('store-1');
  });

  it('should return a single product', async () => {
    const result = await controller.findOne('1');
    expect(result.name).toBe('Whopper');
  });
});
