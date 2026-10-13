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
import { Mocked } from "vitest";

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
      http: { status: "up" },
    },
    error: {},
    details: {
      database: { status: "up" },
      rabbitmq: { status: "up" },
      redis: { status: "up" },
      memoryHeap: { status: "up" },
      diskStorage: { status: "up" },
      http: { status: "up" },
    },
  };

  let healthController: HealthController;
  let healthCheckService: Mocked<HealthCheckService>;
  let dbHealthIndicator: Mocked<TypeOrmHealthIndicator>;
  let microserviceHealthIndicator: Mocked<MicroserviceHealthIndicator>;
  let redisHealthIndicator: Mocked<RedisHealthIndicator>;
  let memoryHealthIndicator: Mocked<MemoryHealthIndicator>;
  let diskHealthIndicator: Mocked<DiskHealthIndicator>;
  let httpHealthIndicator: Mocked<HttpHealthIndicator>;

  beforeEach(async (): Promise<void> => {
    const mockConfigService = { get: vi.fn().mockReturnValue(mockRabbitmqUrls) };
    const mockHealthCheckService = { check: vi.fn() };
    const mockDbHealthIndicator = { pingCheck: vi.fn() };
    const mockMicroserviceHealthIndicator = { pingCheck: vi.fn() };
    const mockRedisHealthIndicator = { isHealthy: vi.fn() };
    const mockMemoryHealthIndicator = { checkHeap: vi.fn() };
    const mockDiskHealthIndicator = { checkStorage: vi.fn() };
    const mockHttpHealthIndicator = { pingCheck: vi.fn() };

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
    healthCheckService = testingModule.get<Mocked<HealthCheckService>>(HealthCheckService);
    dbHealthIndicator = testingModule.get<Mocked<TypeOrmHealthIndicator>>(TypeOrmHealthIndicator);
    microserviceHealthIndicator = testingModule.get<Mocked<MicroserviceHealthIndicator>>(MicroserviceHealthIndicator);
    redisHealthIndicator = testingModule.get<Mocked<RedisHealthIndicator>>(RedisHealthIndicator);
    memoryHealthIndicator = testingModule.get<Mocked<MemoryHealthIndicator>>(MemoryHealthIndicator);
    diskHealthIndicator = testingModule.get<Mocked<DiskHealthIndicator>>(DiskHealthIndicator);
    httpHealthIndicator = testingModule.get<Mocked<HttpHealthIndicator>>(HttpHealthIndicator);
  });

  afterEach((): void => {
    vi.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(HealthController).toBeDefined();
  });

  describe("healthCheck", (): void => {
    it("should call health.check with all indicators and return result", async (): Promise<void> => {
      healthCheckService.check.mockImplementation(async (indicators: any) => {
        for (const indicator of indicators) {
          await indicator();
        }
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
      expect(memoryHealthIndicator.checkHeap).toHaveBeenCalledWith("memoryHeap", 1024 * 1024 * 1024);
      expect(diskHealthIndicator.checkStorage).toHaveBeenCalledWith("diskStorage", {
        path: "/",
        thresholdPercent: 0.95,
      });
      expect(httpHealthIndicator.pingCheck).toHaveBeenCalledWith("http", "https://google.com");
      expect(result).toEqual(mockHealthCheckResult);
    });
  });
});
