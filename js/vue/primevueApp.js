function resolvePrimeVueConfig(globalScope = globalThis) {
  return globalScope?.PrimeVue?.Config || globalScope?.primevue?.Config || null;
}

export function configurePrimeVueApp(app, globalScope = globalThis) {
  if (!app || typeof app.use !== "function") return app;
  const PrimeVueConfig = resolvePrimeVueConfig(globalScope);
  if (!PrimeVueConfig) return app;
  app.use(PrimeVueConfig, { unstyled: true });
  return app;
}
