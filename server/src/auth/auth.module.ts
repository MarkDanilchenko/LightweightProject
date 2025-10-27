import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
// import GoogleOAuth2Strategy from "./strategies/googleOAuth2.strategy.js";
// import JwtStrategy from "./strategies/jwt.strategy.js";
import { TypeOrmModule } from "@nestjs/typeorm";
import AuthenticationEntity from "@server/auth/auth.entity";
import EventModule from "@server/event/event.module";
import UserModule from "@server/user/user.module";
import AuthController from "@server/auth/auth.controller";
import AuthService from "@server/auth/auth.service";
import TokenService from "@server/common/token.service";
// import LocalAuthStrategy from "./strategies/local.strategy.js";
// import KeycloakOAuth2OIDCStrategy from "./strategies/keycloakOIDC.strategy.js";
// import KeycloakSAMLStrategy from "./strategies/keycloakSAML.strategy.js";

@Module({
  imports: [TypeOrmModule.forFeature([AuthenticationEntity]), PassportModule, EventModule, UserModule],
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
  exports: [AuthService],
})
export default class AuthModule {}
