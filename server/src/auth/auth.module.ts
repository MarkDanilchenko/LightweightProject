import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AppConfiguration } from "../configs/interfaces/appConfiguration.interface.js";
import AuthController from "./auth.controller.js";
import AuthService from "./auth.service.js";
import GoogleStrategy from "./strategies/google.strategy.js";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get<AppConfiguration["jwtConfiguration"]["secret"]>("jwtConfiguration")!,
          signOptions: {
            expiresIn: "24h",
          },
        };
      },
    }),
  ],
  exports: [],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy],
})
export class AuthModule {}
