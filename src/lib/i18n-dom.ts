// ─── DOM-level AR → EN translation engine ───
// When the platform language is English, this walks every visible text node
// and translatable attribute, swaps known Arabic UI phrases for English, and
// keeps watching the DOM (MutationObserver) so React re-renders and portals
// (dialogs, toasts) stay translated. Originals are kept so switching back to
// Arabic restores the exact authored text. Anything not in the dictionary —
// user-entered data — is left untouched.

import { AR_PHRASES, REGEX_RULES } from '@/lib/i18n-phrases'

const AR_CHAR = /[؀-ۿ]/
// Arabic letters/diacritics used as word boundaries. Excludes Arabic
// punctuation (، ؟ ؛) and digits so phrases match right up against them.
const AR_LETTER_CLASS = '\\u0620-\\u065F\\u066E-\\u06FF'
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'])
// These print roots carry their own AR/EN language choice — never rewritten.
const SKIP_IDS = new Set(['materials-print', 'project-summary-print'])
const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'aria-label', 'alt']

let phraseRe: RegExp | null = null
function getPhraseRe(): RegExp {
  if (!phraseRe) {
    const keys = Object.keys(AR_PHRASES)
      .filter((k) => k.length >= 2)
      .sort((a, b) => b.length - a.length)
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    phraseRe = new RegExp(
      `(?<![${AR_LETTER_CLASS}])(?:${keys.join('|')})(?![${AR_LETTER_CLASS}])`,
      'g'
    )
  }
  return phraseRe
}

/** Translate one string; null = nothing translatable in it. */
export function translatePhrase(raw: string): string | null {
  if (!AR_CHAR.test(raw)) return null
  const m = raw.match(/^(\s*)([\s\S]*?)(\s*)$/)
  if (!m) return null
  const [, lead, core, trail] = m
  if (!core) return null

  let en: string | undefined = AR_PHRASES[core]
  if (en === undefined && /\s\s|\n/.test(core)) {
    en = AR_PHRASES[core.replace(/\s+/g, ' ')]
  }
  if (en === undefined) {
    for (const [re, rep] of REGEX_RULES) {
      if (re.test(core)) {
        en = core.replace(re, rep)
        break
      }
    }
  }
  if (en === undefined) {
    // Composite node made purely of known phrases + numbers/punctuation
    // (e.g. "تاريخ الإصدار: 28 يوليو 2026"). All-or-nothing: if ANY Arabic
    // survives the replacement, the node contains user data — leave the
    // whole node untouched so names and free text are never half-translated.
    const replaced = core.replace(getPhraseRe(), (hit) => AR_PHRASES[hit] ?? hit)
    if (replaced !== core && !AR_CHAR.test(replaced)) en = replaced
  }
  if (en === undefined) return null
  return lead + en + trail
}

function isSkipped(start: Element | null): boolean {
  for (let el: Element | null = start; el; el = el.parentElement) {
    if (SKIP_TAGS.has(el.tagName)) return true
    if (el.id && SKIP_IDS.has(el.id)) return true
    if ((el as HTMLElement).dataset?.noI18n !== undefined) return true
  }
  return false
}

/**
 * Start translating the live DOM to English. Returns a stop function that
 * disconnects the observer and restores every original Arabic string.
 */
export function startDomTranslation(): () => void {
  // Latest Arabic original per node/attr — restored when switching back.
  const textOrig = new Map<Text, string>()
  const attrOrig = new Map<Element, Map<string, string>>()

  function translateTextNode(node: Text) {
    const out = translatePhrase(node.data)
    if (out !== null && out !== node.data) {
      textOrig.set(node, node.data)
      node.data = out
    }
  }

  function translateAttrs(el: Element) {
    for (const attr of TRANSLATABLE_ATTRS) {
      const v = el.getAttribute(attr)
      if (!v) continue
      const out = translatePhrase(v)
      if (out !== null && out !== v) {
        let m = attrOrig.get(el)
        if (!m) {
          m = new Map()
          attrOrig.set(el, m)
        }
        m.set(attr, v)
        el.setAttribute(attr, out)
      }
    }
  }

  function processTree(root: Node) {
    if (root.nodeType === Node.TEXT_NODE) {
      if (!isSkipped((root as Text).parentElement)) translateTextNode(root as Text)
      return
    }
    if (!(root instanceof Element) || isSkipped(root)) return
    translateAttrs(root)
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
    )
    let n: Node | null
    while ((n = walker.nextNode())) {
      if (n.nodeType === Node.TEXT_NODE) {
        if (!isSkipped(n.parentElement)) translateTextNode(n as Text)
      } else if (n instanceof Element && !isSkipped(n)) {
        translateAttrs(n)
      }
    }
  }

  // Our own writes produce Arabic-free values, so re-entrant mutation records
  // no-op immediately — no loop guard needed.
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') {
        const t = r.target
        if (t.nodeType === Node.TEXT_NODE && !isSkipped((t as Text).parentElement)) {
          translateTextNode(t as Text)
        }
      } else if (r.type === 'childList') {
        r.addedNodes.forEach((n) => processTree(n))
      } else if (r.type === 'attributes' && r.target instanceof Element) {
        if (!isSkipped(r.target)) translateAttrs(r.target)
      }
    }
  })

  processTree(document.body)
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: TRANSLATABLE_ATTRS,
  })

  return () => {
    observer.disconnect()
    for (const [node, orig] of textOrig) node.data = orig
    for (const [el, attrs] of attrOrig) {
      for (const [attr, orig] of attrs) el.setAttribute(attr, orig)
    }
    textOrig.clear()
    attrOrig.clear()
  }
}
