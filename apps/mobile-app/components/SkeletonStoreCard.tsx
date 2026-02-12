import { View } from 'react-native';
import { shadowStyles } from '../styles/shadows';

export function SkeletonStoreCard() {
  return (
    <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4" style={shadowStyles.sm}>
      <View className="w-full h-40 bg-gray-200 animate-pulse" />
      <View className="p-4">
        <View className="h-5 bg-gray-200 rounded-md w-3/4 animate-pulse" />
        <View className="h-3 bg-gray-200 rounded-md w-1/2 mt-2 animate-pulse" />
        <View className="flex-row mt-3 space-x-4">
          <View className="h-3 bg-gray-200 rounded-md w-20 animate-pulse" />
          <View className="h-3 bg-gray-200 rounded-md w-24 ml-4 animate-pulse" />
        </View>
      </View>
    </View>
  );
}
