import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateEventEntity1757333659093 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "events",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            isNullable: false,
            default: "uuid_generate_v4()",
          },
          {
            name: "name",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "userId",
            type: "uuid",
            isNullable: true,
            comment: "set to null if related user is deleted",
          },
          {
            name: "modelId",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "metadata",
            type: "jsonb",
            isNullable: false,
            default: "'{}'::jsonb",
            comment: "additional event metadata",
          },
          {
            name: "createdAt",
            type: "timestamptz",
            isNullable: false,
            default: "now()",
          },
        ],
      }),
      true, // if true, the table will be created if it does not exist;
    );

    await queryRunner.createForeignKey(
      "events",
      new TableForeignKey({
        columnNames: ["userId"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "SET NULL",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(
      new Table({
        name: "events",
      }),
      true, // if true, the table will be dropped if it exists;
    );
  }
}
