import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class CreateIndexesOnUserIdAndNameUserIdInEventEntity1757335491839 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      "events",
      new TableIndex({
        name: "IDX_EVENTS_USER_ID",
        columnNames: ["userId"],
      }),
    );

    await queryRunner.createIndex(
      "events",
      new TableIndex({
        name: "IDX_EVENTS_NAME_USER_ID",
        columnNames: ["name", "userId"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("events", "IDX_EVENTS_USER_ID");
    await queryRunner.dropIndex("events", "IDX_EVENTS_NAME_USER_ID");
  }
}
