import { View } from 'react-native';
import { shadowStyles } from '../styles/shadows';

export function SkeletonDealCard({ featured }: { featured?: boolean }) {
  return (
    <View
      className={`bg-white rounded-2xl border border-gray-100 overflow-hidden ${
        featured ? 'w-72 mr-4' : 'mb-4'
      }`}
      style={shadowStyles.sm}
    >
      <View className={`w-full ${featured ? 'h-36' : 'h-40'} bg-gray-200 animate-pulse`} />
      <View className="p-3">
        <View className="h-4 bg-gray-200 rounded-md w-3/4 animate-pulse" />
        <View className="h-3 bg-gray-200 rounded-md w-1/3 mt-2 animate-pulse" />
        <View className="h-3 bg-gray-200 rounded-md w-full mt-2 animate-pulse" />
      </View>
    </View>
  );
}
