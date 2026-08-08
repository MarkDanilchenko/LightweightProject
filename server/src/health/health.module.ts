import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import HealthController from "#server/health/health.controller";
import RedisHealthIndicator from "#server/health/redis.health";
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
  exports: [],
})
export default class HealthModule {}
