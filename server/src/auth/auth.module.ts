import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import AuthenticationEntity from "@server/auth/auth.entity";
import EventModule from "@server/event/event.module";
import UserModule from "@server/user/user.module";
import AuthController from "@server/auth/auth.controller";
import AuthService from "@server/auth/auth.service";
import TokenService from "@server/common/token.service";

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
