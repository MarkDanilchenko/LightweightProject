import { ThrottlerException, ThrottlerGuard, ThrottlerLimitDetail } from "@nestjs/throttler";
import { ExecutionContext, Injectable } from "@nestjs/common";

/**
 * Extends ThrottlerLimitDetail with a timeToReset in seconds.
 */
export interface ThrottlerLimitDetailWithTimeToReset extends ThrottlerLimitDetail {
  timeToReset: number;
}

@Injectable()
export default class CustomThrottlerGuard extends ThrottlerGuard {
  /**
   * Disables rate limiting in test environment to avoid blocking E2E tests.
   *
   * @param {ExecutionContext} context - The execution context
   *
   * @returns {Promise<boolean>} true if request should be allowed, false if rate limit exceeded
   */
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NODE_ENV === "test") {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * Throws a throttling exception when rate limit is exceeded.
   * Sets the "Retry-After" header on the HTTP response to inform the client when they can retry the request.
   *
   * @param {ExecutionContext} context - The execution context containing the HTTP response object
   * @param {ThrottlerLimitDetailWithTimeToReset} throttlerLimitDetail - Throttling details including the time until the limit resets
   *
   * @throws ThrottlerException - Always thrown with a message indicating the rate limit was exceeded
   */
  public throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetailWithTimeToReset,
  ): Promise<void> {
    const response = context.switchToHttp().getResponse();

    // Time to reset in seconds fallback;
    const timeToResetInSeconds =
      throttlerLimitDetail.timeToExpire ??
      throttlerLimitDetail.timeToReset ??
      Math.ceil((throttlerLimitDetail.ttl ?? 60_000) / 1_000);

    response.setHeader("Retry-After", timeToResetInSeconds);

    throw new ThrottlerException(
      `Rate limit exceeded. Please, try again in ${throttlerLimitDetail.timeToReset} seconds`,
    );
  }
}
