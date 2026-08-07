/* eslint-disable @typescript-eslint/unbound-method */
import HealthController from "#server/health/health.controller";
import {
  DiskHealthIndicator,
  HealthCheckResult,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  MicroserviceHealthIndicator,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";
import RedisHealthIndicator from "#server/health/redis.health";
import { RmqOptions, Transport } from "@nestjs/microservices";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";

describe("HealthController", (): void => {
  const mockRabbitmqUrls: NonNullable<RmqOptions["options"]>["urls"] = ["amqp://localhost:5672"];
  const mockHealthCheckResult: HealthCheckResult = {
    status: "ok",
    info: {
      database: { status: "up" },
      rabbitmq: { status: "up" },
      redis: { status: "up" },
      memoryHeap: { status: "up" },
      diskStorage: { status: "up" },
      google: { status: "up" },
    },
    error: {},
    details: {
      database: { status: "up" },
      rabbitmq: { status: "up" },
      redis: { status: "up" },
      memoryHeap: { status: "up" },
      diskStorage: { status: "up" },
      google: { status: "up" },
    },
  };

  let healthController: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let dbHealthIndicator: jest.Mocked<TypeOrmHealthIndicator>;
  let microserviceHealthIndicator: jest.Mocked<MicroserviceHealthIndicator>;
  let redisHealthIndicator: jest.Mocked<RedisHealthIndicator>;
  let memoryHealthIndicator: jest.Mocked<MemoryHealthIndicator>;
  let diskHealthIndicator: jest.Mocked<DiskHealthIndicator>;
  let httpHealthIndicator: jest.Mocked<HttpHealthIndicator>;

  beforeEach(async (): Promise<void> => {
    const mockConfigService = { get: jest.fn().mockReturnValue(mockRabbitmqUrls) };
    const mockHealthCheckService = { check: jest.fn() };
    const mockDbHealthIndicator = { pingCheck: jest.fn() };
    const mockMicroserviceHealthIndicator = { pingCheck: jest.fn() };
    const mockRedisHealthIndicator = { isHealthy: jest.fn() };
    const mockMemoryHealthIndicator = { checkHeap: jest.fn() };
    const mockDiskHealthIndicator = { checkStorage: jest.fn() };
    const mockHttpHealthIndicator = { pingCheck: jest.fn() };

    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: TypeOrmHealthIndicator, useValue: mockDbHealthIndicator },
        { provide: MicroserviceHealthIndicator, useValue: mockMicroserviceHealthIndicator },
        { provide: RedisHealthIndicator, useValue: mockRedisHealthIndicator },
        { provide: MemoryHealthIndicator, useValue: mockMemoryHealthIndicator },
        { provide: DiskHealthIndicator, useValue: mockDiskHealthIndicator },
        { provide: HttpHealthIndicator, useValue: mockHttpHealthIndicator },
      ],
    }).compile();

    healthController = testingModule.get<HealthController>(HealthController);
    healthCheckService = testingModule.get<jest.Mocked<HealthCheckService>>(HealthCheckService);
    dbHealthIndicator = testingModule.get<jest.Mocked<TypeOrmHealthIndicator>>(TypeOrmHealthIndicator);
    microserviceHealthIndicator =
      testingModule.get<jest.Mocked<MicroserviceHealthIndicator>>(MicroserviceHealthIndicator);
    redisHealthIndicator = testingModule.get<jest.Mocked<RedisHealthIndicator>>(RedisHealthIndicator);
    memoryHealthIndicator = testingModule.get<jest.Mocked<MemoryHealthIndicator>>(MemoryHealthIndicator);
    diskHealthIndicator = testingModule.get<jest.Mocked<DiskHealthIndicator>>(DiskHealthIndicator);
    httpHealthIndicator = testingModule.get<jest.Mocked<HttpHealthIndicator>>(HttpHealthIndicator);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(HealthController).toBeDefined();
  });

  describe("healthCheck", (): void => {
    it("should call health.check with all indicators and return result", async (): Promise<void> => {
      healthCheckService.check.mockImplementation(async (indicators): Promise<HealthCheckResult> => {
        await Promise.all(indicators.map((indicatorFn): Promise<unknown> => indicatorFn() as Promise<unknown>));

        return mockHealthCheckResult;
      });

      const result = await healthController.healthCheck();

      expect(healthCheckService.check).toHaveBeenCalledWith(expect.any(Array));
      expect(dbHealthIndicator.pingCheck).toHaveBeenCalledWith("database");
      expect(microserviceHealthIndicator.pingCheck).toHaveBeenCalledWith("rabbitmq", {
        transport: Transport.RMQ,
        options: { urls: mockRabbitmqUrls },
      });
      expect(redisHealthIndicator.isHealthy).toHaveBeenCalledWith("redis");
      expect(memoryHealthIndicator.checkHeap).toHaveBeenCalledWith("memoryHeap", 300 * 1024 * 1024);
      expect(diskHealthIndicator.checkStorage).toHaveBeenCalledWith("diskStorage", {
        path: "/",
        thresholdPercent: 0.95,
      });
      expect(httpHealthIndicator.pingCheck).toHaveBeenCalledWith("google", "https://google.com");
      expect(result).toEqual(mockHealthCheckResult);
    });
  });
});
