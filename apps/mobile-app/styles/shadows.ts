import { StyleSheet } from 'react-native';

/**
 * Inline shadow styles to replace NativeWind shadow-* classes.
 * NativeWind shadow utilities trigger a known race condition with
 * React Navigation context in expo-router.
 * See: https://github.com/nativewind/nativewind/issues/1557
 */
export const shadowStyles = StyleSheet.create({
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 12,
  },
  blue: {
    shadowColor: '#D2D4F8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
});
