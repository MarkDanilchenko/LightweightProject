import * as path from "node:path";
import * as fs from "node:fs";
import * as ejs from "ejs";
import { Injectable } from "@nestjs/common";
import {
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  EventName,
} from "@server/events/interfaces/events.interfaces";
import { ConfigService } from "@nestjs/config";
import { Transporter } from "nodemailer";
import { MailOptions } from "nodemailer/lib/smtp-pool";
import transporter from "@server/utils/nodemailer";
import AppConfiguration from "@server/configs/interfaces/appConfiguration.interfaces";
import { AuthenticationProvider } from "@server/auth/interfaces/auth.interfaces";
import AuthenticationEntity from "@server/auth/auth.entity";
import { DataSource, EntityManager, QueryRunner } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";
import EventsService from "@server/events/events.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import AuthService from "@server/auth/auth.service";
import TokensService from "@server/tokens/tokens.service";

@Injectable()
export default class RmqEmailService {
  private readonly configService: ConfigService;
  private readonly dataSource: DataSource;
  private readonly transporter: Transporter;
  private readonly eventsService: EventsService;
  private readonly eventEmitter: EventEmitter2;
  private readonly tokensService: TokensService;
  private readonly authService: AuthService;

  constructor(
    configService: ConfigService,
    @InjectDataSource()
    dataSource: DataSource,
    eventsService: EventsService,
    eventEmitter: EventEmitter2,
    tokensService: TokensService,
    authService: AuthService,
  ) {
    this.configService = configService;
    this.dataSource = dataSource;
    this.transporter = transporter;
    this.eventsService = eventsService;
    this.eventEmitter = eventEmitter;
    this.tokensService = tokensService;
    this.authService = authService;
  }

  /**
   * Send a welcome verification email to the users.
   *
   * @param {AuthLocalCreatedEvent} payload - The events payload containing the user's metadata.
   *
   * @returns {Promise<void>} A promise, that resolves, when the email is successfully sent.
   */
  async sendWelcomeVerificationEmail(payload: AuthLocalCreatedEvent): Promise<void> {
    // First, verify, that the appropriate template exists;
    const emailVerificationTemplatePath: string = path.resolve(process.cwd(), "templates/localEmailVerification.ejs");
    await fs.promises.access(emailVerificationTemplatePath, fs.constants.R_OK);

    const { userId, metadata, modelId } = payload;
    const { from } = this.configService.get<AppConfiguration["smtpConfiguration"]>("smtpConfiguration")!;
    const { baseUrl } = this.configService.get<AppConfiguration["serverConfiguration"]>("serverConfiguration")!;

    const authentication: AuthenticationEntity | null = await this.authService.findAuthenticationByPk(modelId);
    if (!authentication) {
      throw new Error(`Email verification: Authentication not found`);
    }

    const token: string = await this.tokensService.generate({
      userId,
      provider: AuthenticationProvider.LOCAL,
    });
    const callbackUrl: string = `${baseUrl}/api/v1/auth/local/verification/email?token=${token}`;
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

    // Start transaction with updating authentication, creating event and sending email;
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager: EntityManager = queryRunner.manager;

    try {
      await this.authService.updateAuthentication(
        { userId, provider: AuthenticationProvider.LOCAL },
        {
          metadata: {
            local: {
              ...authentication?.metadata.local,
              callbackUrl,
            },
          },
        },
        manager,
      );

      this.eventEmitter.emit(
        EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT,
        this.eventsService.buildInstance(EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT, userId, modelId, {
          email: metadata.email,
        }),
        manager,
      );

      // Send an email after any successful database operations;
      await this.transporter.sendMail(mailOptions);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Sends an email with a password reset link to the user.
   * The email contains a link with a jwt token, which is valid for 15 minutes.
   *
   * @param {AuthLocalPasswordResetEvent} payload - The event containing the user's information.
   *
   * @returns {Promise<void>} A promise that resolves when the email has been successfully sent.
   */
  async sendPasswordResetEmail(payload: AuthLocalPasswordResetEvent): Promise<void> {
    // First, verify, that the appropriate template exists;
    const passwordResetTemplatePath: string = path.resolve(process.cwd(), "templates/localPasswordReset.ejs");
    await fs.promises.access(passwordResetTemplatePath, fs.constants.R_OK);

    const { userId, modelId, username, email } = payload;
    const { from } = this.configService.get<AppConfiguration["smtpConfiguration"]>("smtpConfiguration")!;
    // Callback should redirect user to the client password reset page, not directly to the server!;
    const { baseUrl } = this.configService.get<AppConfiguration["clientConfiguration"]>("clientConfiguration")!;

    const authentication: AuthenticationEntity | null = await this.authService.findAuthenticationByPk(modelId);
    if (!authentication) {
      throw new Error("Authentication not found");
    }
    const currentPassword = authentication.metadata.local?.password as string;

    // Generate a jwt with the current user's password as the secret, because further: one jwt link = 1 attempt to change password;
    const token: string = await this.tokensService.generate(
      { userId, provider: AuthenticationProvider.LOCAL },
      { expiresIn: "15m", secret: currentPassword },
    );
    // TODO: callbackUrl should be implemented on the client (frontend-app);
    const callbackUrl: string = `${baseUrl}/local/password/reset?token=${token}`;
    const html: string = await ejs.renderFile(passwordResetTemplatePath, {
      username,
      callbackUrl,
    });
    const mailOptions: MailOptions = {
      from,
      to: email,
      subject: "Password Reset",
      text: "Please, click on the link below and follow the instructions to reset your password.",
      html,
    };

    // Start transaction with creating event and sending email;
    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const manager: EntityManager = queryRunner.manager;

    try {
      this.eventEmitter.emit(
        EventName.AUTH_LOCAL_PASSWORD_RESET_SENT,
        this.eventsService.buildInstance(EventName.AUTH_LOCAL_PASSWORD_RESET_SENT, userId, modelId, { email }),
        manager,
      );

      // Send an email after any successful database operations;
      await this.transporter.sendMail(mailOptions);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();

      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
