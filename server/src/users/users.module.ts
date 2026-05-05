import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import UserEntity from "#server/users/users.entity";
import UsersController from "#server/users/users.controller";
import UsersService from "#server/users/users.service";
import EventsModule from "#server/events/events.module";
import TokensModule from "#server/tokens/tokens.module";

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), EventsModule, TokensModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export default class UsersModule {}
