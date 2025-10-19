import { Module } from "@nestjs/common";
import { RmqEmailService } from "@server/consumers/rmq/email/email.service";
import { RmqEmailConsumer } from "@server/consumers/rmq/email/email.consumer";
import TokenService from "@server/common/token.service";

@Module({
  imports: [],
  controllers: [RmqEmailConsumer],
  providers: [RmqEmailService, TokenService],
  exports: [],
})
export class RmqEmailModule {}
