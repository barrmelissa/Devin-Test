import type { PaymentsAdapter, RefundRequest } from "../types";

/** Mock payments provider (used by the future refunds app). */
export class MockPaymentsAdapter implements PaymentsAdapter {
  async getPayment(paymentId: string) {
    return { id: paymentId, amountCents: 4999, currency: "USD", status: "captured" };
  }

  async refund(request: RefundRequest) {
    console.log(`[mock payments] refund ${request.amountCents} ${request.currency} on ${request.paymentId}: ${request.reason}`);
    return { status: "succeeded" as const, providerRefundId: `re_mock_${Date.now()}` };
  }
}
