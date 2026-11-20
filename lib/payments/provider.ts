import type { PaymentMethod } from "@/lib/db/schema";

export type Intent = {
  providerRef: string;
  upiIntent: string | null;
  /** ms until the mock provider would settle on its own */
  settleAfterMs: number;
};

export type SettlementResult = {
  providerRef: string;
  state: "SUCCESS" | "FAILED";
  reason?: string;
};

/**
 * A paymentProvider is the seam a real gateway would plug into.
 * Nothing above this line knows the money is fake.
 */
export interface PaymentProvider {
  readonly name: string;
  createIntent(args: { amountPaise: number; upiId: string; note: string; method: PaymentMethod }): Promise<Intent>;
  simulateSettlement(args: { providerRef: string; amountPaise: number }): Promise<SettlementResult>;
}
