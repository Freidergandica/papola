import { View, Text, FlatList, TouchableOpacity, Animated, Dimensions, ViewToken } from 'react-native';
import { useRef, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shadowStyles } from '../styles/shadows';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_SIZE = SCREEN_WIDTH * 0.65;

type Slide = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  circleColor: string;
  iconColor: string;
  title: string;
  description: string;
};

const slides: Slide[] = [
  {
    id: '1',
    icon: 'cart-outline',
    circleColor: '#FECDD3',
    iconColor: '#E11D48',
    title: '¡Descubre un mundo\nde ahorro y sabor!',
    description: 'PaPola te conecta con las mejores ofertas de productos cerca de su fecha de vencimiento a precios increíbles.',
  },
  {
    id: '2',
    icon: 'compass-outline',
    circleColor: '#D2D4F8',
    iconColor: '#4F46E5',
    title: 'Encuentra las mejores\nofertas cerca de ti',
    description: 'Explora tiendas y supermercados en tu zona que ofrecen descuentos exclusivos en productos seleccionados.',
  },
  {
    id: '3',
    icon: 'leaf-outline',
    circleColor: '#FED7AA',
    iconColor: '#EA580C',
    title: '¡Un planeta sano para\nun futuro mejor!',
    description: 'Al comprar estos productos ayudas a reducir el desperdicio de alimentos y cuidas el medio ambiente.',
  },
];

const ONBOARDING_KEY = '@papola/onboarding_completed';

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<Slide>>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/');
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      completeOnboarding();
    }
  }, [currentIndex, completeOnboarding]);

  const renderSlide = useCallback(({ item }: { item: Slide }) => (
    <View style={{ width: SCREEN_WIDTH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <View
        style={{
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          borderRadius: CIRCLE_SIZE / 2,
          backgroundColor: item.circleColor,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 48,
        }}
      >
        <Ionicons name={item.icon} size={CIRCLE_SIZE * 0.4} color={item.iconColor} />
      </View>
      <Text style={{ fontSize: 26, fontWeight: '700', color: '#1F2937', textAlign: 'center', lineHeight: 34, marginBottom: 16 }}>
        {item.title}
      </Text>
      <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24, paddingHorizontal: 8 }}>
        {item.description}
      </Text>
    </View>
  ), []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      {/* Skip button */}
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 8 }}>
        <TouchableOpacity onPress={completeOnboarding} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 16, color: '#6B7280', fontWeight: '500' }}>Saltar</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Animated.FlatList
          ref={flatListRef}
          data={slides}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      </View>

      {/* Bottom section: dots + button */}
      <View style={{ paddingHorizontal: 32, paddingBottom: 24 }}>
        {/* Pagination dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 32 }}>
          {slides.map((_, i) => {
            const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });

            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={i}
                style={{
                  width: dotWidth,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#63c132',
                  opacity: dotOpacity,
                  marginHorizontal: 4,
                }}
              />
            );
          })}
        </View>

        {/* Next / Start button */}
        <TouchableOpacity
          onPress={handleNext}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#1F29DE',
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: 'center',
            ...shadowStyles.blue,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
            {currentIndex === slides.length - 1 ? 'Comenzar' : 'Próximo'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
