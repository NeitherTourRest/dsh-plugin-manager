/**
 * Minimal stand-in for `@deepseek-ai/schemastery`, used only so the Host halves
 * can be imported by the test process. The real package is a peer supplied by
 * the dsh installation's dependency mirror, not by this repository, and none of
 * these tests exercise schema resolution — they exercise route handling.
 *
 * Every builder returns the same chainable object, which is all the Host halves
 * touch (`z.object({...})`, `z.string()`, `z.number().step(n).min(a).max(b)`,
 * `z.union([...])`, `.default(v)`).
 */
const chainable = () => {
  const api = {}
  for (const method of ['default', 'step', 'min', 'max']) api[method] = () => api
  return api
}

export default {
  object: () => chainable(),
  string: () => chainable(),
  number: () => chainable(),
  boolean: () => chainable(),
  union: () => chainable(),
}
