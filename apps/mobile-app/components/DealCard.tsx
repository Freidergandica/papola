import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CountdownTimer } from './CountdownTimer';
import { Deal } from '../types';
import { shadowStyles } from '../styles/shadows';

interface DealCardProps {
  deal: Deal;
  onPress?: () => void;
  featured?: boolean;
  homeCarousel?: boolean;
}

export function DealCard({ deal, onPress, featured, homeCarousel }: DealCardProps) {
  const discountLabel = getDiscountLabel(deal);

  return (
    <TouchableOpacity
      className={`bg-white rounded-2xl border border-gray-100 overflow-hidden ${
        homeCarousel ? 'mr-3' : featured ? 'w-72 mr-4' : 'mb-4'
      }`}
      style={[
        shadowStyles.sm,
        homeCarousel ? { width: Dimensions.get('window').width - 48 } : undefined,
      ]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Image */}
      {deal.image_url ? (
        <View className="relative">
          <Image
            source={{ uri: deal.image_url }}
            className={`w-full ${featured ? 'h-36' : 'h-40'}`}
            resizeMode="cover"
          />
          {/* Discount badge */}
          <View className="absolute top-3 left-3 bg-papola-blue rounded-full px-3 py-1">
            <Text className="text-white text-xs font-bold">{discountLabel}</Text>
          </View>
          {deal.is_flash_deal && deal.ends_at && (
            <View className="absolute top-3 right-3 bg-white/90 rounded-full px-2 py-1">
              <CountdownTimer endsAt={deal.ends_at} compact />
            </View>
          )}
        </View>
      ) : (
        <View className={`w-full ${featured ? 'h-36' : 'h-40'} bg-papola-blue-20 items-center justify-center relative`}>
          <Ionicons name="pricetag" size={40} color="#1F29DE" />
          <View className="absolute top-3 left-3 bg-papola-blue rounded-full px-3 py-1">
            <Text className="text-white text-xs font-bold">{discountLabel}</Text>
          </View>
          {deal.is_flash_deal && deal.ends_at && (
            <View className="absolute top-3 right-3 bg-white/90 rounded-full px-2 py-1">
              <CountdownTimer endsAt={deal.ends_at} compact />
            </View>
          )}
        </View>
      )}

      {/* Content */}
      <View className="p-3">
        <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
          {deal.title}
        </Text>
        {deal.store && (
          <View className="flex-row items-center mt-1">
            <Ionicons name="storefront-outline" size={12} color="#9ca3af" />
            <Text className="text-xs text-gray-400 ml-1">{deal.store.name}</Text>
          </View>
        )}
        {deal.description && (
          <Text className="text-xs text-gray-500 mt-1" numberOfLines={2}>
            {deal.description}
          </Text>
        )}

        {/* Flash deal countdown (full) */}
        {deal.is_flash_deal && deal.ends_at && !featured && (
          <View className="mt-2">
            <CountdownTimer endsAt={deal.ends_at} />
          </View>
        )}

        {deal.min_order_amount && (
          <Text className="text-[10px] text-gray-400 mt-1">
            Pedido mínimo: ${deal.min_order_amount}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function getDiscountLabel(deal: Deal): string {
  switch (deal.discount_type) {
    case 'percentage':
      return `-${deal.discount_value}%`;
    case 'fixed_amount':
      return `-$${deal.discount_value}`;
    case 'buy_x_get_y':
      return `${deal.buy_quantity}x${(deal.buy_quantity || 0) + (deal.get_quantity || 0)}`;
    case 'coupon':
      return deal.coupon_code || 'CUPÓN';
    default:
      return 'OFERTA';
  }
}
