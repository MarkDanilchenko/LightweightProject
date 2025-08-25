import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateAuthenticationEntity1750368815311 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.connection.transaction(async (transactionEntityManager): Promise<void> => {
      await transactionEntityManager.queryRunner?.createTable(
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
              isNullable: false,
            },
            {
              name: "provider",
              type: "varchar",
              isNullable: false,
              default: "local",
              comment: `the provider of the authentication (e.g.:
              "local" for local user/password authentication,
              "google" for Google OAuth2,
              "keycloak" for Keycloak authentication flows
            )`,
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
              comment: `the password of the authentication (only for local flow of authentication)`,
            },
            {
              name: "createdAt",
              type: "timestamptz",
              isNullable: false,
              default: "now()",
            },
            {
              name: "lastAccessedAt",
              type: "timestamptz",
              isNullable: false,
              default: "now()",
              comment: `the last time the authentication was accessed, similar to "updatedAt"`,
            },
          ],
        }),
        true, // "true" - create table, if not exists;
      );

      await queryRunner.createForeignKey(
        "authentications",
        new TableForeignKey({
          columnNames: ["userId"],
          referencedColumnNames: ["id"],
          referencedTableName: "users",
          onDelete: "CASCADE",
          onUpdate: "CASCADE",
        }),
      );
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("authentications");
  }
}
