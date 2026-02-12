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

export function SkeletonDealCard({ featured }: { featured?: boolean }) {
  return (
    <View
      className={`bg-white rounded-2xl border border-gray-100 overflow-hidden ${
        featured ? 'w-72 mr-4' : 'mb-4'
      }`}
      style={shadowStyles.sm}
    >
      <PulseView cn={`w-full ${featured ? 'h-36' : 'h-40'} bg-gray-200`} />
      <View className="p-3">
        <PulseView cn="h-4 bg-gray-200 rounded-md w-3/4" />
        <PulseView cn="h-3 bg-gray-200 rounded-md w-1/3 mt-2" />
        <PulseView cn="h-3 bg-gray-200 rounded-md w-full mt-2" />
      </View>
    </View>
  );
}
