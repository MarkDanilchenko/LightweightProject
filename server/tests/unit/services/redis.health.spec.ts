/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import RedisHealthIndicator from "#server/health/health.redis";
import { HealthIndicatorService } from "@nestjs/terminus";
import { REDIS_CLIENT } from "#server/common/constants";
import Redis from "ioredis";
import { Mocked } from "vitest";

describe("RedisHealthIndicator", () => {
  let redisHealthIndicator: RedisHealthIndicator;
  let redisClient: Mocked<Redis>;
  let healthIndicatorService: Mocked<HealthIndicatorService>;

  beforeEach(async (): Promise<void> => {
    const mockedRedisClient = { ping: vi.fn() };
    const mockedHealthIndicatorService = { check: vi.fn() };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        { provide: REDIS_CLIENT, useValue: mockedRedisClient },
        { provide: HealthIndicatorService, useValue: mockedHealthIndicatorService },
      ],
    }).compile();

    redisHealthIndicator = testingModule.get<RedisHealthIndicator>(RedisHealthIndicator);
    redisClient = testingModule.get<Mocked<Redis>>(REDIS_CLIENT);
    healthIndicatorService = testingModule.get<Mocked<HealthIndicatorService>>(HealthIndicatorService);
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(redisHealthIndicator).toBeDefined();
  });

  describe("isHealthy", (): void => {
    it("should return up status when Redis responds with PONG", async (): Promise<void> => {
      const indicatorKey = "redis";
      const mockIndicator: any = {
        up: vi.fn().mockReturnValue({ status: "up" }),
        down: vi.fn().mockReturnValue({ status: "down", message: "Redis is not healthy" }),
      };

      healthIndicatorService.check.mockReturnValue(mockIndicator);
      redisClient.ping.mockResolvedValue("PONG");

      const result = await redisHealthIndicator.isHealthy(indicatorKey);

      expect(healthIndicatorService.check).toHaveBeenCalledWith(indicatorKey);
      expect(redisClient.ping).toHaveBeenCalledTimes(1);
      expect(mockIndicator.up).toHaveBeenCalled();
      expect(mockIndicator.down).not.toHaveBeenCalled();
      expect(result).toEqual({ status: "up" });
    });

    it("should return down status when Redis does not respond with PONG", async (): Promise<void> => {
      const indicatorKey = "redis";
      const mockIndicator: any = {
        up: vi.fn().mockReturnValue({ status: "up", message: "Redis is healthy" }),
        down: vi.fn().mockReturnValue({ status: "down", message: "Redis is not healthy" }),
      };

      redisClient.ping.mockResolvedValue("NOT_PONG");
      healthIndicatorService.check.mockReturnValue(mockIndicator);

      const result = await redisHealthIndicator.isHealthy(indicatorKey);

      expect(healthIndicatorService.check).toHaveBeenCalledWith(indicatorKey);
      expect(redisClient.ping).toHaveBeenCalledTimes(1);
      expect(mockIndicator.down).toHaveBeenCalledWith({ message: "Redis is not healthy" });
      expect(mockIndicator.up).not.toHaveBeenCalled();
      expect(result).toEqual({ status: "down", message: "Redis is not healthy" });
    });

    it("should return down status when Redis throws an error", async (): Promise<void> => {
      const indicatorKey = "redis";
      const errorMessage = "Connection refused";
      const mockIndicator: any = {
        up: vi.fn().mockReturnValue({ status: "up", message: "Redis is healthy" }),
        down: vi.fn().mockReturnValue({ status: "down", message: errorMessage }),
      };

      redisClient.ping.mockRejectedValue(new Error(errorMessage));
      healthIndicatorService.check.mockReturnValue(mockIndicator);

      const result = await redisHealthIndicator.isHealthy(indicatorKey);

      expect(healthIndicatorService.check).toHaveBeenCalledWith(indicatorKey);
      expect(redisClient.ping).toHaveBeenCalledTimes(1);
      expect(mockIndicator.down).toHaveBeenCalledWith({ message: errorMessage });
      expect(mockIndicator.up).not.toHaveBeenCalled();
      expect(result).toEqual({ status: "down", message: errorMessage });
    });
  });
});
