import { Module } from "@nestjs/common";
import { RmqEmailService } from "@server/services/rmq/rmq.email.service";
import { RmqEmailConsumer } from "@server/services/rmq/rmq.email.consumer";
import AuthModule from "@server/auth/auth.module";
import EventsModule from "@server/events/events.module";

@Module({
  imports: [AuthModule, EventsModule],
  controllers: [RmqEmailConsumer],
  providers: [RmqEmailService],
  exports: [],
})
export class RmqModule {}
