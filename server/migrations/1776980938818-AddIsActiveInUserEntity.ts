import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsActiveInUserEntity1776980938818 implements MigrationInterface {
  name = "AddIsActiveInUserEntity1776980938818";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "isActive" boolean NOT NULL DEFAULT true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isActive"`);
  }
}
