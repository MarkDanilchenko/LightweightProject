import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WinstonModule } from "nest-winston";
import AppConfiguration from "./configs/interfaces/appConfiguration.interfaces";
import { TypeOrmModule } from "@nestjs/typeorm";
import AuthModule from "@server/auth/auth.module";
import UsersModule from "@server/users/users.module";
import EventsModule from "@server/events/events.module";
import TokensModule from "@server/tokens/tokens.module";
import appConfiguration from "@server/configs/app.configuration";
import { RmqModule } from "@server/services/rmq/rmq.module";
import { JwtModule } from "@nestjs/jwt";
import { RedisModule } from "@server/services/redis/redis.module";

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
    RedisModule,
    EventsModule,
    AuthModule,
    UsersModule,
    RmqModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export default class AppModule {}
