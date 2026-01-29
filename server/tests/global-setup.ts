import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "node:path";
import { Logger } from "@nestjs/common";
import { Client } from "pg";
import { execSync } from "node:child_process";

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
  // Connect to the test DB host, drop and recreate its database again;
  // This is needed to start e2e tests with clean, empty state;
  const { TEST_DATABASE_HOST, TEST_DATABASE_PORT, TEST_DATABASE_NAME, TEST_DATABASE_USER, TEST_DATABASE_PASSWORD } =
    dotenv.parse(fs.readFileSync(path.join(process.cwd(), ".env")));

  if (
    !TEST_DATABASE_HOST ||
    !TEST_DATABASE_PORT ||
    !TEST_DATABASE_NAME ||
    !TEST_DATABASE_USER ||
    !TEST_DATABASE_PASSWORD
  ) {
    logger.error("Test variables are not set properly in the .env file");

    process.exit(1);
  }

  try {
    const pgClient: Client = new Client({
      host: TEST_DATABASE_HOST,
      port: Number(TEST_DATABASE_PORT),
      database: "postgres", // Connect to the default database, because of attempt to drop the test's database;
      user: TEST_DATABASE_USER,
      password: TEST_DATABASE_PASSWORD,
    });

    await pgClient.connect();

    await pgClient.query(`DROP DATABASE IF EXISTS "${TEST_DATABASE_NAME}"`);
    await pgClient.query(`CREATE DATABASE "${TEST_DATABASE_NAME}"`);

    await pgClient.end();
  } catch (error) {
    logger.error("Failed to drop or create the tests database", error);

    process.exit(1);
  }

  // 2.
  // Run all migrations on the created tests DB
  // (because of NODE_ENV === "test" and the reassign in the app.configuration.ts);
  try {
    execSync("npm run build:server && npm run typeorm:run", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
  } catch (error) {
    logger.error("Failed to run migrations on the tests database", error);

    process.exit(1);
  }

  logger.log("Global setup completed");
}
