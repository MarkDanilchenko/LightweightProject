import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import AuthenticationEntity from "@server/auth/auth.entity";
import EventModule from "@server/event/event.module";
import UserModule from "@server/user/user.module";
import AuthController from "@server/auth/auth.controller";
import AuthService from "@server/auth/auth.service";
import AuthLocalStrategy from "@server/auth/strategies/local.strategy";
import TokenService from "@server/common/token.service";

@Module({
  imports: [TypeOrmModule.forFeature([AuthenticationEntity]), PassportModule, EventModule, UserModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    AuthLocalStrategy,
    // GoogleOAuth2Strategy,
    // JwtStrategy,
    // KeycloakOAuth2OIDCStrategy,
    // KeycloakSAMLStrategy,
  ],
  exports: [AuthService],
})
export default class AuthModule {}
