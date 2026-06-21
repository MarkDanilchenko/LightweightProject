import * as path from "node:path";
import * as fs from "node:fs";
import * as ejs from "ejs";
import { Injectable } from "@nestjs/common";
import {
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  AuthLocalReactivationEvent,
  AuthLocalRestorationEvent,
  EventName,
  UserDeactivatedEvent,
  UserDeletedEvent,
} from "#server/events/interfaces/events.interfaces";
import { ConfigService } from "@nestjs/config";
import { Transporter } from "nodemailer";
import { MailOptions } from "nodemailer/lib/smtp-pool";
import transporter from "#server/utils/nodemailer";
import AppConfiguration from "#server/configs/interfaces/appConfiguration.interfaces";
import { AuthenticationProvider } from "#server/auth/interfaces/auth.interfaces";
import AuthenticationEntity from "#server/auth/auth.entity";
import { DataSource, EntityManager } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";
import EventsService from "#server/events/events.service";
import UserService from "#server/users/users.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import AuthService from "#server/auth/auth.service";
import TokensService from "#server/tokens/tokens.service";
import UserEntity from "#server/users/users.entity";

@Injectable()
export default class RmqEmailService {
  private readonly configService: ConfigService;
  private readonly dataSource: DataSource;
  private readonly transporter: Transporter;
  private readonly eventsService: EventsService;
  private readonly eventEmitter: EventEmitter2;
  private readonly tokensService: TokensService;
  private readonly authService: AuthService;
  private readonly userService: UserService;

  constructor(
    configService: ConfigService,
    @InjectDataSource()
    dataSource: DataSource,
    eventsService: EventsService,
    eventEmitter: EventEmitter2,
    tokensService: TokensService,
    authService: AuthService,
    userService: UserService,
  ) {
    this.configService = configService;
    this.dataSource = dataSource;
    this.transporter = transporter;
    this.eventsService = eventsService;
    this.eventEmitter = eventEmitter;
    this.tokensService = tokensService;
    this.authService = authService;
    this.userService = userService;
  }

  /**
   * Resolves and validates the path to an EJS email template.
   *
   * @param {string} templateName - Template name without the `.ejs` extension.
   *
   * @returns {Promise<string>} Absolute path to the template file.
   */
  async getTemplatePath(templateName: string): Promise<string> {
    try {
      const templatePath: string = path.resolve(__dirname, `../../../../templates/${templateName}.ejs`);
      await fs.promises.access(templatePath, fs.constants.R_OK);

      return templatePath;
    } catch {
      throw new Error(`Template ${templateName} not found`);
    }
  }

