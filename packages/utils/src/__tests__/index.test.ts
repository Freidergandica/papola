import { formatCurrency } from '../index';
import { Profile, Store, Product, CartItem } from '../types';

describe('formatCurrency', () => {
  it('should format amount in Bolivares', () => {
    expect(formatCurrency(10)).toBe('Bs. 10.00');
  });

  it('should handle decimals', () => {
    expect(formatCurrency(8.5)).toBe('Bs. 8.50');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('Bs. 0.00');
  });
});

describe('Shared Types', () => {
  it('should create a valid Profile', () => {
    const profile: Profile = {
      id: '123',
      role: 'customer',
    };
    expect(profile.id).toBe('123');
    expect(profile.role).toBe('customer');
  });

  it('should accept store_owner role', () => {
    const profile: Profile = {
      id: '456',
      role: 'store_owner',
    };
    expect(profile.role).toBe('store_owner');
  });

  it('should create a valid Store', () => {
    const store: Store = {
      id: '1',
      name: 'Test Store',
      is_active: true,
    };
    expect(store.is_active).toBe(true);
  });

  it('should create a CartItem from Product', () => {
    const item: CartItem = {
      id: '1',
      store_id: 's1',
      name: 'Burger',
      price: 5.0,
      is_available: true,
      quantity: 2,
    };
    expect(item.quantity).toBe(2);
    expect(item.price).toBe(5.0);
  });
});
