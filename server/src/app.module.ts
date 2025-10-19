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
import { RmqEmailModule } from "@server/consumers/rmq/email/email.module";
import { JwtModule } from "@nestjs/jwt";

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
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get<AppConfiguration["jwtConfiguration"]["secret"]>("jwtConfiguration.secret")!,
        };
      },
    }),
    RmqEmailModule,
    EventModule,
    AuthModule,
    UserModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export default class AppModule {}