  /**
   * Send a welcome verification email to the users (local idp).
   *
   * @param {AuthLocalCreatedEvent} payload - The events payload containing the user's metadata.
   *
   * @returns {Promise<void>} A promise, that resolves, when the email is successfully sent.
   */
  async sendEmailVerification(payload: AuthLocalCreatedEvent): Promise<void> {
    const { userId, modelId, metadata } = payload;

    const localEmailVerificationTemplatePath: string = await this.getTemplatePath("localEmailVerification");

    const { from } = this.configService.get<AppConfiguration["smtpConfiguration"]>("smtpConfiguration")!;
    const { baseUrl } = this.configService.get<AppConfiguration["clientConfiguration"]>("clientConfiguration")!;

    const authentication: AuthenticationEntity | null = await this.authService.findAuthenticationByPk(modelId);
    if (!authentication) {
      throw new Error("Email verification: Authentication not found");
    }

    const token: string = await this.tokensService.generate({
      userId,
      provider: AuthenticationProvider.LOCAL,
    });
    // TODO: note, that this callback url redirects to the client's page,
    //  where /api/v1/auth/local/email-verification/confirm (GET) with proper token in query should be called;
    const callbackUrl: string = `${baseUrl}/....?token=${token}`;
    const html: string = await ejs.renderFile(
      localEmailVerificationTemplatePath,
      { username: metadata.username, callbackUrl },
      { root: path.resolve(__dirname, "../../../../templates") },
    );
    const mailOptions: MailOptions = {
      from,
      to: metadata.email,
      subject: "LightweightProject: welcome to the LightweightProject",
      text: "Please, verify your email address to proceed.",
      html,
    };

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
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

      // Send an email after successful database operations;
      await this.transporter.sendMail(mailOptions);
    });
  }

  /**
   * Sends an email with a password reset link to the user (local idp).
   * The email contains a link with a jwt token, which is valid for 15 minutes.
   *
   * @param {AuthLocalPasswordResetEvent} payload - The event containing the user's information.
   *
   * @returns {Promise<void>} A promise that resolves when the email has been successfully sent.
   */
  async sendPasswordReset(payload: AuthLocalPasswordResetEvent): Promise<void> {
    const { userId, modelId, metadata } = payload;
    const { username, email } = metadata;

    const localPasswordResetTemplatePath: string = await this.getTemplatePath("localPasswordReset");

    const { from } = this.configService.get<AppConfiguration["smtpConfiguration"]>("smtpConfiguration")!;
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
    // TODO: note, that this callback url redirects to the client's page with password reset form,
    //  where /api/v1/auth/local/password-reset/confirm (POST) with proper body should be called;
    const callbackUrl: string = `${baseUrl}/....?token=${token}`;
    const html: string = await ejs.renderFile(
      localPasswordResetTemplatePath,
      { username, callbackUrl },
      { root: path.resolve(__dirname, "../../../../templates") },
    );
    const mailOptions: MailOptions = {
      from,
      to: email,
      subject: "LightweightProject: password reset",
      text: "Please, click on the link below and follow the instructions to reset your password.",
      html,
    };

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
      this.eventEmitter.emit(
        EventName.AUTH_LOCAL_PASSWORD_RESET_SENT,
        this.eventsService.buildInstance(EventName.AUTH_LOCAL_PASSWORD_RESET_SENT, userId, modelId, { email }),
        manager,
      );

      await this.transporter.sendMail(mailOptions);
    });
  }

  /**
   * Sends a reactivation email to the user.
   * The email contains a link with a jwt token, which is valid for 15 minutes.
   *
   * @param {AuthLocalReactivationEvent} payload - The event containing the user's information.
   *
   * @returns {Promise<void>} A promise that resolves when the email has been successfully sent.
   */
  async sendUserReactivation(payload: AuthLocalReactivationEvent): Promise<void> {
    const { userId, modelId, metadata } = payload;
    const { username, email } = metadata;

    const reactivationTemplatePath: string = await this.getTemplatePath("localUserReactivation");

    const { from } = this.configService.get<AppConfiguration["smtpConfiguration"]>("smtpConfiguration")!;
    const { baseUrl } = this.configService.get<AppConfiguration["clientConfiguration"]>("clientConfiguration")!;

    const user: UserEntity | null = await this.userService.findUser({
      where: [{ id: userId }, { id: modelId }],
    });
    if (!user) {
      throw new Error("Reactivation request email: User not found");
    }

    const token: string = await this.tokensService.generate(
      { userId, provider: AuthenticationProvider.LOCAL },
      { expiresIn: "15m" },
    );
    // TODO: note, that this callback url redirects to the client's page,
    //  where /api/v1/auth/local/reactivation/confirm (GET) with proper token in query should be called;
    const callbackUrl: string = `${baseUrl}/....?token=${token}`;
    const html: string = await ejs.renderFile(
      reactivationTemplatePath,
      { username, callbackUrl },
      { root: path.resolve(__dirname, "../../../../templates") },
    );
    const mailOptions: MailOptions = {
      from,
      to: email,
      subject: "LightweightProject: reactivation account",
      text: "Please, click on the link below and follow the instructions to reactivate your account.",
      html,
    };

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
      this.eventEmitter.emit(
        EventName.AUTH_LOCAL_REACTIVATION_SENT,
        this.eventsService.buildInstance(EventName.AUTH_LOCAL_REACTIVATION_SENT, userId, modelId, { email }),
        manager,
      );

      await this.transporter.sendMail(mailOptions);
    });
  }

  /**
   * Sends a restoration email to the user.
   * The email contains a link with a jwt token, which is valid for 15 minutes.
   *
   * @param {AuthLocalRestorationEvent} payload - The event containing the user's information.
   *
   * @returns {Promise<void>} A promise that resolves when the email has been successfully sent.
   */
  async sendUserRestoration(payload: AuthLocalRestorationEvent): Promise<void> {
    const { userId, modelId, metadata } = payload;
    const { username, email } = metadata;

    const restorationTemplatePath: string = await this.getTemplatePath("localUserRestoration");

    const { from } = this.configService.get<AppConfiguration["smtpConfiguration"]>("smtpConfiguration")!;
    const { baseUrl } = this.configService.get<AppConfiguration["clientConfiguration"]>("clientConfiguration")!;

    const user: UserEntity | null = await this.userService.findUser({
      where: [{ id: userId }, { id: modelId }],
      withDeleted: true,
    });
    if (!user) {
      throw new Error("Restoration request email: User not found");
    }

    const token: string = await this.tokensService.generate(
      { userId, provider: AuthenticationProvider.LOCAL },
      { expiresIn: "15m" },
    );
    // TODO: note, that this callback url redirects to the client's page,
    //  where /api/v1/auth/local/restoration/confirm (GET) with proper token in query should be called;
    const callbackUrl: string = `${baseUrl}/....?token=${token}`;
    const html: string = await ejs.renderFile(
      restorationTemplatePath,
      { username, callbackUrl },
      { root: path.resolve(__dirname, "../../../../templates") },
    );
    const mailOptions: MailOptions = {
      from,
      to: email,
      subject: "LightweightProject: restoration account",
      text: "Please, click on the link below and follow the instructions to restore your account.",
      html,
    };

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
      this.eventEmitter.emit(
        EventName.AUTH_LOCAL_RESTORATION_SENT,
        this.eventsService.buildInstance(EventName.AUTH_LOCAL_RESTORATION_SENT, userId, modelId, { email }),
        manager,
      );

      await this.transporter.sendMail(mailOptions);
    });
  }

  /**
   * Sends a deactivation notification email to the user.
   *
   * @param {UserDeactivatedEvent} payload - The event containing the user's information.
   *
   * @returns {Promise<void>} A promise that resolves when the email has been successfully sent.
   */
  async sendUserDeactivatedNotification(payload: UserDeactivatedEvent): Promise<void> {
    const { userId, modelId, metadata } = payload;
    const { username, email } = metadata;

    const userDeactivatedNotificationTemplatePath: string = await this.getTemplatePath(
      "userDeactivatedNotificationEmail",
    );

    const { from } = this.configService.get<AppConfiguration["smtpConfiguration"]>("smtpConfiguration")!;

    const user: UserEntity | null = await this.userService.findUser({
      where: [{ id: userId }, { id: modelId }],
    });
    if (!user) {
      throw new Error("User deactivation email: User not found");
    }

    const html: string = await ejs.renderFile(
      userDeactivatedNotificationTemplatePath,
      { username },
      { root: path.resolve(__dirname, "../../../../templates") },
    );
    const mailOptions: MailOptions = {
      from,
      to: email,
      subject: "LightweightProject: User deactivation notification",
      text: "Deactivation user's account has been processed.",
      html,
    };

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
      this.eventEmitter.emit(
        EventName.USER_DEACTIVATED,
        this.eventsService.buildInstance(EventName.USER_DEACTIVATED, userId, modelId, {
          email,
        }),
        manager,
      );

      await this.transporter.sendMail(mailOptions);
    });
  }

  /**
   * Sends a reactivation notification email to the user.
   *
   * @param {UserDeletedEvent} payload - The event containing the user's information.
   *
   * @returns {Promise<void>} A promise that resolves when the email has been successfully sent.
   */
  async sendUserDeletedNotification(payload: UserDeletedEvent): Promise<void> {
    const { userId, modelId, metadata } = payload;
    const { username, email } = metadata;

    const userDeletedNotificationTemplatePath: string = await this.getTemplatePath("userDeletedNotificationEmail");

    const { from } = this.configService.get<AppConfiguration["smtpConfiguration"]>("smtpConfiguration")!;

    const user: UserEntity | null = await this.userService.findUser({
      where: [{ id: userId }, { id: modelId }],
      withDeleted: true,
    });
    if (!user) {
      throw new Error("User not found");
    }

    const html: string = await ejs.renderFile(
      userDeletedNotificationTemplatePath,
      { username },
      { root: path.resolve(__dirname, "../../../../templates") },
    );
    const mailOptions: MailOptions = {
      from,
      to: email,
      subject: "LightweightProject: User deleted notification",
      text: "Deleting user's account has been processed.",
      html,
    };

    await this.dataSource.transaction(async (manager: EntityManager): Promise<void> => {
      this.eventEmitter.emit(
        EventName.USER_DELETED,
        this.eventsService.buildInstance(EventName.USER_DELETED, userId, modelId, {
          email,
        }),
        manager,
      );

      await this.transporter.sendMail(mailOptions);
    });
  }
}
