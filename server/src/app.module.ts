import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import appConfiguration from "./configs/app.configuration.js";
import { WinstonModule } from "nest-winston";
import { ConfigService } from "@nestjs/config";
import { AppConfiguration } from "./configs/interfaces/appConfiguration.interface.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: "../.env.development",
      isGlobal: true,
      load: [appConfiguration],
    }),
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return configService.get<AppConfiguration["loggerConfiguration"]>("loggerConfiguration");
      },
    }),
  ],
  exports: [],
  controllers: [],
  providers: [],
})
export default class AppModule {}
