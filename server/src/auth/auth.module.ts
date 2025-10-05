import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import AppConfiguration from "../configs/interfaces/appConfiguration.interfaces";
import AuthController from "./auth.controller.js";
import TokenService from "./token.service.js";
import AuthService from "./auth.service.js";
// import GoogleOAuth2Strategy from "./strategies/googleOAuth2.strategy.js";
// import JwtStrategy from "./strategies/jwt.strategy.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import AuthenticationEntity from "@server/auth/auth.entity";
import EventModule from "@server/event/event.module";
import UserModule from "@server/user/user.module";
// import LocalAuthStrategy from "./strategies/local.strategy.js";
// import KeycloakOAuth2OIDCStrategy from "./strategies/keycloakOIDC.strategy.js";
// import KeycloakSAMLStrategy from "./strategies/keycloakSAML.strategy.js";

@Module({
  imports: [
    UserModule,
    EventModule,
    PassportModule,
    TypeOrmModule.forFeature([AuthenticationEntity]),
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
  providers: [
    AuthService,
    TokenService,
    // GoogleOAuth2Strategy,
    // JwtStrategy,
    // LocalAuthStrategy,
    // KeycloakOAuth2OIDCStrategy,
    // KeycloakSAMLStrategy,
  ],
  exports: [],
})
export default class AuthModule {}
