import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateEventEntity1757333659093 implements MigrationInterface {
  name: string = "CreateEventEntity1757333659093";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."events_name_enum" AS ENUM('auth.local.email-verification.sent', 'auth.local.email-verification.verified', 'auth.local.created')`,
    );
    await queryRunner.query(
      `CREATE TABLE "events"
       (
         "id"        uuid                        NOT NULL DEFAULT uuid_generate_v4(),
         "name"      "public"."events_name_enum" NOT NULL,
         "userId"    uuid                        NOT NULL,
         "modelId"   uuid                        NOT NULL,
         "metadata"  jsonb                       NOT NULL DEFAULT '{}',
         "createdAt" TIMESTAMP WITH TIME ZONE    NOT NULL DEFAULT NOW(),
         CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id")
       );
      COMMENT ON COLUMN "events"."userId" IS 'actor who performed the events';
      COMMENT ON COLUMN "events"."modelId" IS 'events related model, e.g. users, organization, etc., so FK is not set';
      COMMENT ON COLUMN "events"."metadata" IS 'additional events metadata'`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_754c0f87d2975391384167a7c9" ON "events" ("name", "userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_9929fa8516afa13f87b41abb26" ON "events" ("userId")`);
    await queryRunner.query(
      `ALTER TABLE "events"
        ADD CONSTRAINT "FK_9929fa8516afa13f87b41abb263" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_9929fa8516afa13f87b41abb263"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9929fa8516afa13f87b41abb26"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_754c0f87d2975391384167a7c9"`);
    await queryRunner.query(`DROP TABLE "events"`);
    await queryRunner.query(`DROP TYPE "public"."events_name_enum"`);
  }
}
