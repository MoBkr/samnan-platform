'use server'

import { createClient } from '@/lib/supabase/server'

export interface InvoiceFields {
  invoice_number: string
  invoice_date: string
  seller_name: string
  customer_account: string
}

type OcrResult = { data: InvoiceFields } | { error: string }

function normalizeDate(raw: string): string {
  // Accepts YYYY-MM-DD or DD/MM/YYYY (or with -) → returns YYYY-MM-DD
  const ymd = raw.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`
  const dmy = raw.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  return raw
}

function parseInvoiceFields(text: string): InvoiceFields {
  const joined = text.replace(/[ \t]+/g, ' ')
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  // Invoice number
  let invoice_number = ''
  const invPatterns = [
    /(?:invoice\s*(?:no\.?|number|#)|رقم\s*الفاتورة|فاتورة\s*رقم|رقم\s*فاتورة)\s*[:#\-]?\s*([A-Za-z0-9\-/]+)/i,
    /\bINV[-\s]?([A-Za-z0-9\-/]{3,})/i,
  ]
  for (const re of invPatterns) {
    const m = joined.match(re)
    if (m) { invoice_number = (m[1] || m[0]).trim(); break }
  }

  // Date
  let invoice_date = ''
  const dateM = joined.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})|(\d{1,2}[-/]\d{1,2}[-/]\d{4})/)
  if (dateM) invoice_date = normalizeDate(dateM[0])

  // Customer account / id
  let customer_account = ''
  const accM = joined.match(/(?:customer\s*(?:account|no\.?|id)|رقم\s*العميل|حساب\s*العميل|كود\s*العميل|account\s*(?:no\.?|number))\s*[:#\-]?\s*([A-Za-z0-9\-/]+)/i)
  if (accM) customer_account = accM[1].trim()

  // Seller name — best effort: first meaningful (non-numeric) line near the top
  let seller_name = ''
  for (const l of lines.slice(0, 5)) {
    if (l.length >= 3 && !/^[\d\s\-/.:#]+$/.test(l)) { seller_name = l; break }
  }

  return { invoice_number, invoice_date, seller_name, customer_account }
}

// Extracts invoice fields using OCR.space (free). The tax registration
// number is intentionally NOT extracted (fixed & known).
export async function extractInvoice(fileUrl: string, mimeType: string): Promise<OcrResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }

    const apiKey = process.env.OCR_SPACE_API_KEY
    if (!apiKey) {
      return { error: 'خدمة قراءة الفواتير غير مفعّلة. أضف OCR_SPACE_API_KEY (مجاني) في إعدادات Vercel.' }
    }

    const filetype = mimeType === 'application/pdf' ? 'PDF'
      : mimeType.includes('png') ? 'PNG'
      : mimeType.includes('webp') ? 'WEBP'
      : 'JPG'

    const body = new URLSearchParams({
      apikey: apiKey,
      url: fileUrl,
      language: 'ara',
      OCREngine: '1',
      isOverlayRequired: 'false',
      scale: 'true',
      isTable: 'true',
      filetype,
    })

    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!res.ok) {
      console.error('[extractInvoice] ocr.space http', res.status)
      return { error: 'فشلت قراءة الفاتورة. أدخل البيانات يدوياً.' }
    }

    const json = await res.json()
    if (json?.IsErroredOnProcessing) {
      const msg = Array.isArray(json.ErrorMessage) ? json.ErrorMessage.join(' ') : (json.ErrorMessage || '')
      console.error('[extractInvoice] ocr.space error', msg)
      if (/file size/i.test(msg)) return { error: 'حجم الفاتورة كبير على الخدمة المجانية (الحد ~1 ميجابايت). صغّر الصورة أو أدخل البيانات يدوياً.' }
      return { error: 'تعذّرت قراءة الفاتورة. أدخل البيانات يدوياً.' }
    }

    const text: string = json?.ParsedResults?.[0]?.ParsedText ?? ''
    if (!text.trim()) return { error: 'لم يُقرأ نص من الفاتورة. أدخل البيانات يدوياً.' }

    return { data: parseInvoiceFields(text) }
  } catch (e) {
    console.error('[extractInvoice]', e)
    return { error: 'حدث خطأ أثناء قراءة الفاتورة. أدخل البيانات يدوياً.' }
  }
}
