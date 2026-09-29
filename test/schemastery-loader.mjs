/**
 * Module-resolution hook that points `@deepseek-ai/schemastery` at the local
 * stand-in in `./stubs/`. Registered by the Host-half tests with
 * `module.register(...)`; it changes nothing else.
 */
export async function resolve(specifier, context, next) {
  if (specifier === '@deepseek-ai/schemastery') {
    return { url: new URL('./stubs/schemastery.mjs', import.meta.url).href, shortCircuit: true }
  }
  return next(specifier, context)
}
