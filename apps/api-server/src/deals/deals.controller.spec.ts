import { Test, TestingModule } from '@nestjs/testing';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';

describe('DealsController', () => {
  let controller: DealsController;
  let service: DealsService;

  const mockDealsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByCode: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    redeem: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DealsController],
      providers: [
        { provide: DealsService, useValue: mockDealsService },
      ],
    }).compile();

    controller = module.get<DealsController>(DealsController);
    service = module.get<DealsService>(DealsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all deals without filters', async () => {
      const deals = [{ id: '1', title: 'Deal 1' }];
      mockDealsService.findAll.mockResolvedValue(deals);

      const result = await controller.findAll();
      expect(result).toEqual(deals);
      expect(mockDealsService.findAll).toHaveBeenCalledWith({
        store_id: undefined,
        active: undefined,
        featured: undefined,
        flash: undefined,
        approved: undefined,
      });
    });

    it('should pass filters correctly', async () => {
      mockDealsService.findAll.mockResolvedValue([]);

      await controller.findAll('store-1', 'true', 'true', 'false', 'true');
      expect(mockDealsService.findAll).toHaveBeenCalledWith({
        store_id: 'store-1',
        active: true,
        featured: true,
        flash: false,
        approved: true,
      });
    });
  });

  describe('findOne', () => {
    it('should return a single deal', async () => {
      const deal = { id: '1', title: 'Deal 1' };
      mockDealsService.findOne.mockResolvedValue(deal);

      const result = await controller.findOne('1');
      expect(result).toEqual(deal);
      expect(mockDealsService.findOne).toHaveBeenCalledWith('1');
    });
  });

  describe('findByCode', () => {
    it('should find a deal by coupon code', async () => {
      const deal = { id: '1', coupon_code: 'SAVE10' };
      mockDealsService.findByCode.mockResolvedValue(deal);

      const result = await controller.findByCode('SAVE10');
      expect(result).toEqual(deal);
      expect(mockDealsService.findByCode).toHaveBeenCalledWith('SAVE10');
    });
  });

  describe('create', () => {
    it('should create a new deal', async () => {
      const dealData = {
        store_id: 'store-1',
        created_by: 'user-1',
        title: 'New Deal',
        discount_type: 'percentage',
        discount_value: 20,
      };
      const created = { id: '1', ...dealData };
      mockDealsService.create.mockResolvedValue(created);

      const result = await controller.create(dealData);
      expect(result).toEqual(created);
      expect(mockDealsService.create).toHaveBeenCalledWith(dealData);
    });
  });

  describe('update', () => {
    it('should update a deal', async () => {
      const updateData = { title: 'Updated Deal', is_featured: true };
      const updated = { id: '1', ...updateData };
      mockDealsService.update.mockResolvedValue(updated);

      const result = await controller.update('1', updateData);
      expect(result).toEqual(updated);
      expect(mockDealsService.update).toHaveBeenCalledWith('1', updateData);
    });
  });

  describe('redeem', () => {
    it('should redeem a deal', async () => {
      const redeemData = { customer_id: 'user-1', order_id: 'order-1' };
      const redemption = { id: 'r1', deal_id: '1', ...redeemData };
      mockDealsService.redeem.mockResolvedValue(redemption);

      const result = await controller.redeem('1', redeemData);
      expect(result).toEqual(redemption);
      expect(mockDealsService.redeem).toHaveBeenCalledWith('1', 'user-1', 'order-1');
    });
  });
});
