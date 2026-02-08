import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#9333ea', 
      headerShown: false,
      tabBarStyle: {
        borderTopWidth: 0,
        elevation: 0,
        shadowOpacity: 0,
        height: 60,
        paddingBottom: 10,
      }
    }}>
      <Tabs.Screen 
        name="home" 
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
        }} 
      />
      <Tabs.Screen 
        name="orders" 
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" size={24} color={color} />,
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }} 
      />
    </Tabs>
  );
}
