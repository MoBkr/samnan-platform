'use server'

// Lightweight Resend integration via their HTTP API (no SDK dependency).
// If RESEND_API_KEY is not configured, sending is skipped gracefully so the
// rest of the flow still works (admin can share the password manually).

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

interface SendResult {
  sent: boolean
  skipped?: boolean
  error?: string
}

function getFrom() {
  // e.g. "منصة سمنان <no-reply@yourdomain.com>"
  return process.env.RESEND_FROM_EMAIL || 'Samnan <onboarding@resend.dev>'
}

async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { sent: false, skipped: true }
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: getFrom(), to: [to], subject, html }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[email] Resend error', res.status, body)
      return { sent: false, error: `Resend ${res.status}` }
    }
    return { sent: true }
  } catch (e) {
    console.error('[email] network error', e)
    return { sent: false, error: 'network' }
  }
}

export async function sendNewPasswordEmail(to: string, fullName: string | null, password: string): Promise<SendResult> {
  const name = fullName?.trim() || 'عزيزي الموظف'
  const subject = 'إعادة تعيين كلمة المرور — منصة سمنان'
  const html = `
    <div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#f8fafc;padding:32px;">
      <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="background:#1841A0;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:20px;">منصة سمنان القابضة</h1>
        </div>
        <div style="padding:28px;color:#374151;line-height:1.8;">
          <p style="margin:0 0 12px;">مرحباً ${name}،</p>
          <p style="margin:0 0 16px;">تمت إعادة تعيين كلمة المرور الخاصة بحسابك بناءً على طلبك. كلمة المرور الجديدة هي:</p>
          <div style="background:#f1f5f9;border:1px dashed #94a3b8;border-radius:12px;padding:16px;text-align:center;font-size:22px;font-weight:bold;letter-spacing:2px;color:#0f172a;direction:ltr;">
            ${password}
          </div>
          <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">
            ننصح بتغيير كلمة المرور بعد تسجيل الدخول من إعدادات حسابك.
          </p>
          <div style="margin-top:24px;text-align:center;">
            <a href="https://samnan-platform.vercel.app/login"
               style="display:inline-block;background:#1841A0;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:bold;">
              تسجيل الدخول
            </a>
          </div>
        </div>
        <div style="padding:16px;text-align:center;background:#f8fafc;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
          منصة سمنان — تطوير Thakaa Flow
        </div>
      </div>
    </div>
  `
  return sendEmail(to, subject, html)
}
