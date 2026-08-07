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
// React unmounts nodes constantly; originals kept for detached nodes are dead
// weight, so they are swept out at most this often (ms).
const PRUNE_INTERVAL_MS = 5000

// ── Idle scheduling (throttles the observer off React's commit path) ──
type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

function scheduleIdle(cb: () => void): number {
  const w = window as IdleWindow
  if (typeof w.requestIdleCallback === 'function') {
    return w.requestIdleCallback(cb, { timeout: 200 })
  }
  return window.setTimeout(cb, 0)
}

function cancelIdle(handle: number) {
  const w = window as IdleWindow
  if (typeof w.cancelIdleCallback === 'function') w.cancelIdleCallback(handle)
  else window.clearTimeout(handle)
}

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

/**
 * Translate one string; null = nothing translatable in it.
 * `allowPartial` (inside `data-i18n-mixed` containers, e.g. the audit log)
 * translates known phrases even when Arabic data remains around them —
 * producing intentionally bilingual rows like "Purchase request created: تجربة".
 */
export function translatePhrase(raw: string, allowPartial = false): string | null {
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
    if (replaced !== core && (allowPartial || !AR_CHAR.test(replaced))) en = replaced
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

function isMixed(start: Element | null): boolean {
  for (let el: Element | null = start; el; el = el.parentElement) {
    if ((el as HTMLElement).dataset?.i18nMixed !== undefined) return true
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
    const out = translatePhrase(node.data, isMixed(node.parentElement))
    if (out !== null && out !== node.data) {
      textOrig.set(node, node.data)
      node.data = out
    }
  }

  function translateAttrs(el: Element) {
    const mixed = isMixed(el)
    for (const attr of TRANSLATABLE_ATTRS) {
      const v = el.getAttribute(attr)
      if (!v) continue
      const out = translatePhrase(v, mixed)
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

  // Drop originals for nodes React has already unmounted — without this the
  // two maps pin every node ever translated for the whole English session.
  let lastPrune = Date.now()
  function prune() {
    const now = Date.now()
    if (now - lastPrune < PRUNE_INTERVAL_MS) return
    lastPrune = now
    for (const node of textOrig.keys()) if (!node.isConnected) textOrig.delete(node)
    for (const el of attrOrig.keys()) if (!el.isConnected) attrOrig.delete(el)
  }

  // Mutation records are batched and drained when the browser is idle rather
  // than synchronously on every React commit.
  let pending: MutationRecord[] = []
  let idleHandle: number | null = null
  let stopped = false

  function flush() {
    idleHandle = null
    if (stopped) return
    const records = pending
    pending = []
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
    prune()
  }

  // Our own writes produce Arabic-free values, so re-entrant mutation records
  // no-op immediately — no loop guard needed.
  const observer = new MutationObserver((records) => {
    for (const r of records) pending.push(r)
    if (idleHandle === null) idleHandle = scheduleIdle(flush)
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
    stopped = true
    observer.disconnect()
    if (idleHandle !== null) {
      cancelIdle(idleHandle)
      idleHandle = null
    }
    pending = []
    for (const [node, orig] of textOrig) node.data = orig
    for (const [el, attrs] of attrOrig) {
      for (const [attr, orig] of attrs) el.setAttribute(attr, orig)
    }
    textOrig.clear()
    attrOrig.clear()
  }
}
