import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class CreateIndexOnAuthentications1756068948742 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      "authentications",
      new TableIndex({
        name: "IDX_AUTHENTICATIONS_USER_ID_PROVIDER",
        columnNames: ["userId", "provider"],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("authentications", "IDX_AUTHENTICATIONS_USER_ID_PROVIDER");
  }
}
