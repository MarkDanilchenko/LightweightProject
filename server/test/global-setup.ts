import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "node:path";
import { Logger } from "@nestjs/common";
import { Client } from "pg";

const logger = new Logger("GlobalSetup");

/**
 * Global setup function for Jest.
 * This function is called once before all tests are executed.
 * It is used to set up all the environment and state for the tests.
 *
 * @returns {Promise<void>} A promise that resolves when the setup is complete.
 */
export default async function globalSetup(): Promise<void> {
  logger.log("Global setup started");

  // 1.
  // Connect to the test DB and drop it, if exists;
  // This one is needed to start e2e tests on clean state;
  const { TEST_DATABASE_HOST, TEST_DATABASE_PORT, TEST_POSTGRES_DB, TEST_POSTGRES_USER, TEST_POSTGRES_PASSWORD } =
    dotenv.parse(fs.readFileSync(path.join(__dirname, "../../.env")));
  if (
    !TEST_DATABASE_HOST ||
    !TEST_DATABASE_PORT ||
    !TEST_POSTGRES_DB ||
    !TEST_POSTGRES_USER ||
    !TEST_POSTGRES_PASSWORD
  ) {
    logger.error(
      "TEST_DATABASE_HOST, TEST_DATABASE_PORT, TEST_POSTGRES_DB, TEST_POSTGRES_USER, TEST_POSTGRES_PASSWORD are not set in the .env file",
    );

    process.exit(1);
  }

  const pgClient: Client = new Client({
    host: TEST_DATABASE_HOST,
    port: Number(TEST_DATABASE_PORT),
    database: "postgres", // Connect to the default DB, because of attempt to drop the test DB;
    user: TEST_POSTGRES_USER,
    password: TEST_POSTGRES_PASSWORD,
  });
  await pgClient.connect();

  try {
    await pgClient.query(`DROP DATABASE IF EXISTS "${TEST_POSTGRES_DB}"`);
    await pgClient.query(`CREATE DATABASE "${TEST_POSTGRES_DB}"`);
  } catch (error) {
    logger.error("Failed to drop or create the test database", error);

    process.exit(1);
  } finally {
    await pgClient.end();
  }

  // 2.
  // Run all migrations on the test DB;
  try {
  } catch (error) {
    logger.error("Failed to run migrations on the test database", error);

    process.exit(1);
  }

  logger.log("Global setup completed");
}
