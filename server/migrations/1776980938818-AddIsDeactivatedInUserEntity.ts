import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsDeactivatedInUserEntity1776980938818 implements MigrationInterface {
  name = "AddIsDeactivatedInUserEntity1776980938818";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "isDeactivated" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isDeactivated"`);
  }
}
