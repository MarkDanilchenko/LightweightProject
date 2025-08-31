import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateUserEntity1756643187541 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "users",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            isNullable: false,
            default: "uuid_generate_v4()",
          },
          {
            name: "username",
            type: "varchar",
            isUnique: true,
            isNullable: true,
          },
          {
            name: "firstName",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "lastName",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "email",
            type: "varchar",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "avatarUrl",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "createdAt",
            type: "timestamptz",
            isNullable: false,
            default: "now()",
          },
          {
            name: "updatedAt",
            type: "timestamptz",
            isNullable: false,
            default: "now()",
          },
          {
            name: "deletedAt",
            type: "timestamptz",
            isNullable: true,
          },
        ],
      }),
      true, // if true, the table will be created if it does not exist;
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(
      new Table({
        name: "users",
      }),
      true, // if true, the table will be dropped if it exists;
    );
  }
}
