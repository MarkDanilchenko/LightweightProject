import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAuthEntityProviderEnum1782334634301 implements MigrationInterface {
  name = "UpdateAuthEntityProviderEnum1782334634301";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_76f321fd7c6940ab57c5fed9cb"`);
    await queryRunner.query(`ALTER TYPE "public"."authentications_provider_enum" ADD VALUE 'yandex'`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_76f321fd7c6940ab57c5fed9cb" ON "authentications" ("userId", "provider")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_76f321fd7c6940ab57c5fed9cb"`);
    await queryRunner.query(
      `CREATE TYPE "public"."authentications_provider_enum_old" AS ENUM('local', 'google', 'keycloak', 'github')`,
    );
    await queryRunner.query(
      `ALTER TABLE "authentications" ALTER COLUMN "provider" TYPE "public"."authentications_provider_enum_old" USING "provider"::"text"::"public"."authentications_provider_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."authentications_provider_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."authentications_provider_enum_old" RENAME TO "authentications_provider_enum"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_76f321fd7c6940ab57c5fed9cb" ON "authentications" ("userId", "provider")`,
    );
  }
}
