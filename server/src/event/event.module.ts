import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import EventService from "@server/event/event.service";
import EventListener from "@server/event/event.listener";

@Module({
  imports: [
    EventEmitterModule.forRoot({
      verboseMemoryLeak: true,
    }),
  ],
  controllers: [],
  providers: [EventService, EventListener],
  exports: [],
})
export default class EventModule {}
