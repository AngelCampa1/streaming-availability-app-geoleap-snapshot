/**
 * Debug test to verify AsyncStorage mock behavior
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('AsyncStorage Debug', () => {
  beforeAll(() => {
    // Use real timers - AsyncStorage operations are async
    jest.useRealTimers();
  });

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('should clear and set data correctly', async () => {
    // Clear should remove all data
    await AsyncStorage.clear();

    // Verify it's empty
    let value = await AsyncStorage.getItem('test_key');
    expect(value).toBeNull();

    // Set a value
    await AsyncStorage.setItem('test_key', 'value1');
    value = await AsyncStorage.getItem('test_key');
    expect(value).toBe('value1');

    // Clear again
    await AsyncStorage.clear();
    value = await AsyncStorage.getItem('test_key');
    expect(value).toBeNull();

    // Set a different value
    await AsyncStorage.setItem('test_key', 'value2');
    value = await AsyncStorage.getItem('test_key');
    expect(value).toBe('value2');
  });

  it('should handle multiple keys independently', async () => {
    await AsyncStorage.setItem('key1', 'value1');
    await AsyncStorage.setItem('key2', 'value2');

    const val1 = await AsyncStorage.getItem('key1');
    const val2 = await AsyncStorage.getItem('key2');

    expect(val1).toBe('value1');
    expect(val2).toBe('value2');

    // Clear and verify both are gone
    await AsyncStorage.clear();

    const cleared1 = await AsyncStorage.getItem('key1');
    const cleared2 = await AsyncStorage.getItem('key2');

    expect(cleared1).toBeNull();
    expect(cleared2).toBeNull();
  });

  it('should persist across async operations', async () => {
    await AsyncStorage.setItem('persist_key', 'persist_value');

    // Simulate async delay
    await new Promise(resolve => setTimeout(resolve, 10));

    const value = await AsyncStorage.getItem('persist_key');
    expect(value).toBe('persist_value');
  });
});
