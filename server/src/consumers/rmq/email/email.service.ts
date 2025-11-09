import * as path from "node:path";
import * as fs from "node:fs";
import * as ejs from "ejs";
import { Injectable } from "@nestjs/common";
import { AuthLocalCreatedEvent } from "@server/event/interfaces/event.interfaces";
import { ConfigService } from "@nestjs/config";
import { Transporter } from "nodemailer";
import { MailOptions } from "nodemailer/lib/smtp-pool";
import transporter from "@server/utils/nodemailer";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";
import TokenService from "@server/common/token.service";
import AuthService from "@server/auth/auth.service";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";
import AuthenticationEntity from "@server/auth/auth.entity";
import { FindOptionsWhere } from "typeorm";

@Injectable()
export class RmqEmailService {
  private readonly configService: ConfigService;
  private readonly transporter: Transporter;
  private readonly tokenService: TokenService;
  private readonly authService: AuthService;

  constructor(configService: ConfigService, tokenService: TokenService, authService: AuthService) {
    this.configService = configService;
    this.transporter = transporter;
    this.tokenService = tokenService;
    this.authService = authService;
  }

  /**
   * Send a welcome verification email to the user.
   *
   * @param {AuthLocalCreatedEvent} payload - The event payload containing the user's metadata.
   *
   * @returns {Promise<void>} A promise, that resolves, when the email is successfully sent.
   */
  async sendWelcomeVerificationEmail(payload: AuthLocalCreatedEvent): Promise<void> {
    const { userId, metadata, modelId } = payload;
    const { from } = this.configService.get<AppConfiguration["smtpConfiguration"]>("smtpConfiguration")!;
    const { baseUrl } = this.configService.get<AppConfiguration["serverConfiguration"]>("serverConfiguration")!;

    const authentication: AuthenticationEntity | null = await this.authService.findAuthenticationByPk(modelId);
    if (!authentication) {
      throw new Error("Authentication not found");
    }

    const emailVerificationTemplatePath: string = path.resolve(
      __dirname,
      "../../../../templates/emailVerification.ejs",
    );
    await fs.promises.access(emailVerificationTemplatePath, fs.constants.R_OK);

    const token: string = await this.tokenService.generate({
      userId,
      provider: AuthenticationProvider.LOCAL,
    });
    const callbackUrl: string = `${baseUrl}/auth/local/verification/email?token=${token}`;
    const html: string = await ejs.renderFile(emailVerificationTemplatePath, {
      username: metadata.username,
      callbackUrl,
    });
    const mailOptions: MailOptions = {
      from,
      to: metadata.email,
      subject: "Welcome to the LightweightProject",
      text: "Please, verify your email address to proceed.",
      html,
    };
    await this.transporter.sendMail(mailOptions);

    const whereCondition: FindOptionsWhere<AuthenticationEntity> = {
      userId,
      provider: AuthenticationProvider.LOCAL,
    };
    await this.authService.updateAuthentication(whereCondition, {
      metadata: {
        local: {
          ...authentication?.metadata.local,
          verificationSendAt: new Date(),
          callbackUrl,
        },
      },
    });
  }
}
