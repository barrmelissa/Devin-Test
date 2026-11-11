// One adapter interface per external system. Apps depend only on these interfaces.

export type KycCheckInput = { customerName: string; country: string; riskScore: number; taxId: string };
export type KycCheckResult = { result: "pass" | "fail" | "review"; reason: string; checkedAt: Date };

export interface KycVendorAdapter {
  runCheck(input: KycCheckInput): Promise<KycCheckResult>;
}

export type RefundRequest = { paymentId: string; amountCents: number; currency: string; reason: string };
export type RefundResult = { status: "succeeded" | "failed"; providerRefundId: string; message?: string };

export interface PaymentsAdapter {
  getPayment(paymentId: string): Promise<{ id: string; amountCents: number; currency: string; status: string }>;
  refund(request: RefundRequest): Promise<RefundResult>;
}

export type NotificationInput = { app: string; message: string; entityId?: string; channel?: string };

export interface NotificationsAdapter {
  send(input: NotificationInput): Promise<void>;
}

export type Adapters = {
  kycVendor: KycVendorAdapter;
  payments: PaymentsAdapter;
  notifications: NotificationsAdapter;
};
