import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Store } from '../../types';
import { StoreCard } from '../../components/StoreCard';
import { SkeletonStoreCard } from '../../components/SkeletonStoreCard';
import { router } from 'expo-router';
import { shadowStyles } from '../../styles/shadows';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../hooks/useLocation';
import { sortByDistance, formatDistance, StoreWithDistance } from '../../lib/geo';
import MapView, { Marker, Callout } from 'react-native-maps';

export default function HomeScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const { location } = useLocation();

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('rating', { ascending: false });

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const sortedStores: StoreWithDistance[] = useMemo(() => {
    if (location) {
      return sortByDistance(stores, location.latitude, location.longitude);
    }
    return stores.map((s) => ({ ...s, distance: undefined }));
  }, [stores, location]);

  const storesWithCoords = useMemo(
    () => sortedStores.filter((s) => s.latitude != null && s.longitude != null),
    [sortedStores]
  );

  const mapInitialRegion = useMemo(() => {
    if (location) {
      return {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    if (storesWithCoords.length > 0) {
      return {
        latitude: storesWithCoords[0].latitude!,
        longitude: storesWithCoords[0].longitude!,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    // Default: Caracas
    return {
      latitude: 10.4806,
      longitude: -66.9036,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }, [location, storesWithCoords]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStores();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 px-4" edges={['top']}>
      <View className="mt-4 mb-6 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Hola, Freider 👋</Text>
          <Text className="text-gray-500">¿Qué se te antoja hoy?</Text>
        </View>
        <TouchableOpacity
          onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
          className="w-10 h-10 bg-white rounded-full items-center justify-center border border-gray-200"
          style={shadowStyles.sm}
        >
          <Ionicons
            name={viewMode === 'list' ? 'map-outline' : 'list-outline'}
            size={20}
            color="#1F29DE"
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1">
          {[1, 2, 3].map((i) => (
            <SkeletonStoreCard key={i} />
          ))}
        </View>
      ) : viewMode === 'map' ? (
        <View className="flex-1 rounded-2xl overflow-hidden mb-4">
          <MapView
            style={{ width: '100%', height: '100%' }}
            initialRegion={mapInitialRegion}
            showsUserLocation
            showsMyLocationButton
          >
            {storesWithCoords.map((store) => (
              <Marker
                key={store.id}
                coordinate={{
                  latitude: store.latitude!,
                  longitude: store.longitude!,
                }}
                title={store.name}
                description={
                  store.distance != null ? formatDistance(store.distance) : undefined
                }
              >
                <Callout onPress={() => router.push(`/store/${store.id}`)}>
                  <View style={{ padding: 4, maxWidth: 200 }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{store.name}</Text>
                    {store.distance != null && (
                      <Text style={{ color: '#6b7280', fontSize: 12 }}>
                        {formatDistance(store.distance)}
                      </Text>
                    )}
                    <Text style={{ color: '#1F29DE', fontSize: 12, marginTop: 2 }}>
                      Ver tienda →
                    </Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
        </View>
      ) : (
        <FlatList
          data={sortedStores}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StoreCard
              store={item}
              distance={item.distance != null ? formatDistance(item.distance) : undefined}
              onPress={() => {
                router.push(`/store/${item.id}`);
              }}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1F29DE" />
          }
          ListEmptyComponent={
            <View
              className="mt-8 bg-white p-6 rounded-3xl items-center border border-gray-100"
              style={shadowStyles.sm}
            >
              <Text className="text-papola-blue font-bold text-lg">Próximamente</Text>
              <Text className="text-gray-500 text-center mt-2">
                Aún no hay restaurantes disponibles en tu zona.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
