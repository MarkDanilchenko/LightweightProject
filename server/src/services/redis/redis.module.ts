import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";

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
  ],
  exports: [REDIS_CLIENT], // Export the Redis client for use in other modules by inject REDIS_CLIENT;
})
export class RedisModule {}
