import { Module } from "@nestjs/common";
import EventsService from "@server/events/events.service";
import EventsConsumer from "@server/events/events.consumer";
import { TypeOrmModule } from "@nestjs/typeorm";
import EventEntity from "@server/events/events.entity";

@Module({
  imports: [TypeOrmModule.forFeature([EventEntity])],
  controllers: [],
  providers: [EventsService, EventsConsumer],
  exports: [EventsService],
})
export default class EventsModule {}
