/**
 * MSW Mock - Redirect to manual fetch mock implementations
 * This allows tests that import from 'msw' to work with our manual fetch mock
 */

module.exports = {
  http: global.http || {},
  HttpResponse: global.HttpResponse || {},
};
