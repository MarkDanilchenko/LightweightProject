import { Controller, Get } from "@nestjs/common";
import RedisHealthIndicator from "#server/health/redis.health";
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  MicroserviceHealthIndicator,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { RmqOptions, Transport } from "@nestjs/microservices";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "#server/configs/interfaces/appConfiguration.interfaces";
import { Throttle } from "@nestjs/throttler";

@ApiTags("health")
@Controller("health")
export default class HealthController {
  private readonly configService: ConfigService;
  private readonly health: HealthCheckService;
  private readonly db: TypeOrmHealthIndicator;
  private readonly microservice: MicroserviceHealthIndicator;
  private readonly redisHealthIndicator: RedisHealthIndicator;
  private readonly memory: MemoryHealthIndicator;
  private readonly disk: DiskHealthIndicator;
  private readonly http: HttpHealthIndicator;

  private readonly rabbitmqUrls: NonNullable<RmqOptions["options"]>["urls"];

  constructor(
    configService: ConfigService,
    health: HealthCheckService,
    db: TypeOrmHealthIndicator,
    microservice: MicroserviceHealthIndicator,
    redisHealthIndicator: RedisHealthIndicator,
    memory: MemoryHealthIndicator,
    disk: DiskHealthIndicator,
    http: HttpHealthIndicator,
  ) {
    this.configService = configService;
    this.health = health;
    this.db = db;
    this.microservice = microservice;
    this.redisHealthIndicator = redisHealthIndicator;
    this.memory = memory;
    this.disk = disk;
    this.http = http;

    this.rabbitmqUrls = this.configService.get<
      NonNullable<AppConfiguration["rabbitmqConfiguration"]["options"]>["urls"]
    >("rabbitmqConfiguration.options.urls")!;
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: "Health check",
    description: "Check the application component's health.",
  })
  @ApiResponse({
    status: 200,
    description: "Health check successful. All system components and services are ok.",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "ok" },
        info: {
          type: "object",
          example: {
            database: { status: "up" },
            redis: { status: "up", message: "Redis is ok" },
            rabbitmq: { status: "up" },
            memory_heap: { status: "up" },
            disk_space: { status: "up" },
            google_oauth_api: { status: "up" },
          },
        },
        error: { type: "object", example: {} },
        details: {
          type: "object",
          example: {
            database: { status: "up" },
            redis: { status: "up", message: "Redis is ok" },
            rabbitmq: { status: "up" },
            memory_heap: { status: "up" },
            disk_space: { status: "up" },
            google_oauth_api: { status: "up" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: "Health check failed. One or more dependent services are down.",
    schema: {
      type: "object",
      properties: {
        status: { type: "string", example: "error" },
        info: {
          type: "object",
          example: {
            redis: { status: "up" },
          },
        },
        error: {
          type: "object",
          example: {
            database: {
              status: "down",
              message: "Connection refused",
            },
          },
        },
        details: {
          type: "object",
          example: {
            redis: { status: "up" },
            database: {
              status: "down",
              message: "Connection refused",
            },
          },
        },
      },
    },
  })
  healthCheck() {
    return this.health.check([
      () => this.db.pingCheck("database"), // SELECT 1
      () =>
        this.microservice.pingCheck<RmqOptions>("rabbitmq", {
          transport: Transport.RMQ,
          options: { urls: this.rabbitmqUrls },
        }),
      () => this.redisHealthIndicator.isHealthy("redis"),
      () => this.memory.checkHeap("memoryHeap", 1024 * 1024 * 1024), // < 1024MB
      () =>
        this.disk.checkStorage("diskStorage", {
          path: "/",
          thresholdPercent: 0.95,
        }),
      () => this.http.pingCheck("http", "https://google.com"),
    ]);
  }
}
