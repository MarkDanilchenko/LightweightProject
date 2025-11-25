import * as path from "node:path";
import * as fs from "node:fs";
import * as ejs from "ejs";
import { Injectable } from "@nestjs/common";
import { AuthLocalCreatedEvent, EventName } from "@server/events/interfaces/events.interfaces";
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
export class RmqEmailService {
  private readonly configService: ConfigService;
  private readonly dataSource: DataSource;
  private readonly transporter: Transporter;
  private readonly eventService: EventsService;
  private readonly eventEmitter: EventEmitter2;
  private readonly tokenService: TokensService;
  private readonly authService: AuthService;

  constructor(
    configService: ConfigService,
    @InjectDataSource()
    dataSource: DataSource,
    eventService: EventsService,
    eventEmitter: EventEmitter2,
    tokenService: TokensService,
    authService: AuthService,
  ) {
    this.configService = configService;
    this.dataSource = dataSource;
    this.transporter = transporter;
    this.eventService = eventService;
    this.eventEmitter = eventEmitter;
    this.tokenService = tokenService;
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
      throw new Error("Authentication not found");
    }

    const token: string = await this.tokenService.generate({
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
        this.eventService.buildInstance(EventName.AUTH_LOCAL_EMAIL_VERIFICATION_SENT, userId, modelId),
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
