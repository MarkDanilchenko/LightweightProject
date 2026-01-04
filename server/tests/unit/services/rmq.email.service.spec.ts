import * as fs from "node:fs";
import * as ejs from "ejs";
import { Test, TestingModule } from "@nestjs/testing";
import RmqEmailService from "@server/services/rmq/rmq.email.service";
import { ConfigService } from "@nestjs/config";
import { DataSource, QueryRunner } from "typeorm";
import EventsService from "@server/events/events.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import TokensService from "@server/tokens/tokens.service";
import AuthService from "@server/auth/auth.service";
import {
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  EventName,
} from "@server/events/interfaces/events.interfaces";
import UserEntity from "@server/users/users.entity";
import AuthenticationEntity from "@server/auth/auth.entity";
import transporter from "@server/utils/nodemailer";
import { buildAuthenticationFakeFactory, buildUserFakeFactory } from "../../factories";

describe("RmqEmailService", (): void => {
  let rmqEmailService: RmqEmailService;
  let configService: ConfigService;
  let dataSource: DataSource;
  let eventsService: EventsService;
  let eventEmitter: EventEmitter2;
  let tokensService: TokensService;
  let authService: AuthService;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {},
  } as unknown as QueryRunner;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      switch (key) {
        case "smtpConfiguration":
          return { from: "no-reply@LightweightProject" };

        case "serverConfiguration":
          return { baseUrl: "https://127.0.0.1:3000" };

        case "clientConfiguration":
          return { baseUrl: "https://127.0.0.1:3001" };

        default:
          return null;
      }
    }),
  };

  beforeEach(async (): Promise<void> => {
    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        RmqEmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
        {
          provide: EventsService,
          useValue: {
            buildInstance: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: TokensService,
          useValue: {
            generate: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            findAuthenticationByPk: jest.fn(),
            updateAuthentication: jest.fn(),
          },
        },
      ],
    }).compile();

    rmqEmailService = testingModule.get<RmqEmailService>(RmqEmailService);
    configService = testingModule.get<ConfigService>(ConfigService);
    dataSource = testingModule.get<DataSource>(DataSource);
    eventsService = testingModule.get<EventsService>(EventsService);
    eventEmitter = testingModule.get<EventEmitter2>(EventEmitter2);
    tokensService = testingModule.get<TokensService>(TokensService);
    authService = testingModule.get<AuthService>(AuthService);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(rmqEmailService).toBeDefined();
  });

  describe("sendWelcomeVerificationEmail", (): void => {
    let payload: AuthLocalCreatedEvent;
    let user: UserEntity;
    let authentication: AuthenticationEntity;

    beforeAll((): void => {
      user = buildUserFakeFactory();
      authentication = buildAuthenticationFakeFactory({ userId: user.id });

      payload = {
        name: EventName.AUTH_LOCAL_CREATED,
        userId: user.id,
        modelId: authentication.id,
        metadata: {
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
          email: user.email,
        },
      };
    });

    beforeEach((): void => {
      jest.spyOn(fs.promises, "access").mockResolvedValue(undefined);
      jest.spyOn(authService, "findAuthenticationByPk").mockResolvedValue(authentication);
      jest.spyOn(tokensService, "generate").mockResolvedValue("test_token:QEexS0H");
      jest.spyOn(ejs, "renderFile").mockResolvedValue("<html><body><h1>Test</h1></body></html>");
      jest.spyOn(transporter, "sendMail").mockResolvedValue({} as any);
    });

    it("should send a welcome verification email successfully", async (): Promise<void> => {
      await rmqEmailService.sendWelcomeVerificationEmail(payload);

      expect(fs.promises.access).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(authService.findAuthenticationByPk).toHaveBeenCalledWith(payload.modelId);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(tokensService.generate).toHaveBeenCalled();
      expect(ejs.renderFile).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(authService.updateAuthentication).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(eventEmitter.emit).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(transporter.sendMail).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it("should throw an error if template file does not exist", async (): Promise<void> => {
      jest.spyOn(fs.promises, "access").mockRejectedValue(new Error("File not found"));

      await expect(rmqEmailService.sendWelcomeVerificationEmail(payload)).rejects.toThrow("File not found");
    });

    it("should throw an error if authentication not found", async (): Promise<void> => {
      jest.spyOn(authService, "findAuthenticationByPk").mockResolvedValue(null);

      await expect(rmqEmailService.sendWelcomeVerificationEmail(payload)).rejects.toThrow("Authentication not found");
    });

    it("should rollback transaction on error", async (): Promise<void> => {
      jest.spyOn(transporter, "sendMail").mockRejectedValue(new Error("Send mail failed"));

      await expect(rmqEmailService.sendWelcomeVerificationEmail(payload)).rejects.toThrow("Send mail failed");
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe("sendPasswordResetEmail", (): void => {
    let user: UserEntity;
    let authentication: AuthenticationEntity;
    let payload: AuthLocalPasswordResetEvent;

    beforeAll((): void => {
      user = buildUserFakeFactory();
      authentication = buildAuthenticationFakeFactory({ userId: user.id });

      payload = {
        name: EventName.AUTH_LOCAL_PASSWORD_RESET,
        userId: user.id,
        modelId: authentication.id,
        username: user.username,
        email: user.email,
      };
    });

    beforeEach((): void => {
      jest.spyOn(fs.promises, "access").mockResolvedValue(undefined);
      jest.spyOn(authService, "findAuthenticationByPk").mockResolvedValue(authentication);
      jest.spyOn(tokensService, "generate").mockResolvedValue("test_token:feU9xe3JxW");
      jest.spyOn(ejs, "renderFile").mockResolvedValue("<html><body><h1>Test</h1></body></html>");
      jest.spyOn(transporter, "sendMail").mockResolvedValue({} as any);
    });

    it("should send a password reset email successfully", async (): Promise<void> => {
      await rmqEmailService.sendPasswordResetEmail(payload);

      expect(fs.promises.access).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(authService.findAuthenticationByPk).toHaveBeenCalledWith(payload.modelId);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(tokensService.generate).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(tokensService.generate).toHaveBeenCalledWith(
        {
          userId: user.id,
          provider: "local",
        },
        {
          expiresIn: "15m",
          secret: authentication.metadata.local?.password,
        },
      );
      expect(ejs.renderFile).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(eventEmitter.emit).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(transporter.sendMail).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it("should throw an error if template file does not exist", async (): Promise<void> => {
      jest.spyOn(fs.promises, "access").mockRejectedValue(new Error("File not found"));

      await expect(rmqEmailService.sendPasswordResetEmail(payload)).rejects.toThrow("File not found");
    });

    it("should throw an error if authentication not found", async (): Promise<void> => {
      jest.spyOn(authService, "findAuthenticationByPk").mockResolvedValue(null);

      await expect(rmqEmailService.sendPasswordResetEmail(payload)).rejects.toThrow("Authentication not found");
    });

    it("should rollback transaction on error", async (): Promise<void> => {
      jest.spyOn(transporter, "sendMail").mockRejectedValue(new Error("Send mail failed"));

      await expect(rmqEmailService.sendPasswordResetEmail(payload)).rejects.toThrow("Send mail failed");

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });
});
