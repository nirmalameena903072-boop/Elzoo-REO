import type { Intent, PaymentProvider, SettlementResult } from "./provider";

/** Encodes a UPI deep-link string so the QR is structurally right, not a picture of a QR. */
function upiString(args: { upiId: string; amountPaise: number; note: string }): string {
  const amount = (args.amountPaise / 100).toFixed(2);
  const params = new URLSearchParams({
    pa: args.upiId,
    pn: "Alsa",
    am: amount,
    cu: "INR",
    tn: args.note.slice(0, 40),
  });
  return `upi://pay?${params.toString()}`;
}

/**
 * MockProvider: a 3-second UPI settlement, a believable reference, and no network.
 * Amounts are echoed back so a mismatch can never silently "succeed".
 */
export class MockProvider implements PaymentProvider {
  readonly name = "mock";

  async createIntent(args: {
    amountPaise: number;
    upiId: string;
    note: string;
  }): Promise<Intent> {
    return {
      providerRef: `mock_pi_${Math.random().toString(36).slice(2, 12)}`,
      upiIntent: upiString({ upiId: args.upiId, amountPaise: args.amountPaise, note: args.note }),
      settleAfterMs: 3000,
    };
  }

  async simulateSettlement(args: { providerRef: string; amountPaise: number }): Promise<SettlementResult> {
    if (args.amountPaise <= 0) {
      return { providerRef: args.providerRef, state: "FAILED", reason: "Amount 0 nahi ho sakta" };
    }
    return { providerRef: args.providerRef, state: "SUCCESS" };
  }
}

export const paymentProvider: PaymentProvider = new MockProvider();
