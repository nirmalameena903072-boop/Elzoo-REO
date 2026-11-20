export type DomainCode =
  | "ILLEGAL_TRANSITION"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "EXPIRED";

export class DomainError extends Error {
  code: DomainCode;
  status: number;
  detail?: Record<string, unknown>;

  constructor(code: DomainCode, message: string, status = 409, detail?: Record<string, unknown>) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export const notFound = (what: string) => new DomainError("NOT_FOUND", `${what} nahi mila — page refresh karke dekhein.`, 404);
export const forbidden = (msg = "Is table ke liye aapko permission nahi hai.") =>
  new DomainError("FORBIDDEN", msg, 403);
