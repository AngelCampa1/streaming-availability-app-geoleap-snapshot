/**
 * Server Mock - Redirect to manual fetch mock server
 * This allows tests that import from '../../mocks/server' to work with our manual fetch mock
 */

module.exports = {
  server: global.server || { use: () => {}, resetHandlers: () => {}, close: () => {}, listen: () => {} },
  startServer: () => global.server?.listen(),
  resetServer: () => global.server?.resetHandlers(),
  stopServer: () => global.server?.close(),
};
