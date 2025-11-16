import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import AuthenticationEntity from "@server/auth/auth.entity";
import EventsModule from "@server/events/events.module";
import UsersModule from "@server/users/users.module";
import AuthController from "@server/auth/auth.controller";
import AuthService from "@server/auth/auth.service";
import LocalAuthStrategy from "@server/auth/strategies/local.strategy";
import TokensService from "@server/tokens/tokens.service";
import JwtStrategy from "@server/auth/strategies/jwt.strategy";

@Module({
  imports: [TypeOrmModule.forFeature([AuthenticationEntity]), PassportModule, EventsModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService, TokensService, LocalAuthStrategy, JwtStrategy],
  exports: [AuthService],
})
export default class AuthModule {}
