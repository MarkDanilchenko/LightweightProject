import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserEntity1756643187541 implements MigrationInterface {
  name: string = "CreateUserEntity1756643187541";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users"
       (
         "id"        uuid                     NOT NULL DEFAULT uuid_generate_v4(),
         "username"  character varying,
         "firstName" character varying,
         "lastName"  character varying,
         "email"     character varying        NOT NULL,
         "avatarUrl" character varying,
         "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
         "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
         "deletedAt" TIMESTAMP WITH TIME ZONE,
         CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"),
         CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
         CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
       )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
