import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const headers = {
  'User-Agent': 'Mozilla/5.0 (compatible; PapolaApp/1.0)',
  Accept: 'application/json',
}

export async function GET() {
  const errors: string[] = []

  // Primary: bcv-api.rafnixg.dev (free, no auth)
  try {
    const res = await fetch('https://bcv-api.rafnixg.dev/rates/', {
      cache: 'no-store',
      headers,
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const data = await res.json()
      if (data?.dollar) {
        return NextResponse.json({ rate: data.dollar, source: 'bcv-api' })
      }
      errors.push(`bcv-api: unexpected response: ${JSON.stringify(data)}`)
    } else {
      errors.push(`bcv-api: HTTP ${res.status}`)
    }
  } catch (e) {
    errors.push(`bcv-api: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Fallback: pydolarve
  try {
    const res = await fetch('https://pydolarve.org/api/v2/dollar?monitor=bcv', {
      cache: 'no-store',
      headers,
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const data = await res.json()
      const rate = data?.price || data?.monitors?.bcv?.price
      if (rate) {
        return NextResponse.json({ rate, source: 'pydolarve' })
      }
      errors.push(`pydolarve: unexpected response: ${JSON.stringify(data)}`)
    } else {
      errors.push(`pydolarve: HTTP ${res.status}`)
    }
  } catch (e) {
    errors.push(`pydolarve: ${e instanceof Error ? e.message : String(e)}`)
  }

  return NextResponse.json(
    { error: 'No se pudo obtener la tasa', details: errors },
    { status: 502 }
  )
}
