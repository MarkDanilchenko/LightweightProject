import { Inject, Injectable } from "@nestjs/common";
import { HealthIndicatorResult, HealthIndicatorService } from "@nestjs/terminus";
import { REDIS_CLIENT } from "#server/configs/constants";
import Redis from "ioredis";

@Injectable()
export default class RedisHealthIndicator {
  private readonly healthIndicatorService: HealthIndicatorService;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    healthIndicatorService: HealthIndicatorService,
  ) {
    this.healthIndicatorService = healthIndicatorService;
  }

  async isHealthy(indicatorKey: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(indicatorKey);

    try {
      const redisPingStatus = await this.redisClient.ping();
      const isRedisHealthy = redisPingStatus === "PONG";

      if (!isRedisHealthy) {
        return indicator.down({ message: "Redis is not healthy" });
      }

      return indicator.up();
    } catch (error) {
      return indicator.down({ message: (error as Error).message });
    }
  }
}
