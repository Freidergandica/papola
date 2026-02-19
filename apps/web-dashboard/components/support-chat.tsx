'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send } from 'lucide-react'

interface Message {
  id: string
  ticket_id: string
  sender_id: string
  message: string
  created_at: string
}

export default function SupportChat({
  ticketId,
  currentUserId,
  initialMessages,
  isClosed,
}: {
  ticketId: string
  currentUserId: string
  initialMessages: Message[]
  isClosed?: boolean
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel(`support-web-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticketId, supabase])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!text.trim() || sending) return
    setSending(true)

    const messageText = text.trim()
    setText('')

    const { error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: currentUserId,
        message: messageText,
      })

    if (error) {
      console.error('Error sending message:', error)
      setText(messageText)
    }

    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Inicio de la conversación
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && (
                  <p className="text-[10px] text-gray-400 font-medium mb-0.5 ml-1">Soporte</p>
                )}
                <div
                  className={`px-4 py-2.5 rounded-2xl ${
                    isOwn
                      ? 'bg-papola-blue text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                </div>
                <p className={`text-[10px] text-gray-400 mt-0.5 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isClosed ? (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500">Esta consulta ha sido cerrada.</p>
        </div>
      ) : (
        <div className="flex items-end gap-2 px-4 py-3 border-t border-gray-200 bg-white">
          <textarea
            className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-papola-blue/20 focus:border-papola-blue max-h-24"
            placeholder="Escribe un mensaje..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              text.trim() ? 'bg-papola-blue hover:bg-papola-blue-80 text-white' : 'bg-gray-200 text-gray-400'
            }`}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
