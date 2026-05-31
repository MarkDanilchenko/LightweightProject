import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAnonymizedAtInUserEntity1779909628232 implements MigrationInterface {
  name = "AddAnonymizedAtInUserEntity1779909628232";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "anonymizedAt" TIMESTAMP WITH TIME ZONE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "anonymizedAt"`);
  }
}
