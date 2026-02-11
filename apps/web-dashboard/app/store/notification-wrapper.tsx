'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import OrderNotification from '@/components/store/order-notification'

export default function StoreNotificationWrapper() {
  const [storeId, setStoreId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setStoreId(data.id)
        })
    })
  }, [])

  return <OrderNotification storeId={storeId} />
}
