import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import AuthenticationEntity from "#server/auth/auth.entity";
import EventsModule from "#server/events/events.module";
import UsersModule from "#server/users/users.module";
import AuthController from "#server/auth/auth.controller";
import AuthService from "#server/auth/auth.service";
import LocalAuthStrategy from "#server/auth/strategies/local.strategy";
import JwtStrategy from "#server/auth/strategies/jwt.strategy";
import GoogleOAuth2Strategy from "#server/auth/strategies/google.strategy";

@Module({
  imports: [TypeOrmModule.forFeature([AuthenticationEntity]), PassportModule, UsersModule, EventsModule],
  controllers: [AuthController],
  providers: [AuthService, LocalAuthStrategy, JwtStrategy, GoogleOAuth2Strategy],
  exports: [AuthService],
})
export default class AuthModule {}
