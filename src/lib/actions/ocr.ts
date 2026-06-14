'use server'

import { createClient } from '@/lib/supabase/server'

export interface InvoiceFields {
  invoice_number: string
  invoice_date: string
  seller_name: string
  customer_account: string
}

type OcrResult = { data: InvoiceFields } | { error: string }

// Extracts structured fields from a tax-invoice image/PDF using Claude vision.
// The tax registration number is intentionally NOT extracted (fixed & known).
export async function extractInvoice(fileUrl: string, mimeType: string): Promise<OcrResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return { error: 'خدمة قراءة الفواتير غير مفعّلة بعد. أضف ANTHROPIC_API_KEY في إعدادات Vercel.' }
    }

    // Fetch the uploaded file and convert to base64
    const fileRes = await fetch(fileUrl)
    if (!fileRes.ok) return { error: 'تعذّر قراءة الملف المرفوع' }
    const buffer = Buffer.from(await fileRes.arrayBuffer())
    const base64 = buffer.toString('base64')

    const isPdf = mimeType === 'application/pdf'
    const mediaType = isPdf ? 'application/pdf' : (mimeType || 'image/jpeg')

    const sourceBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }

    const prompt = `أنت مساعد لاستخراج بيانات الفواتير الضريبية السعودية. استخرج الحقول التالية من الفاتورة المرفقة وأعدها بصيغة JSON فقط بدون أي نص إضافي:
{
  "invoice_number": "رقم الفاتورة",
  "invoice_date": "تاريخ الفاتورة بصيغة YYYY-MM-DD",
  "seller_name": "اسم الشركة أو البائع",
  "customer_account": "رقم حساب العميل أو رقم العميل"
}
إذا لم تجد حقلاً، اجعل قيمته "". لا تستخرج الرقم الضريبي (السجل الضريبي). أعد JSON صالحاً فقط.`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [sourceBlock, { type: 'text', text: prompt }],
          },
        ],
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[extractInvoice] anthropic error', res.status, body)
      return { error: 'فشلت قراءة الفاتورة. يمكنك إدخال البيانات يدوياً.' }
    }

    const json = await res.json()
    const text: string = json?.content?.[0]?.text ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { error: 'تعذّر استخراج البيانات. أدخلها يدوياً.' }

    const parsed = JSON.parse(match[0])
    return {
      data: {
        invoice_number: String(parsed.invoice_number ?? ''),
        invoice_date: String(parsed.invoice_date ?? ''),
        seller_name: String(parsed.seller_name ?? ''),
        customer_account: String(parsed.customer_account ?? ''),
      },
    }
  } catch (e) {
    console.error('[extractInvoice]', e)
    return { error: 'حدث خطأ أثناء قراءة الفاتورة. أدخل البيانات يدوياً.' }
  }
}
