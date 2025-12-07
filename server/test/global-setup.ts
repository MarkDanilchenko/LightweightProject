import { Logger } from "@nestjs/common";

const logger = new Logger("GlobalSetup");

/**
 * Global setup function for Jest.
 * This function is called once before all tests are executed.
 * It is used to set up the environment for the tests.
 *
 * @returns {Promise<void>} A promise that resolves when the setup is complete.
 */
export default async function globalSetup(): Promise<void> {
  logger.log("Global setup started");
}
