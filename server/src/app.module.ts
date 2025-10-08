import * as fs from "fs";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WinstonModule } from "nest-winston";
import { ConfigService } from "@nestjs/config";
import AppConfiguration from "./configs/interfaces/appConfiguration.interfaces";
import { TypeOrmModule } from "@nestjs/typeorm";
import AuthModule from "@server/auth/auth.module";
import UserModule from "@server/user/user.module";
import EventModule from "@server/event/event.module";
import appConfiguration from "@server/configs/app.configuration";

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
    EventModule,
    AuthModule,
    UserModule,
  ],
  exports: [],
  controllers: [],
  providers: [],
})
export default class AppModule {}
