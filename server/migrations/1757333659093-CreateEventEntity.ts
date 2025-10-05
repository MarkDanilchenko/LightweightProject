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
            isNullable: false,
            comment: "actor who performed the event",
          },
          {
            name: "modelId",
            type: "uuid",
            isNullable: false,
            comment: "event related model, e.g. user, organization, etc., so FK is not set",
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
        onDelete: "CASCADE",
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
