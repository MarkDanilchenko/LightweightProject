import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateAuthenticationEntity1750368815311 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();

    try {
      await queryRunner.createTable(
        new Table({
          name: "authentications",
          columns: [
            {
              name: "id",
              type: "uuid",
              isPrimary: true,
              isNullable: false,
              default: "uuid_generate_v4()",
            },
            {
              name: "userId",
              type: "uuid",
            },
            {
              name: "provider",
              type: "varchar",
            },
            {
              name: "refreshToken",
              type: "varchar",
              isNullable: true,
            },
            {
              name: "password",
              type: "varchar",
              isNullable: true,
            },
            {
              name: "createdAt",
              type: "timestamptz",
              default: "now()",
            },
            {
              name: "updatedAt",
              type: "timestamptz",
              default: "now()",
            },
            {
              name: "deletedAt",
              type: "timestamptz",
              isNullable: true,
            },
          ],
        }),
        // "true" - create table, if not exists;
        true,
      );

      await queryRunner.createForeignKey(
        "authentications",
        new TableForeignKey({
          columnNames: ["userId"],
          referencedColumnNames: ["id"],
          referencedTableName: "users",
          onDelete: "CASCADE",
        }),
      );

      await queryRunner.createIndex(
        "authentications",
        new TableIndex({
          name: "IDX_AUTHENTICATIONS_USER_ID_PROVIDER",
          columnNames: ["userId", "provider"],
          isUnique: true,
        }),
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();

      throw error;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("authentications");
  }
}
