import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AppConfiguration } from "../configs/interfaces/appConfiguration.interface.js";
import AuthController from "./auth.controller.js";
import AuthService from "./auth.service.js";
import GoogleOAuth2Strategy from "./strategies/googleOAuth2.strategy.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import AuthenticationEntity from "./auth.entity.js";
import UserEntity from "../user/user.entity.js";
import TokenService from "./token.service.js";

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([AuthenticationEntity, UserEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get<AppConfiguration["jwtConfiguration"]["secret"]>("jwtConfiguration.secret")!,
          // signOptions: {
          //   expiresIn: configService.get<AppConfiguration["jwtConfiguration"]["accessTokenExpiresIn"]>(
          //     "jwtConfiguration.accessTokenExpiresIn",
          //   ),
          // },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleOAuth2Strategy, TokenService],
  exports: [],
})
export class AuthModule {}
