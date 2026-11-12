// Importy bez rozszerzenia w kodzie TS gry ('../../sim/tiles') — Node szuka pliku dosłownie; tu dokłada „.ts”.
export async function resolve(specifier, context, next) {
  try { return await next(specifier, context); }
  catch (e) {
    if (e?.code === 'ERR_MODULE_NOT_FOUND' && (specifier.startsWith('./') || specifier.startsWith('../'))) return next(specifier + '.ts', context);
    throw e;
  }
}
