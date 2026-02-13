import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Store } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { shadowStyles } from '../styles/shadows';

interface CompactStoreCardProps {
  store: Store;
  minPrice?: number;
  distance?: string;
  onPress: () => void;
}

export function CompactStoreCard({ store, minPrice, distance, onPress }: CompactStoreCardProps) {
  return (
    <TouchableOpacity
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden mr-3"
      style={[{ width: 170 }, shadowStyles.sm]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Image */}
      <View className="h-28 w-full bg-gray-200">
        {store.image_url ? (
          <Image
            source={{ uri: store.image_url }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center bg-papola-blue-20">
            <Ionicons name="storefront" size={32} color="#1F29DE" />
          </View>
        )}
      </View>

      {/* Content */}
      <View className="p-2.5">
        <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
          {store.name}
        </Text>
        <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
          {store.address || 'Sin dirección'}
        </Text>
        {store.schedule && (
          <View className="flex-row items-center mt-1">
            <Ionicons name="time-outline" size={11} color="#9ca3af" />
            <Text className="text-[10px] text-gray-400 ml-1" numberOfLines={1}>
              {store.schedule}
            </Text>
          </View>
        )}

        {/* Footer: price + distance */}
        <View className="flex-row items-center mt-1.5">
          {minPrice != null ? (
            <Text className="text-xs text-papola-green font-semibold">
              Desde US${minPrice.toFixed(2)}
            </Text>
          ) : (
            <Text className="text-[10px] text-gray-300">Sin productos</Text>
          )}
          {distance && (
            <Text className="text-[10px] text-gray-400 ml-1">· {distance}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
