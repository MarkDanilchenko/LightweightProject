import * as fs from "fs";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WinstonModule } from "nest-winston";
import AppConfiguration from "./configs/interfaces/appConfiguration.interfaces";
import { TypeOrmModule } from "@nestjs/typeorm";
import AuthModule from "@server/auth/auth.module";
import UserModule from "@server/user/user.module";
import EventModule from "@server/event/event.module";
import appConfiguration from "@server/configs/app.configuration";
import { ClientsModule, Transport } from "@nestjs/microservices";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: fs.existsSync("../.env.development") ? ["../.env.development"] : ["../.env.public"],
      isGlobal: true,
      load: [appConfiguration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return configService.get<AppConfiguration["dbConfiguration"]>("dbConfiguration")!;
      },
    }),
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return configService.get<AppConfiguration["loggerConfiguration"]>("loggerConfiguration")!;
      },
    }),
    ClientsModule.registerAsync([
      {
        name: "RMQ_EMAIL_MICROSERVICE",
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const {
            host,
            port,
            emailQueue,
            username,
            password,
            prefetchCount,
            heartbeatIntervalInSeconds,
            reconnectTimeInSeconds,
            noAck,
            persistent,
          } = configService.get<AppConfiguration["rabbitmqConfiguration"]>("rabbitmqConfiguration")!;

          return {
            transport: Transport.RMQ,
            options: {
              urls: [`amqp://${username}:${password}@${host}:${port}`],
              queue: emailQueue,
              prefetchCount,
              socketOptions: {
                heartbeatIntervalInSeconds,
                reconnectTimeInSeconds,
              },
              noAck,
              persistent,
            },
          };
        },
      },
    ]),
    EventModule,
    AuthModule,
    UserModule,
  ],
  exports: [],
  controllers: [],
  providers: [],
})
export default class AppModule {}
