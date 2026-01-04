import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import EventsService from "@server/events/events.service";
import EventsConsumer from "@server/events/events.consumer";
import { TypeOrmModule } from "@nestjs/typeorm";
import EventEntity from "@server/events/events.entity";
import { ClientsModule } from "@nestjs/microservices";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";
import { RMQ_MICROSERVICE } from "@server/configs/constants";

@Module({
  imports: [
    TypeOrmModule.forFeature([EventEntity]),
    EventEmitterModule.forRoot({
      verboseMemoryLeak: true,
    }),
  ],
  controllers: [],
  providers: [EventsService, EventsConsumer],
  exports: [EventsService],
})
export default class EventsModule {}
