/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext } from "@nestjs/common";
import { ThrottlerException, ThrottlerModule } from "@nestjs/throttler";
import CustomThrottlerGuard, { ThrottlerLimitDetailWithTimeToReset } from "#server/common/guards/throttler.guard";
import { faker } from "@faker-js/faker";

describe("CustomThrottlerGuard", (): void => {
  let customThrottlerGuard: CustomThrottlerGuard;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockResponse: { setHeader: jest.Mock };

  beforeEach(async (): Promise<void> => {
    mockResponse = { setHeader: jest.fn() };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as unknown as jest.Mocked<ExecutionContext>;

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
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(customThrottlerGuard).toBeDefined();
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
        jest.clearAllMocks();
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
