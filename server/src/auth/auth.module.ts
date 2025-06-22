import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import AppConfiguration from "../configs/interfaces/appConfiguration.interface.js";
import AuthController from "./auth.controller.js";
import TokenService from "./token.service.js";
import AuthService from "./auth.service.js";
import GoogleOAuth2Strategy from "./strategies/googleOAuth2.strategy.js";
import JwtStrategy from "./strategies/jwt.strategy.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import AuthenticationEntity from "@server/auth/auth.entity";
import UserEntity from "@server/user/user.entity";

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([AuthenticationEntity, UserEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get<AppConfiguration["jwtConfiguration"]["secret"]>("jwtConfiguration.secret")!,
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, GoogleOAuth2Strategy, JwtStrategy],
  exports: [],
})
export class AuthModule {}
