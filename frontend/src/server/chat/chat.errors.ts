export class ChatRateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many chat requests.");
    this.name = "ChatRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ChatProcessingError extends Error {
  readonly sessionId: string;

  constructor(sessionId: string, options?: ErrorOptions) {
    super("Chat processing failed.", options);
    this.name = "ChatProcessingError";
    this.sessionId = sessionId;
  }
}
