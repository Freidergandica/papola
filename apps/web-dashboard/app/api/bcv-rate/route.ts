import { NextResponse } from 'next/server'

export async function GET() {
  // Primary: bcv-api.rafnixg.dev (free, no auth)
  try {
    const res = await fetch('https://bcv-api.rafnixg.dev/rates/', {
      next: { revalidate: 300 }, // cache 5 min
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.dollar) {
        return NextResponse.json({ rate: data.dollar, source: 'bcv-api' })
      }
    }
  } catch {
    // Primary failed, try fallback
  }

  // Fallback: pydolarve
  try {
    const res = await fetch('https://pydolarve.org/api/v2/dollar?monitor=bcv', {
      next: { revalidate: 300 },
    })
    if (res.ok) {
      const data = await res.json()
      const rate = data?.price || data?.monitors?.bcv?.price
      if (rate) {
        return NextResponse.json({ rate, source: 'pydolarve' })
      }
    }
  } catch {
    // Fallback also failed
  }

  return NextResponse.json({ error: 'No se pudo obtener la tasa' }, { status: 502 })
}
