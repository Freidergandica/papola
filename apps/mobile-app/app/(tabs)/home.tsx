import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Store, Deal } from '../../types';
import { DealCard } from '../../components/DealCard';
import { CompactStoreCard } from '../../components/CompactStoreCard';
import { SkeletonStoreCard } from '../../components/SkeletonStoreCard';
import { router } from 'expo-router';
import { shadowStyles } from '../../styles/shadows';
import { Ionicons } from '@expo/vector-icons';
import { ImageSourcePropType } from 'react-native';
import { useLocation } from '../../hooks/useLocation';
import { sortByDistance, formatDistance, haversineDistance, StoreWithDistance } from '../../lib/geo';
import { useCart } from '../../context/CartContext';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEAL_CARD_WIDTH = SCREEN_WIDTH - 48;

const CATEGORIES: { id: string; label: string; image: ImageSourcePropType }[] = [
  { id: 'comida', label: 'Comida', image: require('../../assets/categories/comida.jpg') },
  { id: 'estilo-de-vida', label: 'Estilo de vida', image: require('../../assets/categories/estilo-de-vida.jpg') },
  { id: 'mercado', label: 'Mercado', image: require('../../assets/categories/mercado.jpg') },
  { id: 'licores', label: 'Licores', image: require('../../assets/categories/licores.jpg') },
  { id: 'salud', label: 'Salud y bienestar', image: require('../../assets/categories/salud.png') },
  { id: 'mascotas', label: 'Mascotas', image: require('../../assets/categories/mascotas.jpg') },
  { id: 'hogar', label: 'Hogar y Jardín', image: require('../../assets/categories/hogar.jpg') },
  { id: 'tecnologia', label: 'Tecnología', image: require('../../assets/categories/tecnologia.jpg') },
  { id: 'entretenimiento', label: 'Entretenimiento', image: require('../../assets/categories/entretenimiento.jpg') },
  { id: 'servicios', label: 'Servicios', image: require('../../assets/categories/servicios.jpg') },
];

