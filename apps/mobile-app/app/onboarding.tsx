import { View, Text, FlatList, TouchableOpacity, Animated, Dimensions, ViewToken, Image, ImageSourcePropType } from 'react-native';
import { useRef, useState, useCallback } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.48;
const TEAL_BG = '#7FB5B0';

type Slide = {
  id: string;
  image: ImageSourcePropType;
  title: string;
  description: string;
};

const slides: Slide[] = [
  {
    id: '1',
    image: require('../assets/onboarding-1.png'),
    title: '¡Descubre un mundo de\nahorro y sabor!',
    description: 'Bienvenido a la app que te permitirá disfrutar de las mejores ofertas en los productos de tus tiendas favoritas.',
  },
  {
    id: '2',
    image: require('../assets/onboarding-2.png'),
    title: 'Encuentra las mejores\nofertas cerca de ti',
    description: 'Podrás convertirte en un explorador urbano y descubrir las mejores ofertas en los mejores productos de tu ciudad.',
  },
  {
    id: '3',
    image: require('../assets/onboarding-3.png'),
    title: 'Informate de las liquidaciones\ndel comercio',
    description: 'Accede a las notificaciones de tus productos preferidos en remate.',
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
    <View style={{ width: SCREEN_WIDTH, backgroundColor: TEAL_BG }}>
      {/* Image */}
      <View style={{ overflow: 'hidden', borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
        <Image
          source={item.image}
          style={{ width: SCREEN_WIDTH, height: IMAGE_HEIGHT }}
          resizeMode="cover"
        />
      </View>

      {/* Text content */}
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', marginTop: 0, paddingHorizontal: 32, paddingTop: 32 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#1F2937', textAlign: 'center', lineHeight: 32, marginBottom: 16 }}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 }}>
          {item.description}
        </Text>
      </View>
    </View>
  ), []);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Teal top area behind the image */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: IMAGE_HEIGHT, backgroundColor: TEAL_BG }} />

      {/* Slides */}
      <View style={{ flex: 1 }}>
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
      <View style={{ paddingHorizontal: 48, paddingBottom: 48 }}>
        {/* Pagination dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 28 }}>
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
            borderRadius: 28,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '600' }}>
            {currentIndex === slides.length - 1 ? 'Comenzar' : 'Próximo'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
