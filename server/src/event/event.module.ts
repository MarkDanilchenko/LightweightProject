import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import EventService from "@server/event/event.service";
import EventConsumer from "@server/event/event.consumer";
import { TypeOrmModule } from "@nestjs/typeorm";
import EventEntity from "@server/event/event.entity";
import { ClientsModule, Transport } from "@nestjs/microservices";
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
        name: "RMQ_EMAIL_MICROSERVICE",
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const {
            host,
            port,
            username,
            password,
            emailQueue,
            prefetchCount,
            noAck,
            persistent,
            heartbeatIntervalInSeconds,
            reconnectTimeInSeconds,
          } = configService.get<AppConfiguration["rabbitmqConfiguration"]>("rabbitmqConfiguration")!;

          return {
            transport: Transport.RMQ,
            options: {
              urls: [`amqp://${username}:${password}@${host}:${port}`],
              queue: emailQueue,
              prefetchCount,
              noAck,
              persistent,
              socketOptions: {
                heartbeatIntervalInSeconds,
                reconnectTimeInSeconds,
              },
            },
          };
        },
      },
    ]),
  ],
  controllers: [],
  providers: [EventService, EventConsumer],
  exports: [EventService],
})
export default class EventModule {}
