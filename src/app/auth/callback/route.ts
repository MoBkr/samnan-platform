import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Server-side handler for the password-recovery (and any auth) email link.
// Exchanging the PKCE code here (not in the browser) lets us read the
// httpOnly code-verifier cookie, so the recovery session is established
// reliably. Falls back to OTP token_hash verification if present.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') || '/reset-password'

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'recovery' | 'email' | 'signup' | 'invite' | 'magiclink',
      token_hash: tokenHash,
    })
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  // Couldn't establish the session — send to the reset page in its invalid state.
  return NextResponse.redirect(`${origin}/reset-password?error=expired`)
}
