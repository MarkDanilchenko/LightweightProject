import { Global, Module } from "@nestjs/common";
import TokensService from "@server/tokens/tokens.service";
import { RedisService } from "@server/services/redis/redis.service";

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [TokensService],
  exports: [TokensService],
})
export default class TokensModule {}
