import { ThrottlerException, ThrottlerGuard, ThrottlerLimitDetail } from "@nestjs/throttler";
import { ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export default class CustomThrottlerGuard extends ThrottlerGuard {
  /**
   * Throws a throttling exception when rate limit is exceeded.
   * Sets the "Retry-After" header on the HTTP response to inform the client when they can retry the request.
   *
   * @param {ExecutionContext} context - The execution context containing the HTTP response object
   * @param {ThrottlerLimitDetail & { timeToReset: number }} throttlerLimitDetail - Throttling details including the time until the limit resets
   *
   * @throws ThrottlerException - Always thrown with a message indicating the rate limit was exceeded
   */
  public throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail & { timeToReset: number },
  ): Promise<void> {
    const response = context.switchToHttp().getResponse();

    response.setHeader("Retry-After", throttlerLimitDetail.timeToReset);

    throw new ThrottlerException(
      `Rate limit exceeded. Please, try again in ${throttlerLimitDetail.timeToReset} seconds`,
    );
  }
}
