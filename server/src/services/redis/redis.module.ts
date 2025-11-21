import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";
import { RedisService } from "@server/services/redis/redis.service";

export const REDIS_CLIENT = "REDIS_CLIENT";

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return configService.get<AppConfiguration["redisConfiguration"]>("redisConfiguration")!;
      },
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
