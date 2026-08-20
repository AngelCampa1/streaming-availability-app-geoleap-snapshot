/**
 * Receipt Validation Service
 * Validates in-app purchase receipts through the GeoLeap backend only.
 */

import apiService from '../api/ApiService';

export interface Receipt {
  transactionId: string;
  productId: string;
  purchaseDate: number;
  platform: 'ios' | 'android';
  receiptData: string;
}

export interface ValidationResult {
  valid: boolean;
  transactionId?: string;
  expiryDate?: number;
  error?: string;
}

interface MobileSubscriptionResponse {
  success?: boolean;
  Success?: boolean;
  errorMessage?: string;
  ErrorMessage?: string;
  subscription?: {
    transactionId?: string;
    endDate?: string;
  };
  Subscription?: {
    TransactionId?: string;
    EndDate?: string;
  };
}

export class ReceiptValidationService {
  private static instance: ReceiptValidationService;

  static getInstance(): ReceiptValidationService {
    if (!ReceiptValidationService.instance) {
      ReceiptValidationService.instance = new ReceiptValidationService();
    }
    return ReceiptValidationService.instance;
  }

  /**
   * Validate receipt through the backend so product, transaction, bundle/package,
   * replay, and expiry checks happen server-side.
   */
  async validateReceipt(receipt: Receipt): Promise<ValidationResult> {
    if (receipt.platform === 'ios') {
      return this.verifyIosReceipt(receipt);
    } else if (receipt.platform === 'android') {
      return this.verifyAndroidReceipt(receipt);
    }

    return {
      valid: false,
      error: 'Unsupported platform',
    };
  }

  private async verifyIosReceipt(receipt: Receipt): Promise<ValidationResult> {
    try {
      const response = await apiService.post<MobileSubscriptionResponse>('/api/mobile/subscription/ios/verify', {
        receiptData: receipt.receiptData,
        productId: receipt.productId,
        transactionId: receipt.transactionId,
      });

      return this.mapBackendResponse(response.data);
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Receipt validation failed',
      };
    }
  }

  private async verifyAndroidReceipt(receipt: Receipt): Promise<ValidationResult> {
    try {
      const packageName = process.env.ANDROID_PACKAGE_NAME || 'com.geoleap.app';
      const response = await apiService.post<MobileSubscriptionResponse>('/api/mobile/subscription/android/verify', {
        purchaseToken: receipt.receiptData,
        productId: receipt.productId,
        packageName,
        orderId: receipt.transactionId,
      });

      return this.mapBackendResponse(response.data);
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Receipt validation failed',
      };
    }
  }

  private mapBackendResponse(data: MobileSubscriptionResponse): ValidationResult {
    const success = data.success ?? data.Success ?? false;
    if (!success) {
      return {
        valid: false,
        error: data.errorMessage ?? data.ErrorMessage ?? 'Receipt validation failed',
      };
    }

    const subscription = data.subscription;
    const pascalSubscription = data.Subscription;
    const endDate = subscription?.endDate ?? pascalSubscription?.EndDate;
    const expiryDate = endDate ? new Date(endDate).getTime() : NaN;

    if (!subscription && !pascalSubscription) {
      return {
        valid: false,
        error: 'Verified subscription details were missing',
      };
    }

    if (!Number.isFinite(expiryDate) || expiryDate <= Date.now()) {
      return {
        valid: false,
        error: 'Verified subscription expiry is invalid',
      };
    }

    return {
      valid: true,
      transactionId: subscription?.transactionId ?? pascalSubscription?.TransactionId,
      expiryDate,
    };
  }
}

export const receiptValidationService = ReceiptValidationService.getInstance();
