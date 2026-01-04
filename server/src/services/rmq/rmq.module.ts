import { Global, Module } from "@nestjs/common";
import RmqEmailService from "@server/services/rmq/rmq.email.service";
import RmqEmailConsumer from "@server/services/rmq/rmq.email.consumer";
import AuthModule from "@server/auth/auth.module";
import EventsModule from "@server/events/events.module";
import { ClientsModule } from "@nestjs/microservices";
import { RMQ_MICROSERVICE } from "@server/constants";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: RMQ_MICROSERVICE,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          return configService.get<AppConfiguration["rabbitmqConfiguration"]>("rabbitmqConfiguration")!;
        },
      },
    ]),
    AuthModule,
    EventsModule,
  ],
  controllers: [RmqEmailConsumer],
  providers: [RmqEmailService],
  exports: [ClientsModule],
})
export class RmqModule {}
