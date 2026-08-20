export const getEnvironmentConfig = () => ({
  API_BASE_URL: 'https://api.geoleap.app',
  ENVIRONMENT: 'production',
  ENABLE_LOGGING: true,
  NETWORK_TIMEOUT: 5000,
  CACHE_DURATION: 300000,
  MAX_RETRIES: 3,
  BATCH_SIZE: 20,
});

export default getEnvironmentConfig;
