/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import RedisHealthIndicator from "#server/health/redis.health";
import { HealthIndicatorService } from "@nestjs/terminus";
import { REDIS_CLIENT } from "#server/configs/constants";
import Redis from "ioredis";
import { HealthIndicatorSession } from "@nestjs/terminus/dist/health-indicator/health-indicator.service";

describe("RedisHealthIndicator", () => {
  let redisHealthIndicator: RedisHealthIndicator;
  let redisClient: jest.Mocked<Redis>;
  let healthIndicatorService: jest.Mocked<HealthIndicatorService>;

  beforeEach(async (): Promise<void> => {
    const mockedRedisClient = { ping: jest.fn() };
    const mockedHealthIndicatorService = { check: jest.fn() };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        { provide: REDIS_CLIENT, useValue: mockedRedisClient },
        { provide: HealthIndicatorService, useValue: mockedHealthIndicatorService },
      ],
    }).compile();

    redisHealthIndicator = testingModule.get<RedisHealthIndicator>(RedisHealthIndicator);
    redisClient = testingModule.get<jest.Mocked<Redis>>(REDIS_CLIENT);
    healthIndicatorService = testingModule.get<jest.Mocked<HealthIndicatorService>>(HealthIndicatorService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(redisHealthIndicator).toBeDefined();
  });

  describe("isHealthy", (): void => {
    it("should return up status when Redis responds with PONG", async (): Promise<void> => {
      const indicatorKey = "redis";
      const mockIndicator = {
        up: jest.fn().mockReturnValue({ status: "up", message: "Redis is healthy" }),
        down: jest.fn().mockReturnValue({ status: "down", message: "Redis is not healthy" }),
      } as unknown as HealthIndicatorSession;

      redisClient.ping.mockResolvedValue("PONG");
      healthIndicatorService.check.mockReturnValue(mockIndicator);

      const result = await redisHealthIndicator.isHealthy(indicatorKey);

      expect(healthIndicatorService.check).toHaveBeenCalledWith(indicatorKey);
      expect(redisClient.ping).toHaveBeenCalledTimes(1);
      expect(mockIndicator.up).toHaveBeenCalledWith({ message: "Redis is healthy" });
      expect(mockIndicator.down).not.toHaveBeenCalled();
      expect(result).toEqual({ status: "up", message: "Redis is healthy" });
    });

    it("should return down status when Redis does not respond with PONG", async (): Promise<void> => {
      const indicatorKey = "redis";
      const mockIndicator = {
        up: jest.fn().mockReturnValue({ status: "up", message: "Redis is healthy" }),
        down: jest.fn().mockReturnValue({ status: "down", message: "Redis is not healthy" }),
      } as unknown as HealthIndicatorSession;

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
      const mockIndicator = {
        up: jest.fn().mockReturnValue({ status: "up", message: "Redis is healthy" }),
        down: jest.fn().mockReturnValue({ status: "down", message: errorMessage }),
      } as unknown as HealthIndicatorSession;

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
