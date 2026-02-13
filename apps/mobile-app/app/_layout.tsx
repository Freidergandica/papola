import "../global.css";
import { Stack } from "expo-router";
import { CartProvider } from "../context/CartContext";
import { AddressProvider } from "../context/AddressContext";

export default function Layout() {
  return (
    <CartProvider>
      <AddressProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="store/[id]" />
          <Stack.Screen name="cart" options={{ presentation: 'modal' }} />
          <Stack.Screen name="checkout" />
        </Stack>
      </AddressProvider>
    </CartProvider>
  );
}

