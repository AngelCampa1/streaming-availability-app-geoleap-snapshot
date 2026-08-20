const getEnvironmentConfig = jest.fn(() => ({
  API_BASE_URL: 'http://localhost:8020',
  ENVIRONMENT: 'test',
  ENABLE_LOGGING: false,
  NETWORK_TIMEOUT: 5000,
  CACHE_DURATION: 300000,
  MAX_RETRIES: 3,
  BATCH_SIZE: 20,
}));

export { getEnvironmentConfig };
export default getEnvironmentConfig;
