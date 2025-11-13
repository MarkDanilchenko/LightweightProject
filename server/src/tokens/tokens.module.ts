import { Global, Module } from "@nestjs/common";
import TokensService from "@server/tokens/tokens.service";

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [TokensService],
  exports: [TokensService],
})
export default class TokensModule {}
