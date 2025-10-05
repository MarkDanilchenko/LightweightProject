import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import EventService from "@server/event/event.service";
import EventConsumer from "@server/event/event.consumer";
import { TypeOrmModule } from "@nestjs/typeorm";
import EventEntity from "@server/event/event.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([EventEntity]),
    EventEmitterModule.forRoot({
      verboseMemoryLeak: true,
    }),
  ],
  controllers: [],
  providers: [EventService, EventConsumer],
  exports: [EventService],
})
export default class EventModule {}
