import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import UserEntity from "@server/user/user.entity";
import UserController from "@server/user/user.controller";
import UserService from "@server/user/user.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export default class UserModule {}
