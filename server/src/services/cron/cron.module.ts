import { Module } from "@nestjs/common";
import CronService from "#server/services/cron/cron.service";
import UsersModule from "#server/users/users.module";

@Module({
  imports: [UsersModule],
  controllers: [],
  providers: [CronService],
  exports: [],
})
export class CronModule {}
