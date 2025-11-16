import { Module } from "@nestjs/common";
import { RmqEmailService } from "@server/services/rmq/rmq.email.service";
import { RmqEmailConsumer } from "@server/services/rmq/rmq.email.consumer";
import TokensService from "@server/tokens/tokens.service";
import AuthModule from "@server/auth/auth.module";
import TokensModule from "@server/tokens/tokens.module";
import AuthService from "@server/auth/auth.service";
import EventsModule from "@server/events/events.module";
import EventsService from "@server/events/events.service";

@Module({
  imports: [AuthModule, TokensModule, EventsModule],
  controllers: [RmqEmailConsumer],
  providers: [RmqEmailService, TokensService, AuthService, EventsService],
  exports: [],
})
export class RmqModule {}
