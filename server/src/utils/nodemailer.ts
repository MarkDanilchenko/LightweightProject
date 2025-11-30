import { createTransport, Transporter } from "nodemailer";
import appConfiguration from "@server/configs/app.configuration";
import { Logger } from "@nestjs/common";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";

const logger = new Logger("Nodemailer");
const smtpConfiguration: AppConfiguration["smtpConfiguration"] = appConfiguration().smtpConfiguration;

if (
  !smtpConfiguration?.host ||
  !smtpConfiguration?.port ||
  !smtpConfiguration?.username ||
  !smtpConfiguration?.password ||
  !smtpConfiguration?.from
) {
  logger.error("SMTP host or port or username or password or from are not configured.");

  process.exit(1);
}

const transporter: Transporter = createTransport({
  host: smtpConfiguration.host,
  port: smtpConfiguration.port,
  secure: smtpConfiguration.port === 465, // true for 465, false for other ports
  auth: {
    user: smtpConfiguration.username,
    pass: smtpConfiguration.password,
  },
});

transporter.verify((error: Error | null): void => {
  if (error) {
    logger.error("Error with SMTP configuration");

    process.exit(1);
  }

  return logger.log("SMTP configuration is valid.");
});

export default transporter;
