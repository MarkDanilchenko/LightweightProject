import { Inject, Injectable } from "@nestjs/common";
import { REDIS_CLIENT } from "@server/services/redis/redis.module";
import { Redis } from "ioredis";

@Injectable()
export class RedisService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
  ) {}
}
