import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WinstonModule } from "nest-winston";
import AppConfiguration from "./configs/interfaces/appConfiguration.interfaces";
import { TypeOrmModule } from "@nestjs/typeorm";
import AuthModule from "@server/auth/auth.module";
import UsersModule from "@server/users/users.module";
import EventModule from "@server/event/event.module";
import TokensModule from "@server/tokens/tokens.module";
import appConfiguration from "@server/configs/app.configuration";
import { RmqEmailModule } from "@server/consumers/rmq/email/email.module";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    ConfigModule.forRoot({
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
    TokensModule,
    EventModule,
    AuthModule,
    UsersModule,
    RmqEmailModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export default class AppModule {}
