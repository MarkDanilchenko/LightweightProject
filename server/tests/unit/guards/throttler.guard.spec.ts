/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext } from "@nestjs/common";
import { ThrottlerException, ThrottlerModule } from "@nestjs/throttler";
import CustomThrottlerGuard, { ThrottlerLimitDetailWithTimeToReset } from "#server/common/guards/throttler.guard";
import { faker } from "@faker-js/faker";
import { Mock, Mocked } from "vitest";

describe("CustomThrottlerGuard", (): void => {
  let customThrottlerGuard: CustomThrottlerGuard;
  let mockExecutionContext: Mocked<ExecutionContext>;
  let mockResponse: { setHeader: Mock };
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(async (): Promise<void> => {
    mockResponse = { setHeader: vi.fn() };

    mockExecutionContext = {
      switchToHttp: vi.fn().mockReturnValue({
        getResponse: vi.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as Mocked<ExecutionContext>;

    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ limit: 10, ttl: 60 * 1_000 }],
        }),
      ],
      providers: [CustomThrottlerGuard],
    }).compile();

    customThrottlerGuard = testingModule.get<CustomThrottlerGuard>(CustomThrottlerGuard);
  });

  afterEach((): void => {
    vi.clearAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("should be defined", (): void => {
    expect(customThrottlerGuard).toBeDefined();
  });

  describe("canActivate", (): void => {
    it("should return true in test environment (disable rate limiting)", async (): Promise<void> => {
      process.env.NODE_ENV = "test";

      const result = await customThrottlerGuard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockExecutionContext.switchToHttp).not.toHaveBeenCalled();
    });

    it("should call parent canActivate in non-test environment", async (): Promise<void> => {
      process.env.NODE_ENV = "development";

      // Spy on the parent canActivate method;
      const canActivateSpy = vi
        .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(customThrottlerGuard)), "canActivate")
        .mockImplementation(() => vi.fn());

      await customThrottlerGuard.canActivate(mockExecutionContext);

      expect(canActivateSpy).toHaveBeenCalledWith(mockExecutionContext);
      canActivateSpy.mockRestore();
    });
  });

  describe("throwThrottlingException", (): void => {
    it("should set Retry-After header and throw ThrottlerException, when throttler limit is exceeded", (): void => {
      const timeToReset: number = faker.number.int({ min: 1, max: 60 });
      const expectedErrorMessage = `Rate limit exceeded. Please, try again in ${timeToReset} seconds`;
      const throttlerLimitDetail: ThrottlerLimitDetailWithTimeToReset = {
        ttl: 60 * 1_000,
        limit: 10,
        key: faker.string.uuid(),
        tracker: faker.string.uuid(),
        timeToExpire: timeToReset,
        totalHits: 10,
        isBlocked: false,
        timeToBlockExpire: 0,
        timeToReset,
      };

      expect((): void => {
        customThrottlerGuard.throwThrottlingException(mockExecutionContext, throttlerLimitDetail);
      }).toThrow(new ThrottlerException(expectedErrorMessage));

      expect(mockExecutionContext.switchToHttp).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalledWith("Retry-After", timeToReset);
    });

    it("should set Retry-After header with different timeToReset values", (): void => {
      const timeToResetValues = [1, 30, 60, 120];

      for (const timeToReset of timeToResetValues) {
        vi.clearAllMocks();
        const expectedErrorMessage = `Rate limit exceeded. Please, try again in ${timeToReset} seconds`;
        const throttlerLimitDetail: ThrottlerLimitDetailWithTimeToReset = {
          ttl: 60 * 1_000,
          limit: 10,
          key: faker.string.uuid(),
          tracker: faker.string.uuid(),
          timeToExpire: timeToReset,
          totalHits: 10,
          isBlocked: false,
          timeToBlockExpire: 0,
          timeToReset,
        };

        expect((): void => {
          customThrottlerGuard.throwThrottlingException(mockExecutionContext, throttlerLimitDetail);
        }).toThrow(new ThrottlerException(expectedErrorMessage));

        expect(mockResponse.setHeader).toHaveBeenCalledWith("Retry-After", timeToReset);
      }
    });
  });
});
