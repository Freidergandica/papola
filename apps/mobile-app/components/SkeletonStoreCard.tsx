import { View, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { shadowStyles } from '../styles/shadows';

function PulseView({ style, className: cn }: { style?: object; className?: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View className={cn} style={[style, { opacity }]} />;
}

export function SkeletonStoreCard() {
  return (
    <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4" style={shadowStyles.sm}>
      <PulseView cn="w-full h-40 bg-gray-200" />
      <View className="p-4">
        <PulseView cn="h-5 bg-gray-200 rounded-md w-3/4" />
        <PulseView cn="h-3 bg-gray-200 rounded-md w-1/2 mt-2" />
        <View className="flex-row mt-3 space-x-4">
          <PulseView cn="h-3 bg-gray-200 rounded-md w-20" />
          <PulseView cn="h-3 bg-gray-200 rounded-md w-24 ml-4" />
        </View>
      </View>
    </View>
  );
}
