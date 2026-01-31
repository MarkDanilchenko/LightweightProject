import { Logger } from "@nestjs/common";

const logger = new Logger("GlobalTeardown");

/**
 * Global teardown function for Jest.
 * This function is called after all tests have finished.
 * It is used to perform any necessary cleanup.
 *
 * @returns {void} Returns with void when the global teardown is complete.
 */
export default function globalTeardown(): void {
  logger.log("Global teardown started");

  // Nothing to do here;

  logger.log("Global teardown completed");

  process.exit(0);
}
