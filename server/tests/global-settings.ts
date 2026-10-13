import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "node:path";
import { Client } from "pg";
import { execSync } from "node:child_process";
import type { TestProject } from "vitest/node";

/**
 * Global setup function for Vitest.
 *
 * It performs the following steps:
 * 1. Reads test database configuration from .env file
 * 2. Connects to the test database host and drops/recreates the test database
 * 3. Runs TypeORM migrations on the newly created test database
 *
 * @param {TestProject} project
 *
 * @returns {Promise<void>} A promise that resolves when the setup is complete.
 */
export async function setup(project: TestProject): Promise<void> {
  // Write logs directly to the stdout, bypassing buffers Vitest and Node.js;
  fs.writeSync(1, "Global setup started\n");

  // 1.
  // Connect to the test DB host, drop and recreate its database again;
  // This is needed to start e2e tests with clean, empty state;
  const { TEST_DATABASE_HOST, TEST_DATABASE_PORT, TEST_DATABASE_NAME, TEST_DATABASE_USER, TEST_DATABASE_PASSWORD } =
    dotenv.parse(fs.readFileSync(path.join(__dirname, "../../.env")));

  if (
    !TEST_DATABASE_HOST ||
    !TEST_DATABASE_PORT ||
    !TEST_DATABASE_NAME ||
    !TEST_DATABASE_USER ||
    !TEST_DATABASE_PASSWORD
  ) {
    fs.writeSync(2, "Test variables are not set properly in the .env file\n");

    process.exit(1);
  }

  try {
    const pgClient: Client = new Client({
      host: TEST_DATABASE_HOST,
      port: Number(TEST_DATABASE_PORT),
      database: "postgres", // Connect to the default database, because of attempt to drop the test's database below;
      user: TEST_DATABASE_USER,
      password: TEST_DATABASE_PASSWORD,
    });

    await pgClient.connect();

    await pgClient.query(`DROP DATABASE IF EXISTS "${TEST_DATABASE_NAME}"`);
    await pgClient.query(`CREATE DATABASE "${TEST_DATABASE_NAME}"`);

    await pgClient.end();
  } catch (error) {
    fs.writeSync(2, "Failed to drop or create the tests database " + (error as Error).message + "\n");

    process.exit(1);
  }

  // 2.
  // Run all migrations on the created tests DB
  // (because of NODE_ENV === "test" and the reassign in the app.configuration.ts);
  try {
    execSync("npm run build:server && npm run typeorm:run", {
      stdio: "inherit",
    });
  } catch (error) {
    fs.writeSync(2, "Failed to run migrations on the tests database " + (error as Error).message + "\n");

    process.exit(1);
  } finally {
    fs.writeSync(1, "Global setup completed\n");
  }
}

/**
 * Global teardown function for Vitest.
 *
 * It is used to perform any necessary cleanup.
 *
 * @returns {void} Returns with void when the global teardown is complete.
 */
export async function teardown(): Promise<void> {
  fs.writeSync(1, "Global teardown started\n");

  // Nothing to do here;

  fs.writeSync(1, "Global teardown completed\n");
}
