import { Logger } from "@nestjs/common";

const logger = new Logger("GlobalTeardown");

/**
 * Global teardown function for Jest.
 * This function is called after all tests have finished.
 * It is used to perform any necessary cleanup.
 *
 * @returns {Promise<void>} A promise that resolves when the global teardown is complete.
 */
export default async function globalTeardown(): Promise<void> {
  logger.log("Global teardown started");

  // Nothing to do here.

  logger.log("Global teardown completed");
}
