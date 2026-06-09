/**
 * Application errors with an HTTP status attached.
 *
 * Throw one of these from anywhere in a route handler / service and the
 * central error handler middleware turns it into a JSON response with the
 * correct status code. `code` is a stable, machine-readable identifier the
 * frontend can switch on if it ever needs to.
 */
export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    message: string,
    options: { status?: number; code?: string; details?: unknown } = {},
  ) {
    super(message);
    this.name = "AppError";
    this.status = options.status ?? 500;
    this.code = options.code ?? "internal_error";
    this.details = options.details;
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(message, { status: 400, code: "bad_request", details });
  }
  static unauthorized(message = "Yetkilendirilmedi.") {
    return new AppError(message, { status: 401, code: "unauthorized" });
  }
  static forbidden(message = "Bu işlem için izniniz yok.") {
    return new AppError(message, { status: 403, code: "forbidden" });
  }
  static notFound(message = "Bulunamadı.") {
    return new AppError(message, { status: 404, code: "not_found" });
  }
  static conflict(message: string) {
    return new AppError(message, { status: 409, code: "conflict" });
  }
  static tooMany(message = "Çok fazla istek. Lütfen sonra tekrar deneyin.") {
    return new AppError(message, { status: 429, code: "too_many_requests" });
  }
}
