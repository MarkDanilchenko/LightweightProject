import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";
import RedisService from "@server/services/redis/redis.service";
import Redis from "ioredis";
import { REDIS_CLIENT } from "@server/constants";

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfiguration = configService.get<AppConfiguration["redisConfiguration"]>("redisConfiguration")!;

        return new Redis({
          host: redisConfiguration.options?.host,
          port: redisConfiguration.options?.port,
          password: redisConfiguration.options?.password,
          db: redisConfiguration.options?.db,
          keyPrefix: redisConfiguration.options?.keyPrefix,
        });
      },
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
