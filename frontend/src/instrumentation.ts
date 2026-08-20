export async function register() {
  // Sentry disabled for Cloudflare Workers compatibility
  // @sentry/nextjs uses esbuild __name helper which triggers
  // "Cannot redefine property: name" in Workers runtime.
  // Re-enable when @sentry/nextjs adds Workers support.
  //
  // if (process.env.NEXT_RUNTIME === 'nodejs') {
  //   await import('../sentry.server.config');
  // }
  // if (process.env.NEXT_RUNTIME === 'edge') {
  //   await import('../sentry.edge.config');
  // }
}
