import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { shadowStyles } from '../../styles/shadows';

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  last_message_at: string;
  support_messages?: Array<{ message: string; created_at: string; sender_id: string }>;
}

const FAQ_ITEMS = [
  {
    question: '¿Cómo hago un pedido?',
    answer: 'Busca una tienda, selecciona los productos que desees, agrégalos al carrito y procede al checkout. Elige tu método de pago y dirección de entrega.',
  },
  {
    question: '¿Qué métodos de pago aceptan?',
    answer: 'Aceptamos Pago Móvil, C2P (Contactless to Pay) y efectivo contra entrega.',
  },
  {
    question: '¿Cómo puedo rastrear mi pedido?',
    answer: 'Ve a la pestaña "Pedidos" y toca el pedido que deseas rastrear. Verás una línea de tiempo con el estado actualizado en tiempo real.',
  },
  {
    question: '¿Puedo cancelar mi pedido?',
    answer: 'Puedes contactar al soporte para solicitar la cancelación de un pedido que aún no haya sido preparado.',
  },
  {
    question: '¿Cuánto tarda la entrega?',
    answer: 'El tiempo de entrega depende de la tienda y tu ubicación. Generalmente entre 30 minutos y 2 horas.',
  },
];

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'orders', label: 'Pedidos' },
  { value: 'payments', label: 'Pagos' },
  { value: 'delivery', label: 'Entregas' },
  { value: 'account', label: 'Mi Cuenta' },
];

const statusConfig: Record<string, { label: string; color: string }> = {
  open: { label: 'Abierto', color: '#3b82f6' },
  in_progress: { label: 'En proceso', color: '#f59e0b' },
  resolved: { label: 'Resuelto', color: '#22c55e' },
  closed: { label: 'Cerrado', color: '#6b7280' },
};

export default function SupportScreen() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newMessage, setNewMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('support_tickets')
        .select('*, support_messages(message, created_at, sender_id)')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false });

      if (data) setTickets(data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const createTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: newSubject.trim(),
          category: newCategory,
        })
        .select()
        .single();

      if (ticketError || !ticket) throw ticketError;

      await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          message: newMessage.trim(),
        });

      setShowNewTicket(false);
      setNewSubject('');
      setNewCategory('general');
      setNewMessage('');
      router.push(`/support/${ticket.id}`);
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setCreating(false);
    }
  };

  const getLastMessage = (ticket: SupportTicket) => {
    const msgs = ticket.support_messages;
    if (!msgs || msgs.length === 0) return '';
    const sorted = [...msgs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return sorted[0].message;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 flex-1">Soporte</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* FAQ Section */}
        <Text className="text-base font-bold text-gray-900 mb-3">Preguntas Frecuentes</Text>
        <View className="bg-white rounded-2xl border border-gray-100 mb-6" style={shadowStyles.sm}>
          {FAQ_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              className={`px-4 py-4 ${index < FAQ_ITEMS.length - 1 ? 'border-b border-gray-100' : ''}`}
              activeOpacity={0.6}
              onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-gray-800 flex-1 mr-2">{item.question}</Text>
                <Ionicons
                  name={expandedFaq === index ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#9ca3af"
                />
              </View>
              {expandedFaq === index && (
                <Text className="text-sm text-gray-500 mt-2 leading-5">{item.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tickets Section */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-base font-bold text-gray-900">Mis Consultas</Text>
          <TouchableOpacity
            className="bg-papola-blue px-4 py-2 rounded-xl flex-row items-center"
            onPress={() => setShowNewTicket(true)}
          >
            <Ionicons name="add" size={16} color="white" />
            <Text className="text-white text-xs font-bold ml-1">Nueva</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#1F29DE" className="mt-8" />
        ) : tickets.length === 0 ? (
          <View className="bg-white rounded-2xl border border-gray-100 p-8 items-center" style={shadowStyles.sm}>
            <Ionicons name="chatbubbles-outline" size={40} color="#d1d5db" />
            <Text className="text-gray-400 text-sm mt-3 text-center">
              No tienes consultas aún.{'\n'}¿Necesitas ayuda? Crea una nueva consulta.
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {tickets.map((ticket) => {
              const status = statusConfig[ticket.status] || statusConfig.open;
              const lastMsg = getLastMessage(ticket);
              return (
                <TouchableOpacity
                  key={ticket.id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 mb-3"
                  style={shadowStyles.sm}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/support/${ticket.id}`)}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center flex-1">
                      <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: status.color + '20' }}>
                        <Text className="text-[10px] font-bold" style={{ color: status.color }}>{status.label}</Text>
                      </View>
                      <Text className="text-xs text-gray-400 ml-2">
                        {new Date(ticket.last_message_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
                  </View>
                  <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>{ticket.subject}</Text>
                  {lastMsg ? (
                    <Text className="text-xs text-gray-500 mt-1" numberOfLines={1}>{lastMsg}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* New Ticket Modal */}
      <Modal visible={showNewTicket} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
          <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-lg font-bold text-gray-900">Nueva Consulta</Text>
                <TouchableOpacity onPress={() => setShowNewTicket(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className="text-sm font-medium text-gray-700 mb-1">Asunto</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 mb-4"
                  placeholder="¿En qué podemos ayudarte?"
                  value={newSubject}
                  onChangeText={setNewSubject}
                />

                <Text className="text-sm font-medium text-gray-700 mb-2">Categoría</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat.value}
                      className={`px-3 py-2 rounded-xl border ${newCategory === cat.value ? 'bg-papola-blue-20 border-papola-blue' : 'border-gray-200'}`}
                      onPress={() => setNewCategory(cat.value)}
                    >
                      <Text className={`text-xs font-bold ${newCategory === cat.value ? 'text-papola-blue' : 'text-gray-500'}`}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className="text-sm font-medium text-gray-700 mb-1">Mensaje</Text>
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 mb-4"
                  placeholder="Describe tu consulta..."
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{ minHeight: 100 }}
                />

                <TouchableOpacity
                  className={`py-3.5 rounded-xl items-center ${!newSubject.trim() || !newMessage.trim() || creating ? 'bg-gray-300' : 'bg-papola-blue'}`}
                  onPress={createTicket}
                  disabled={!newSubject.trim() || !newMessage.trim() || creating}
                >
                  {creating ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-sm">Enviar Consulta</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
