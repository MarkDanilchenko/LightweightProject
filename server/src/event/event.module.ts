import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import EventService from "@server/event/event.service";
import EventConsumer from "@server/event/event.consumer";
import { TypeOrmModule } from "@nestjs/typeorm";
import EventEntity from "@server/event/event.entity";
import { ClientsModule } from "@nestjs/microservices";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";

@Module({
  imports: [
    TypeOrmModule.forFeature([EventEntity]),
    EventEmitterModule.forRoot({
      verboseMemoryLeak: true,
    }),
    ClientsModule.registerAsync([
      {
        name: "MICROSERVICE_RMQ",
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          return configService.get<AppConfiguration["rabbitmqConfiguration"]>("rabbitmqConfiguration")!;
        },
      },
    ]),
  ],
  controllers: [],
  providers: [EventService, EventConsumer],
  exports: [EventService],
})
export default class EventModule {}
