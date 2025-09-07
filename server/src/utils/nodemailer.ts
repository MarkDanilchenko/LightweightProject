import { createTransport } from "nodemailer";
import AppConfiguration from "@server/configs/app.configuration";

const smtpConfiguration = AppConfiguration().smtpConfiguration;

const transporter = createTransport({
  host: smtpConfiguration.host,
  port: smtpConfiguration.port,
  auth: {
    user: smtpConfiguration.username,
    pass: smtpConfiguration.password,
  },
});
