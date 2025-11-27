import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateEventEntityName1764257181536 implements MigrationInterface {
  name = "UpdateEventEntityName1764257181536";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_754c0f87d2975391384167a7c9"`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "name"`);
    await queryRunner.query(`DROP TYPE "public"."events_name_enum"`);
    await queryRunner.query(`ALTER TABLE "events" ADD "name" character varying NOT NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_754c0f87d2975391384167a7c9" ON "events" ("name", "userId") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_754c0f87d2975391384167a7c9"`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN "name"`);
    await queryRunner.query(
      `CREATE TYPE "public"."events_name_enum" AS ENUM('auth.local.email-verification.sent', 'auth.local.email-verification.verified', 'auth.local.created')`,
    );
    await queryRunner.query(`ALTER TABLE "events" ADD "name" "public"."events_name_enum" NOT NULL`);
    await queryRunner.query(`CREATE INDEX "IDX_754c0f87d2975391384167a7c9" ON "events" ("name", "userId") `);
  }
}
