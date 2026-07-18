export class FeedbackRateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many feedback submissions.");
    this.name = "FeedbackRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
