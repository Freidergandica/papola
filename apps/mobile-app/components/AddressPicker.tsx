import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useRef, useCallback } from 'react';
import MapView, { Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../hooks/useLocation';
import { shadowStyles } from '../styles/shadows';

interface AddressResult {
  address: string;
  latitude: number;
  longitude: number;
}

interface AddressPickerProps {
  onAddressSelect: (result: AddressResult) => void;
  initialAddress?: string;
}

export function AddressPicker({ onAddressSelect, initialAddress }: AddressPickerProps) {
  const { location } = useLocation();
  const mapRef = useRef<MapView>(null);
  const [address, setAddress] = useState(initialAddress || '');
  const [geocoding, setGeocoding] = useState(false);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);

  const initialRegion = {
    latitude: location?.latitude ?? 10.4806,
    longitude: location?.longitude ?? -66.9036,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  const reverseGeocode = useCallback(
    async (latitude: number, longitude: number) => {
      setGeocoding(true);
      try {
        const results = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (results.length > 0) {
          const r = results[0];
          const parts = [r.street, r.name, r.district, r.city, r.region].filter(Boolean);
          const formatted = parts.join(', ');
          setAddress(formatted);
          onAddressSelect({ address: formatted, latitude, longitude });
        }
      } catch {
        // Keep existing address if geocoding fails
      } finally {
        setGeocoding(false);
      }
    },
    [onAddressSelect]
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      setCurrentRegion(region);
      reverseGeocode(region.latitude, region.longitude);
    },
    [reverseGeocode]
  );

  const centerOnUser = useCallback(() => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        500
      );
    }
  }, [location]);

  const handleAddressEdit = (text: string) => {
    setAddress(text);
    const lat = currentRegion?.latitude ?? initialRegion.latitude;
    const lng = currentRegion?.longitude ?? initialRegion.longitude;
    onAddressSelect({ address: text, latitude: lat, longitude: lng });
  };

  return (
    <View>
      {/* Map with center pin */}
      <View className="rounded-2xl overflow-hidden border border-gray-200" style={{ height: 220 }}>
        <MapView
          ref={mapRef}
          style={{ width: '100%', height: '100%' }}
          initialRegion={initialRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
        />
        {/* Center pin overlay */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View style={{ marginBottom: 36 }}>
            <Ionicons name="location" size={36} color="#1F29DE" />
          </View>
        </View>

        {/* Use my location button */}
        {location && (
          <TouchableOpacity
            onPress={centerOnUser}
            className="absolute bottom-3 right-3 bg-white rounded-full w-10 h-10 items-center justify-center"
            style={shadowStyles.sm}
          >
            <Ionicons name="locate" size={20} color="#1F29DE" />
          </TouchableOpacity>
        )}
      </View>

      {/* Address display */}
      <View className="mt-3">
        <View className="flex-row items-center mb-1">
          {geocoding && <ActivityIndicator size="small" color="#1F29DE" className="mr-2" />}
          <Text className="text-xs text-gray-400">
            {geocoding ? 'Buscando dirección...' : 'Mueve el mapa para ajustar la ubicación'}
          </Text>
        </View>
        <TextInput
          className="border border-gray-300 rounded-xl px-4 py-3 text-sm"
          placeholder="Ajusta la dirección si es necesario"
          value={address}
          onChangeText={handleAddressEdit}
          multiline
        />
      </View>
    </View>
  );
}
