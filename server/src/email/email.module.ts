import { Module } from "@nestjs/common";
import { RmqEmailService } from "@server/email/email.service";
import { RmqEmailController } from "@server/email/email.controller";

@Module({
  imports: [],
  controllers: [RmqEmailController],
  providers: [RmqEmailService],
  exports: [],
})
export class RmqEmailModule {}
