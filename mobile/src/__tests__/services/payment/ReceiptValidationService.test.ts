/**
 * ReceiptValidationService Tests
 *
 * Receipt validation must go through the GeoLeap backend. The mobile app must
 * not call Apple or Google validation APIs directly or carry store secrets.
 */

import apiService from '../../../services/api/ApiService';
import { ReceiptValidationService, type Receipt } from '../../../services/payment/ReceiptValidationService';

jest.mock('../../../services/api/ApiService', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

const mockPost = apiService.post as jest.Mock;

describe('ReceiptValidationService', () => {
  let validationService: ReceiptValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    validationService = ReceiptValidationService.getInstance();
  });

  it('validates iOS receipts through the backend verification endpoint', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
        subscription: {
          transactionId: 'apple-verified-transaction',
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    });

    const receipt: Receipt = {
      transactionId: 'client-transaction',
      productId: 'com.geoleap.premium.monthly',
      purchaseDate: Date.now(),
      platform: 'ios',
      receiptData: 'base64-receipt-data',
    };

    const result = await validationService.validateReceipt(receipt);

    expect(mockPost).toHaveBeenCalledWith('/api/mobile/subscription/ios/verify', {
      receiptData: 'base64-receipt-data',
      productId: 'com.geoleap.premium.monthly',
      transactionId: 'client-transaction',
    });
    expect(result.valid).toBe(true);
    expect(result.transactionId).toBe('apple-verified-transaction');
    expect(result.expiryDate).toBeGreaterThan(Date.now());
  });

  it('validates Android purchases through the backend verification endpoint', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        Success: true,
        Subscription: {
          TransactionId: 'google-verified-order',
          EndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    });

    const receipt: Receipt = {
      transactionId: 'client-order',
      productId: 'com.geoleap.pro.monthly',
      purchaseDate: Date.now(),
      platform: 'android',
      receiptData: 'purchase-token',
    };

    const result = await validationService.validateReceipt(receipt);

    expect(mockPost).toHaveBeenCalledWith('/api/mobile/subscription/android/verify', {
      purchaseToken: 'purchase-token',
      productId: 'com.geoleap.pro.monthly',
      packageName: 'com.geoleap.app',
      orderId: 'client-order',
    });
    expect(result.valid).toBe(true);
    expect(result.transactionId).toBe('google-verified-order');
  });

  it('does not activate entitlement when the backend rejects validation', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        success: false,
        errorMessage: 'Product ID does not match verified receipt',
      },
    });

    const result = await validationService.validateReceipt({
      transactionId: 'client-transaction',
      productId: 'com.geoleap.pro.monthly',
      purchaseDate: Date.now(),
      platform: 'ios',
      receiptData: 'base64-basic-receipt',
    });

    expect(result).toEqual({
      valid: false,
      error: 'Product ID does not match verified receipt',
    });
  });

  it('rejects malformed backend success without a future expiry', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
        subscription: {},
      },
    });

    const result = await validationService.validateReceipt({
      transactionId: 'client-transaction',
      productId: 'com.geoleap.premium.monthly',
      purchaseDate: Date.now(),
      platform: 'ios',
      receiptData: 'base64-receipt',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('expiry');
  });

  it('rejects unsupported platforms', async () => {
    const result = await validationService.validateReceipt({
      transactionId: 'txn',
      productId: 'product',
      purchaseDate: Date.now(),
      platform: 'windows' as any,
      receiptData: 'receipt',
    });

    expect(result.valid).toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
  });
});
