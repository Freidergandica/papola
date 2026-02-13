import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserAddress } from '../types';
import { supabase } from '../lib/supabase';
import { useLocation } from '../hooks/useLocation';
import * as Location from 'expo-location';

interface EffectiveLocation {
  latitude: number;
  longitude: number;
  address: string;
}

interface AddressContextType {
  addresses: UserAddress[];
  selectedAddress: UserAddress | null;
  effectiveLocation: EffectiveLocation | null;
  loading: boolean;
  fetchAddresses: () => Promise<void>;
  selectAddress: (addr: UserAddress) => void;
  clearSelection: () => void;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

export function AddressProvider({ children }: { children: ReactNode }) {
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [gpsAddress, setGpsAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { location } = useLocation();

  const fetchAddresses = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAddresses([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      const list = (data || []) as UserAddress[];
      setAddresses(list);

      // Auto-select primary if nothing selected yet
      if (!selectedAddress) {
        const primary = list.find((a) => a.is_primary);
        if (primary) setSelectedAddress(primary);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedAddress]);

  useEffect(() => {
    fetchAddresses();
  }, []);

  // Reverse geocode GPS location
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
          setGpsAddress(parts.join(', '));
        }
      })
      .catch(() => {});
  }, [location]);

  const selectAddress = useCallback((addr: UserAddress) => {
    setSelectedAddress(addr);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedAddress(null);
  }, []);

  // Derive effective location
  const effectiveLocation: EffectiveLocation | null = selectedAddress
    ? {
        latitude: selectedAddress.latitude,
        longitude: selectedAddress.longitude,
        address: selectedAddress.address,
      }
    : location && gpsAddress
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          address: gpsAddress,
        }
      : location
        ? {
            latitude: location.latitude,
            longitude: location.longitude,
            address: '',
          }
        : null;

  return (
    <AddressContext.Provider
      value={{
        addresses,
        selectedAddress,
        effectiveLocation,
        loading,
        fetchAddresses,
        selectAddress,
        clearSelection,
      }}
    >
      {children}
    </AddressContext.Provider>
  );
}

export function useAddress() {
  const context = useContext(AddressContext);
  if (context === undefined) {
    throw new Error('useAddress must be used within an AddressProvider');
  }
  return context;
}
