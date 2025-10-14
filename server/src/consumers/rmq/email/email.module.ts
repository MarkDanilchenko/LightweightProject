import { Module } from "@nestjs/common";
import { RmqEmailService } from "@server/consumers/rmq/email/email.service";
import { RmqEmailController } from "@server/consumers/rmq/email/email.controller";

@Module({
  imports: [],
  controllers: [RmqEmailController],
  providers: [RmqEmailService],
  exports: [],
})
export class RmqEmailModule {}
