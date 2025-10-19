import * as fs from "node:fs";
import path from "node:path";
import ejs from "ejs";
import { Injectable, Logger, LoggerService } from "@nestjs/common";
import { AuthLocalCreatedEvent } from "@server/event/interfaces/event.interfaces";
import { ConfigService } from "@nestjs/config";
import { Transporter } from "nodemailer";
import { MailOptions } from "nodemailer/lib/smtp-pool";
import transporter from "@server/utils/nodemailer";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";
import TokenService from "@server/common/token.service";

@Injectable()
export class RmqEmailService {
  private readonly configService: ConfigService;
  private readonly logger: LoggerService;
  private readonly transporter: Transporter;
  private readonly tokenService: TokenService;

  constructor(configService: ConfigService, tokenService: TokenService) {
    this.configService = configService;
    this.logger = new Logger(RmqEmailService.name);
    this.transporter = transporter;
    this.tokenService = tokenService;
  }

  async sendWelcomeVerificationEmail(payload: AuthLocalCreatedEvent): Promise<void> {
    const { userId, metadata } = payload;
    const { from } = this.configService.get<AppConfiguration["smtpConfiguration"]>("smtpConfiguration")!;
    const { baseUrl } = this.configService.get<AppConfiguration["serverConfiguration"]>("serverConfiguration")!;

    const emailVerificationTemplatePath: string = path.resolve(__dirname, "@server/templates/emailVerification.ejs");
    await fs.promises.access(emailVerificationTemplatePath, fs.constants.R_OK);

    const token: string = await this.tokenService.generateLocalEmailVerificationToken(userId);

    const html: string = await ejs.renderFile(emailVerificationTemplatePath, {
      username: metadata.username,
      callbackUrl: `${baseUrl}/auth/local/email-verification?token=${token}`,
    });

    const mailOptions: MailOptions = {
      from,
      to: metadata.email,
      subject: "Welcome to the LightweightProject",
      text: "Please, verify your email address to proceed.",
      html,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
