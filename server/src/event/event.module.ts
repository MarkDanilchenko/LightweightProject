import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import EventService from "@server/event/event.service";

@Module({
  imports: [
    EventEmitterModule.forRoot({
      verboseMemoryLeak: true,
    }),
  ],
  controllers: [],
  providers: [EventService],
  exports: [],
})
export default class EventModule {}
