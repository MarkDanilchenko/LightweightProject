import { Module } from "@nestjs/common";
import { RmqEmailService } from "@server/consumers/rmq/email/email.service";
import { RmqEmailConsumer } from "@server/consumers/rmq/email/email.consumer";
import TokenService from "@server/common/token.service";
import AuthModule from "@server/auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [RmqEmailConsumer],
  providers: [RmqEmailService, TokenService],
  exports: [],
})
export class RmqEmailModule {}