export default function HomeScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [featuredDeals, setFeaturedDeals] = useState<Deal[]>([]);
  const [minPrices, setMinPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [activeDealIndex, setActiveDealIndex] = useState(0);

  const { location } = useLocation();
  const { items } = useCart();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Reverse geocoding
  useEffect(() => {
    if (!location) return;
    Location.reverseGeocodeAsync({
      latitude: location.latitude,
      longitude: location.longitude,
    })
      .then((results) => {
        if (results.length > 0) {
          const r = results[0];
          const parts = [r.street, r.city, r.region].filter(Boolean);
          setAddress(parts.join(', '));
        }
      })
      .catch(() => {});
  }, [location]);

  const fetchData = async () => {
    try {
      const now = new Date().toISOString();

      const [storesRes, dealsRes, productsRes] = await Promise.all([
        supabase
          .from('stores')
          .select('*')
          .eq('is_active', true)
          .order('rating', { ascending: false }),
        supabase
          .from('deals')
          .select('*, stores(id, name, logo_url)')
          .eq('is_active', true)
          .eq('is_approved', true)
          .eq('is_featured', true)
          .or(`ends_at.is.null,ends_at.gt.${now}`)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('products')
          .select('store_id, price')
          .eq('is_available', true)
          .order('price', { ascending: true }),
      ]);

      setStores(storesRes.data || []);
      setFeaturedDeals(dealsRes.data || []);

      // Build min prices map
      const prices: Record<string, number> = {};
      (productsRes.data || []).forEach((p: { store_id: string; price: number }) => {
        if (prices[p.store_id] === undefined || p.price < prices[p.store_id]) {
          prices[p.store_id] = p.price;
        }
      });
      setMinPrices(prices);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Nearby stores (sorted by distance)
  const nearbyStores: StoreWithDistance[] = useMemo(() => {
    if (!location) return stores.slice(0, 10).map((s) => ({ ...s, distance: undefined }));
    return sortByDistance(stores, location.latitude, location.longitude).slice(0, 10);
  }, [stores, location]);

  // Popular stores (sorted by rating, already ordered from DB)
  const popularStores: StoreWithDistance[] = useMemo(() => {
    return stores.slice(0, 10).map((s) => {
      const distance =
        location && s.latitude != null && s.longitude != null
          ? haversineDistance(location.latitude, location.longitude, s.latitude, s.longitude)
          : undefined;
      return { ...s, distance };
    });
  }, [stores, location]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const onDealScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const offset = event.nativeEvent.contentOffset.x;
      const index = Math.round(offset / (DEAL_CARD_WIDTH + 12));
      setActiveDealIndex(index);
    },
    []
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 px-4" edges={['top']}>
        <View className="mt-4 mb-6 flex-row justify-between items-center">
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 110, height: 36 }}
            resizeMode="contain"
          />
        </View>
        {[1, 2, 3].map((i) => (
          <SkeletonStoreCard key={i} />
        ))}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1F29DE" />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Header ── */}
        <View className="px-4 mt-3 mb-2 flex-row justify-between items-center">
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 110, height: 36 }}
            resizeMode="contain"
          />
          <View className="flex-row items-center">
            <TouchableOpacity className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-100 mr-2" style={shadowStyles.sm}>
              <Ionicons name="notifications-outline" size={20} color="#374151" />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-100"
              style={shadowStyles.sm}
              onPress={() => router.push('/cart')}
            >
              <Ionicons name="cart-outline" size={20} color="#374151" />
              {cartCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-papola-blue rounded-full w-5 h-5 items-center justify-center">
                  <Text className="text-white text-[10px] font-bold">{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Address bar ── */}
        <TouchableOpacity className="mx-4 mb-3 flex-row items-center">
          <Ionicons name="location" size={18} color="#1F29DE" />
          <Text className="text-sm text-gray-700 font-medium ml-1.5 flex-1" numberOfLines={1}>
            {address || 'Obteniendo ubicación...'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#9ca3af" />
        </TouchableOpacity>

        {/* ── Search bar ── */}
        <TouchableOpacity
          className="mx-4 mb-4 flex-row items-center bg-white rounded-xl px-4 py-3 border border-gray-100"
          style={shadowStyles.sm}
          activeOpacity={0.7}
          onPress={() => router.push('/search')}
        >
          <Ionicons name="search" size={18} color="#9ca3af" />
          <Text className="text-gray-400 ml-2 text-sm">Buscar tiendas, productos...</Text>
        </TouchableOpacity>

        {/* ── Promotional banner ── */}
        <View className="mx-4 mb-5 rounded-2xl overflow-hidden bg-papola-green p-5" style={shadowStyles.sm}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-white text-lg font-bold">Ofertas especiales</Text>
              <Text className="text-white/80 text-sm mt-1">
                Descubre los mejores descuentos cerca de ti
              </Text>
              <TouchableOpacity
                className="mt-3 bg-white rounded-lg px-4 py-2 self-start"
                onPress={() => router.push('/(tabs)/deals')}
              >
                <Text className="text-papola-green font-bold text-sm">Ver ofertas</Text>
              </TouchableOpacity>
            </View>
            <View className="items-center justify-center opacity-30">
              <Ionicons name="pricetags" size={64} color="#fff" />
            </View>
          </View>
        </View>

        {/* ── Categories ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          className="mb-5"
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              className="overflow-hidden"
              style={{ width: (SCREEN_WIDTH - 32 - 16) / 3, height: 100, borderRadius: 16 }}
              activeOpacity={0.8}
              onPress={() => router.push('/search')}
            >
              <Image
                source={cat.image}
                className="w-full h-full absolute"
                resizeMode="cover"
              />
              <View
                className="absolute inset-0 bg-black/35 justify-end"
                style={{ paddingTop: 16, paddingBottom: 16, paddingLeft: 8, paddingRight: 8 }}
              >
                <Text className="text-white text-xs font-bold" numberOfLines={1}>{cat.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Featured deals carousel ── */}
        {featuredDeals.length > 0 && (
          <View className="mb-5">
            <View className="px-4 mb-3 flex-row justify-between items-center">
              <Text className="text-lg font-bold text-gray-900">Destacados</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/deals')}>
                <Text className="text-papola-blue text-sm font-medium">Ver más &gt;</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={featuredDeals}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              snapToInterval={DEAL_CARD_WIDTH + 12}
              decelerationRate="fast"
              onScroll={onDealScroll}
              scrollEventThrottle={16}
              renderItem={({ item }) => (
                <DealCard
                  deal={item}
                  featured
                  homeCarousel
                  onPress={() => {
                    if (item.store_id) router.push(`/store/${item.store_id}`);
                  }}
                />
              )}
            />
            {/* Pagination dots */}
            {featuredDeals.length > 1 && (
              <View className="flex-row justify-center mt-3">
                {featuredDeals.map((_, i) => (
                  <View
                    key={i}
                    className={`w-2 h-2 rounded-full mx-1 ${
                      i === activeDealIndex ? 'bg-papola-blue' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Nearby stores ── */}
        {nearbyStores.length > 0 && (
          <View className="mb-5">
            <View className="px-4 mb-3 flex-row justify-between items-center">
              <Text className="text-lg font-bold text-gray-900">Tiendas cercanas</Text>
              <TouchableOpacity onPress={() => router.push('/search')}>
                <Text className="text-papola-blue text-sm font-medium">Ver más &gt;</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={nearbyStores}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item }) => (
                <CompactStoreCard
                  store={item}
                  minPrice={minPrices[item.id]}
                  distance={item.distance != null ? formatDistance(item.distance) : undefined}
                  onPress={() => router.push(`/store/${item.id}`)}
                />
              )}
            />
          </View>
        )}

        {/* ── Popular stores ── */}
        {popularStores.length > 0 && (
          <View className="mb-5">
            <View className="px-4 mb-3 flex-row justify-between items-center">
              <Text className="text-lg font-bold text-gray-900">Tiendas populares</Text>
              <TouchableOpacity onPress={() => router.push('/search')}>
                <Text className="text-papola-blue text-sm font-medium">Ver más &gt;</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={popularStores}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item }) => (
                <CompactStoreCard
                  store={item}
                  minPrice={minPrices[item.id]}
                  distance={item.distance != null ? formatDistance(item.distance) : undefined}
                  onPress={() => router.push(`/store/${item.id}`)}
                />
              )}
            />
          </View>
        )}

        {/* Empty state */}
        {stores.length === 0 && featuredDeals.length === 0 && (
          <View
            className="mx-4 bg-white p-6 rounded-3xl items-center border border-gray-100"
            style={shadowStyles.sm}
          >
            <Text className="text-papola-blue font-bold text-lg">Próximamente</Text>
            <Text className="text-gray-500 text-center mt-2">
              Aún no hay tiendas disponibles en tu zona.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
