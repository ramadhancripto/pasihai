// ══════════════════════════════════════════════════════════════
// PASIHAI — LAZY REPOSITORY REGISTRY
//
// Inavunja mzunguko wa imports kati ya index.js na spacesRepository.js.
// index.js inasajili repositories hapa baada ya kuziunda; moduli nyingine
// (kwa mfano spacesRepository.js) zinazipata wakati wa KUITWA, si wakati
// wa kupakia moduli. Hii inazuia TDZ kwenye bundle ya SSR (smoke).
// ══════════════════════════════════════════════════════════════

const registry = {}

/** Sajili repository kwa jina lake (index.js huita hii mara moja). */
export function registerRepo(name, repo) {
  registry[name] = repo
}

/** Repository ya kuchelewesha: inasambaza method calls kwa repo iliyosajiliwa. */
export function lazyRepo(name) {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        const repo = registry[name]
        if (!repo) {
          throw new Error(`[Repository] ${name} haijasajiliwa bado.`)
        }
        const value = repo[prop]
        return typeof value === 'function' ? value.bind(repo) : value
      },
    },
  )
}
