import { Injectable, Logger, LoggerService } from "@nestjs/common";
import UsersService from "#server/users/users.service";
import { Cron, CronExpression } from "@nestjs/schedule";
import { And, DataSource, EntityManager, IsNull, LessThan, Not } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";
import UserEntity from "#server/users/users.entity";
import { CRON_USER_ANONYMIZATION_BATCH } from "#server/configs/constants";

@Injectable()
export default class CronService {
  private readonly logger: LoggerService;
  private readonly usersService: UsersService;
  private readonly dataSource: DataSource;

  constructor(@InjectDataSource() dataSource: DataSource, usersService: UsersService) {
    this.dataSource = dataSource;
    this.usersService = usersService;
    this.logger = new Logger(CronService.name);
  }

  /**
   * Daily midnight cron job that anonymizes user profiles by criteria:
   * - `deletedAt` is non-null and older than 30 days
   * - `anonymizedAt` is null (not yet anonymized)
   *
   * Clears PII (username, firstName, lastName, avatarUrl, email), sets `anonymizedAt`,
   * and clears authentication data via {@link UsersService.anonymizeUserProfile}.
   *
   * Loops until all eligible users are processed
   * Batches users by {@link CRON_USER_ANONYMIZATION_BATCH} (default: 25)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyUsersAnonymization(): Promise<void> {
    try {
      this.logger.log("Starting users' anonymization job...");

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      let processed = 0;
      let hasMore = true;

      while (hasMore) {
        await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
          const usersToAnonymization: UserEntity[] = await this.usersService.findUsers(
            {
              where: {
                deletedAt: And(Not(IsNull()), LessThan(thirtyDaysAgo)),
                anonymizedAt: IsNull(),
              },
              withDeleted: true,
              take: CRON_USER_ANONYMIZATION_BATCH || 25,
              order: { id: "ASC" },
            },
            manager,
          );

          if (!usersToAnonymization.length) {
            hasMore = false;

            return;
          }

          for (let i = 0; i < usersToAnonymization.length; i++) {
            const user: UserEntity = usersToAnonymization[i];

            await this.usersService.anonymizeUserProfile(user, manager);

            processed++;
          }
        });
      }

      this.logger.log(`Users' anonymization job finished. Processed ${processed} users.`);
    } catch (error) {
      this.logger.error("Error during scheduled users' anonymization job", (error as Error).stack);
    }
  }
}
