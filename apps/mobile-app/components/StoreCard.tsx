import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Store } from '../types';
import { Ionicons } from '@expo/vector-icons';

interface StoreCardProps {
  store: Store;
  onPress: () => void;
}

export function StoreCard({ store, onPress }: StoreCardProps) {
  return (
    <TouchableOpacity 
      className="bg-white rounded-2xl mb-4 shadow-sm border border-gray-100 overflow-hidden"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="h-40 w-full bg-gray-200">
        {store.image_url ? (
          <Image 
            source={{ uri: store.image_url }} 
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center bg-purple-100">
            <Ionicons name="restaurant" size={40} color="#9333ea" />
          </View>
        )}
      </View>
      
      <View className="p-4">
        <View className="flex-row justify-between items-start">
          <Text className="text-lg font-bold text-gray-900 flex-1 mr-2">{store.name}</Text>
          <View className="flex-row items-center bg-green-50 px-2 py-1 rounded-lg">
            <Ionicons name="star" size={12} color="#16a34a" />
            <Text className="text-green-700 text-xs font-bold ml-1">{store.rating || 'New'}</Text>
          </View>
        </View>
        
        <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>{store.description}</Text>
        
        <View className="flex-row items-center mt-3 space-x-4">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={14} color="#6b7280" />
            <Text className="text-gray-500 text-xs ml-1">
              {store.delivery_time_min}-{store.delivery_time_max} min
            </Text>
          </View>
          <View className="flex-row items-center ml-4">
            <Ionicons name="bicycle-outline" size={14} color="#6b7280" />
            <Text className="text-gray-500 text-xs ml-1">Envío Gratis</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
