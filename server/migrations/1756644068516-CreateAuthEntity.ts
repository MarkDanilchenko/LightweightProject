import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuthEntity1756644068516 implements MigrationInterface {
  name: string = "CreateAuthEntity1756644068516";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."authentications_provider_enum" AS ENUM('local', 'google', 'keycloak', 'github')`,
    );
    await queryRunner.query(
      `CREATE TABLE "authentications"
       (
         "id"             uuid                                     NOT NULL DEFAULT uuid_generate_v4(),
         "userId"         uuid                                     NOT NULL,
         "provider"       "public"."authentications_provider_enum" NOT NULL,
         "refreshToken"   character varying,
         "metadata"       jsonb                                    NOT NULL DEFAULT '{}',
         "createdAt"      TIMESTAMP WITH TIME ZONE                 NOT NULL DEFAULT now(),
         "lastAccessedAt" TIMESTAMP WITH TIME ZONE                 NOT NULL DEFAULT now(),
         CONSTRAINT "PK_2505c0cb39a2248520f306c1447" PRIMARY KEY ("id")
       );
      COMMENT ON COLUMN "authentications"."refreshToken" IS 'app generated refresh token';
      COMMENT ON COLUMN "authentications"."metadata" IS 'additional authentication metadata';
      COMMENT ON COLUMN "authentications"."lastAccessedAt" IS 'the last time the authentication was accessed, similar to "updatedAt"'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_76f321fd7c6940ab57c5fed9cb" ON "authentications" ("userId", "provider")`,
    );
    await queryRunner.query(
      `ALTER TABLE "authentications"
        ADD CONSTRAINT "FK_ad80faa4bc5330cf388bce4cee6" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "authentications" DROP CONSTRAINT "FK_ad80faa4bc5330cf388bce4cee6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_76f321fd7c6940ab57c5fed9cb"`);
    await queryRunner.query(`DROP TABLE "authentications"`);
    await queryRunner.query(`DROP TYPE "public"."authentications_provider_enum"`);
  }
}
