import type { ItemState, OrderState } from "@/lib/db/schema";
import { DomainError } from "./errors";

export type Actor = "customer" | "staff" | "manager" | "owner" | "kitchen" | "system";

type Rule = {
  to: OrderState;
  actors: Actor[];
  /** minutes the actor has to make this move, measured from the order's placed_at */
  windowMin?: number;
  requiresNote?: boolean;
};

/** The single source of truth for order state. Client never sets state; this table does. */
export const ORDER_TRANSITIONS: Record<OrderState, Rule[]> = {
  PLACED: [
    { to: "ACCEPTED", actors: ["staff", "manager", "owner", "system"] },
    { to: "REJECTED", actors: ["staff", "manager", "owner"], requiresNote: true },
    { to: "CANCELLED", actors: ["customer"], windowMin: 0.75 },
    { to: "CANCELLED", actors: ["manager", "owner"], requiresNote: true },
  ],
  ACCEPTED: [
    { to: "IN_KITCHEN", actors: ["staff", "manager", "owner", "kitchen"] },
    { to: "CANCELLED", actors: ["manager", "owner"], requiresNote: true },
  ],
  IN_KITCHEN: [
    { to: "PREPARING", actors: ["kitchen", "manager", "owner"] },
    { to: "CANCELLED", actors: ["manager", "owner"], requiresNote: true },
  ],
  PREPARING: [
    { to: "READY", actors: ["kitchen", "manager", "owner"] },
    { to: "CANCELLED", actors: ["manager", "owner"], requiresNote: true },
  ],
  READY: [
    { to: "SERVED", actors: ["staff", "manager", "owner"] },
    { to: "CANCELLED", actors: ["manager", "owner"], requiresNote: true },
  ],
  SERVED: [{ to: "BILLED", actors: ["staff", "manager", "owner", "system", "customer"] }],
  BILLED: [{ to: "PAID", actors: ["system", "staff", "manager", "owner"] }],
  PAID: [],
  CANCELLED: [],
  REJECTED: [],
};

export const ITEM_TRANSITIONS: Record<ItemState, ItemState[]> = {
  QUEUED: ["PREPARING", "READY", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED"],
  SERVED: [],
  CANCELLED: [],
};

export const REJECT_REASON_LABEL: Record<string, string> = {
  ITEM_UNAVAILABLE: "Item aaj khatam ho gaya",
  KITCHEN_CLOSED: "Kitchen abhi band hai",
  TABLE_MISMATCH: "Table match nahi hua",
  DUPLICATE: "Duplicate order",
  OTHER: "Kuch aur",
};

export function canOrderTransition(from: OrderState, to: OrderState, actor: Actor): boolean {
  return ORDER_TRANSITIONS[from]?.some((r) => r.to === to && r.actors.includes(actor)) ?? false;
}

/**
 * Throws DomainError('ILLEGAL_TRANSITION') → HTTP 409.
 * The 45-second customer cancel window and the "reason required" rule live here, not in the UI.
 */
export function assertOrderTransition(args: {
  from: OrderState;
  to: OrderState;
  actor: Actor;
  placedAt: number;
  now: number;
  note?: string | null;
  reason?: string | null;
}): void {
  const { from, to, actor, placedAt, now, note, reason } = args;
  const rules = ORDER_TRANSITIONS[from] ?? [];
  const matching = rules.filter((r) => r.to === to && r.actors.includes(actor));
  if (matching.length === 0) {
    throw new DomainError(
      "ILLEGAL_TRANSITION",
      `Order ${from} se ${to} nahi ja sakta — abhi ${labelFor(from)} hai.`,
    );
  }

  const rule = matching.find((r) => r.windowMin === undefined) ?? matching[0]!;
  if (rule.windowMin !== undefined) {
    const elapsedMin = (now - placedAt) / 60_000;
    if (elapsedMin > rule.windowMin) {
      throw new DomainError(
        "ILLEGAL_TRANSITION",
        "Cancel karne ka time nikal gaya — kitchen ne order pakad liya hai. Staff ko bulaayein.",
      );
    }
  }
  if ((to === "REJECTED" || (to === "CANCELLED" && (actor === "manager" || actor === "owner"))) && !reason && !note) {
    throw new DomainError("VALIDATION", "Reason likhna zaroori hai — kitchen ko pata hona chahiye kyun.");
  }
}

export function assertItemTransition(from: ItemState, to: ItemState): void {
  const allowed = ITEM_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new DomainError("ILLEGAL_TRANSITION", `Item ${from} se ${to} nahi ja sakta.`);
  }
}

export const ORDER_FLOW: OrderState[] = [
  "PLACED",
  "ACCEPTED",
  "IN_KITCHEN",
  "PREPARING",
  "READY",
  "SERVED",
  "BILLED",
  "PAID",
];

export function orderStep(state: OrderState): number {
  const i = ORDER_FLOW.indexOf(state);
  if (state === "REJECTED" || state === "CANCELLED") return -1;
  return i;
}

export function labelFor(state: OrderState): string {
  const map: Record<OrderState, string> = {
    PLACED: "Order mila",
    ACCEPTED: "Accept kiya",
    IN_KITCHEN: "Kitchen mein",
    PREPARING: "Ban raha hai",
    READY: "Ready",
    SERVED: "Serve ho gaya",
    BILLED: "Bill bana",
    PAID: "Paid",
    CANCELLED: "Cancel",
    REJECTED: "Reject",
  };
  return map[state];
}

/** Compute the next legal order state from item states — used before serving / ready bumps. */
export function deriveOrderState(orderState: OrderState, items: Array<{ state: ItemState }>): OrderState {
  const live = items.filter((i) => i.state !== "CANCELLED");
  if (live.length === 0) return orderState;
  const allServed = live.every((i) => i.state === "SERVED");
  const allReady = live.every((i) => i.state === "READY" || i.state === "SERVED");
  const anyPreparing = live.some((i) => i.state === "PREPARING" || i.state === "READY" || i.state === "SERVED");
  if (orderState === "READY" && allServed) return "SERVED";
  if (orderState === "IN_KITCHEN" && anyPreparing) return "PREPARING";
  if (orderState === "PREPARING" && allReady) return "READY";
  return orderState;
}
