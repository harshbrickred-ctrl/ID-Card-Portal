export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string | string[],
    public readonly details?: unknown,
  ) {
    super(Array.isArray(message) ? message.join("; ") : message);
    this.name = "ApiError";
  }

  get messageRaw(): string | string[] {
    return Array.isArray(this.message) ? this.message : this.message;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string | string[]) {
    super(400, "BAD_REQUEST", message);
  }
}
