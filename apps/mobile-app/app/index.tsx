import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, Animated as RNAnimated } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { FontAwesome } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { shadowStyles } from '../styles/shadows';

export default function LoginScreen() {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [waitingForOtp, setWaitingForOtp] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  // Splash animation values (built-in Animated API)
  const logoScale = useRef(new RNAnimated.Value(0.3)).current;
  const logoOpacity = useRef(new RNAnimated.Value(0)).current;
  const sloganOpacity = useRef(new RNAnimated.Value(0)).current;
  const sloganTranslateY = useRef(new RNAnimated.Value(20)).current;
  const splashBgOpacity = useRef(new RNAnimated.Value(1)).current;
  const formOpacity = useRef(new RNAnimated.Value(0)).current;
  const formTranslateY = useRef(new RNAnimated.Value(60)).current;

  useEffect(() => {
    // 1. Logo fades in + scale with spring bounce
    RNAnimated.parallel([
      RNAnimated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      RNAnimated.spring(logoScale, { toValue: 1, damping: 12, stiffness: 100, mass: 0.8, useNativeDriver: true }),
    ]).start();

    // 2. Slogan fades in + slides up (after 500ms)
    setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(sloganOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        RNAnimated.spring(sloganTranslateY, { toValue: 0, damping: 14, stiffness: 100, useNativeDriver: true }),
      ]).start();
    }, 500);

    // 3. Pulse the logo (after 1200ms)
    setTimeout(() => {
      RNAnimated.sequence([
        RNAnimated.timing(logoScale, { toValue: 1.08, duration: 200, useNativeDriver: true }),
        RNAnimated.spring(logoScale, { toValue: 1, damping: 10, stiffness: 120, useNativeDriver: true }),
      ]).start();
    }, 1200);

    // 4. Fade out splash, reveal form (after 1800ms)
    setTimeout(() => {
      RNAnimated.timing(splashBgOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start();
    }, 1800);

    setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(formOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        RNAnimated.spring(formTranslateY, { toValue: 0, damping: 16, stiffness: 90, useNativeDriver: true }),
      ]).start(() => {
        setSplashDone(true);
      });
    }, 2000);
  }, []);

  // Email/Password Auth
  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('¡Registro exitoso!', 'Por favor revisa tu correo para confirmar tu cuenta.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/(tabs)/home');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Phone Auth (OTP)
  const handlePhoneLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
      });
      if (error) throw error;
      setWaitingForOtp(true);
      Alert.alert('Código enviado', 'Revisa tus mensajes de texto.');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: otp,
        type: 'sms',
      });
      if (error) throw error;
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Social Auth
  const handleSocialAuth = async (provider: 'google' | 'facebook') => {
    try {
      const redirectUrl = Linking.createURL('/(tabs)/home');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      if (data.url) {
        Linking.openURL(data.url);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Animated Splash Overlay */}
      {!splashDone && (
        <RNAnimated.View
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 10,
            backgroundColor: 'white',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: splashBgOpacity,
          }}
          pointerEvents={splashDone ? 'none' : 'auto'}
        >
          <RNAnimated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
            <Image
              source={require('../assets/logo.png')}
              style={{ width: 260, height: 130 }}
              resizeMode="contain"
            />
          </RNAnimated.View>
          <RNAnimated.Text
            style={{
              marginTop: 16,
              fontSize: 20,
              fontWeight: '600',
              color: '#6b7280',
              letterSpacing: 1,
              opacity: sloganOpacity,
              transform: [{ translateY: sloganTranslateY }],
            }}
          >
            Tu resuelve!!!
          </RNAnimated.Text>
        </RNAnimated.View>
      )}

      {/* Login Form */}
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <RNAnimated.ScrollView
          style={{ opacity: formOpacity, transform: [{ translateY: formTranslateY }] }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32 }}
        >
          <View className="items-center mb-10">
            <Image source={require('../assets/logo.png')} style={{ width: 200, height: 100 }} resizeMode="contain" />
            <Text className="text-gray-500 mt-2 text-lg">Tu resuelve!!!</Text>
          </View>

          {/* Auth Method Tabs */}
          <View className="flex-row bg-gray-100 p-1 rounded-xl mb-8">
            <TouchableOpacity
              className={`flex-1 py-2 rounded-lg items-center ${authMethod === 'email' ? 'bg-white' : ''}`}
              style={authMethod === 'email' ? shadowStyles.sm : undefined}
              onPress={() => { setAuthMethod('email'); setWaitingForOtp(false); }}
            >
              <Text className={`font-medium ${authMethod === 'email' ? 'text-papola-blue' : 'text-gray-500'}`}>Correo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2 rounded-lg items-center ${authMethod === 'phone' ? 'bg-white' : ''}`}
              style={authMethod === 'phone' ? shadowStyles.sm : undefined}
              onPress={() => setAuthMethod('phone')}
            >
              <Text className={`font-medium ${authMethod === 'phone' ? 'text-papola-blue' : 'text-gray-500'}`}>Teléfono</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-y-4">
            {authMethod === 'email' ? (
              <>
                <View>
                  <Text className="text-gray-700 font-medium mb-2 ml-1">Correo Electrónico</Text>
                  <TextInput
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-800 text-base"
                    placeholder="hola@papola.app"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
                <View>
                  <Text className="text-gray-700 font-medium mb-2 ml-1">Contraseña</Text>
                  <TextInput
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-800 text-base"
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
                <TouchableOpacity
                  className="bg-papola-blue py-4 rounded-2xl items-center mt-2"
                  style={shadowStyles.blue}
                  onPress={handleEmailAuth}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">{isSignUp ? 'Registrarse' : 'Iniciar Sesión'}</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {!waitingForOtp ? (
                  <View>
                    <Text className="text-gray-700 font-medium mb-2 ml-1">Número de Teléfono</Text>
                    <TextInput
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-800 text-base"
                      placeholder="+57 300 123 4567"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                    <TouchableOpacity
                      className="bg-papola-blue py-4 rounded-2xl items-center mt-6"
                      style={shadowStyles.blue}
                      onPress={handlePhoneLogin}
                      disabled={loading}
                    >
                      {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Enviar Código</Text>}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <Text className="text-gray-700 font-medium mb-2 ml-1">Código de Verificación</Text>
                    <TextInput
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-800 text-base text-center tracking-widest font-bold"
                      placeholder="000000"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <TouchableOpacity
                      className="bg-papola-blue py-4 rounded-2xl items-center mt-6"
                      style={shadowStyles.blue}
                      onPress={handleVerifyOtp}
                      disabled={loading}
                    >
                      {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Verificar y Entrar</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity className="items-center mt-4" onPress={() => setWaitingForOtp(false)}>
                       <Text className="text-papola-blue font-medium">Cambiar número</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {authMethod === 'email' && (
              <TouchableOpacity className="items-center mt-2" onPress={() => setIsSignUp(!isSignUp)}>
                <Text className="text-gray-500 text-sm">
                  {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                </Text>
              </TouchableOpacity>
            )}

            <View className="flex-row items-center my-6">
              <View className="flex-1 h-px bg-gray-200" />
              <Text className="mx-4 text-gray-400 text-sm">O continúa con</Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>

            <View className="flex-row justify-center gap-x-6">
              <TouchableOpacity
                className="w-14 h-14 bg-white border border-gray-200 rounded-full items-center justify-center"
                style={shadowStyles.sm}
                onPress={() => handleSocialAuth('google')}
              >
                <FontAwesome name="google" size={24} color="#DB4437" />
              </TouchableOpacity>

              <TouchableOpacity
                className="w-14 h-14 bg-white border border-gray-200 rounded-full items-center justify-center"
                style={shadowStyles.sm}
                onPress={() => handleSocialAuth('facebook')}
              >
                <FontAwesome name="facebook" size={24} color="#4267B2" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="items-center mt-10">
             <Text className="text-gray-300 text-xs">Al continuar, aceptas nuestros Términos y Condiciones</Text>
          </View>
        </RNAnimated.ScrollView>
      </SafeAreaView>
    </View>
  );
}
