/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from "@nestjs/testing";
import RmqEmailConsumer from "@server/services/rmq/rmq.email.consumer";
import RmqEmailService from "@server/services/rmq/rmq.email.service";
import { RmqContext } from "@nestjs/microservices";
import {
  AuthLocalCreatedEvent,
  AuthLocalPasswordResetEvent,
  EventName,
} from "@server/events/interfaces/events.interfaces";
import { Logger } from "@nestjs/common";
import UserEntity from "@server/users/users.entity";
import { buildAuthenticationFactory, buildUserFactory } from "../../factories";
import AuthenticationEntity from "@server/auth/auth.entity";

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockImplementation((callback: (error: Error | null) => void): void => {
      callback(null);
    }),
  }),
}));

// Mock the app configuration to provide complete configuration for tests
jest.mock("@server/configs/app.configuration", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    smtpConfiguration: {
      host: "smtp.example.com",
      port: 587,
      username: "tests@example.com",
      password: "tests-password",
      from: "noreply@example.com",
    },
    jwtConfiguration: {
      secret: "test-secret-c2662514ae3efdf4f6e8c2977fb6a8bc3f7ca59853148fc90faa5279a4e04f9a",
      accessTokenExpiresIn: "24h",
      refreshTokenExpiresIn: "7d",
    },
    serverConfiguration: {
      host: "127.0.0.1",
      port: 3000,
      swaggerEnabled: false,
      cookieSecret: "test-secret-c2662514ae3efdf4f6e8c2977fb6a8bc3f7ca59853148fc90faa5279a4e04f9a",
      commonSecret: "test-secret-c2662514ae3efdf4f6e8c2977fb6a8bc3f7ca59853148fc90faa5279a4e04f9a",
      https: false,
      protocol: "http",
      baseUrl: "http://127.0.0.1:3000",
    },
    // clientConfiguration: {
    //   host: "127.0.0.1",
    //   port: 3001,
    //   protocol: "http",
    //   baseUrl: "http://127.0.0.1:3001",
    // },
    // loggerConfiguration: {
    //   transports: [],
    // },
    // dbConfiguration: {
    //   type: "postgres",
    //   host: "127.0.0.1",
    //   port: 5432,
    //   database: "test_db",
    //   username: "test_user",
    //   password: "test_password",
    //   logging: false,
    //   migrationsRun: false,
    //   entities: [],
    //   autoLoadEntities: true,
    //   migrations: [],
    //   applicationName: "LightweightProject",
    // },
    // authConfiguration: {
    //   google: {
    //     clientID: "test-google-client-id",
    //     clientSecret: "test-google-client-secret",
    //     callbackURL: "http://127.0.0.1:3000/api/v1/auth/google/redirect",
    //   },
    //   keycloak: {
    //     oidc: {
    //       clientID: "test-kc-client-id",
    //       clientSecret: "test-kc-client-secret",
    //       callbackURL: "http://127.0.0.1:3000/api/v1/auth/keycloak/oidc/redirect",
    //       authUrl: "http://localhost:8080/realms/test/protocol/openid-connect/auth",
    //       idTokenUrl: "http://localhost:8080/realms/test/protocol/openid-connect/token",
    //       userInfoUrl: "http://localhost:8080/realms/test/protocol/openid-connect/userinfo",
    //       discoveryUrl: "http://localhost:8080/realms/test/.well-known/openid-configuration",
    //     },
    //     saml: {
    //       issuer: "test-kc-saml-issuer",
    //       idpCert: "test-cert",
    //       callbackUrl: "http://127.0.0.1:3000/api/v1/auth/keycloak/saml/redirect",
    //       entryPoint: "http://localhost:8080/realms/test/protocol/saml",
    //       descriptorUrl: "http://localhost:8080/realms/test/protocol/saml/descriptor",
    //     },
    //   },
    // },
    // rabbitmqConfiguration: {
    //   transport: "rmq",
    //   options: {
    //     urls: ["amqp://guest:guest@localhost:5672"],
    //     queue: "test_queue",
    //     prefetchCount: 1,
    //     persistent: false,
    //     socketOptions: {
    //       heartbeatIntervalInSeconds: 60,
    //       reconnectTimeInSeconds: 10,
    //     },
    //     queueOptions: {
    //       durable: false,
    //     },
    //   },
    // },
    // redisConfiguration: {
    //   transport: "redis",
    //   options: {
    //     host: "127.0.0.1",
    //     port: 6379,
    //     password: undefined,
    //     db: 0,
    //     keyPrefix: "",
    //   },
    // },
  })),
}));

describe("RmqEmailConsumer", (): void => {
  const mockChannel = { ack: jest.fn(), nack: jest.fn() };
  const mockRmqContext = {
    getChannelRef: () => mockChannel,
    getMessage: () => jest.fn().mockImplementation((): void => {}),
  } as unknown as RmqContext;
  let rmqEmailConsumer: RmqEmailConsumer;
  let rmqEmailService: jest.Mocked<RmqEmailService>;
  let logger: jest.SpyInstance;
  let user: UserEntity;
  let authentication: AuthenticationEntity;

  beforeEach(async (): Promise<void> => {
    user = buildUserFactory();
    authentication = buildAuthenticationFactory({ userId: user.id });

    const mockRmqEmailService = {
      sendWelcomeVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [RmqEmailConsumer],
      providers: [{ provide: RmqEmailService, useValue: mockRmqEmailService }],
    }).compile();

    rmqEmailConsumer = testingModule.get<RmqEmailConsumer>(RmqEmailConsumer);
    rmqEmailService = testingModule.get<jest.Mocked<RmqEmailService>>(RmqEmailService);

    logger = jest.spyOn(Logger.prototype, "error").mockImplementation((): void => {});
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  it("should be defined", (): void => {
    expect(rmqEmailConsumer).toBeDefined();
  });

  describe("handleAuthLocalCreated", (): void => {
    let payload: AuthLocalCreatedEvent;

    beforeAll((): void => {
      payload = {
        name: EventName.AUTH_LOCAL_CREATED,
        userId: user.id,
        modelId: authentication.id,
        metadata: {
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatarUrl: user.avatarUrl,
        },
      };
    });

    it("should send a welcome verification email and ack the message", async (): Promise<void> => {
      await rmqEmailConsumer.handleAuthLocalCreated(payload, mockRmqContext);

      expect(rmqEmailService.sendWelcomeVerificationEmail).toHaveBeenCalledWith(payload);
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it("should nack the message if sending email fails", async (): Promise<void> => {
      rmqEmailService.sendWelcomeVerificationEmail.mockRejectedValueOnce(new Error("Failed to send email"));

      await rmqEmailConsumer.handleAuthLocalCreated(payload, mockRmqContext);

      expect(rmqEmailService.sendWelcomeVerificationEmail).toHaveBeenCalledWith(payload);
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalled();
    });
  });

  describe("handleAuthLocalPasswordReset", (): void => {
    let payload: AuthLocalPasswordResetEvent;

    beforeAll((): void => {
      payload = {
        name: EventName.AUTH_LOCAL_PASSWORD_RESET,
        userId: user.id,
        modelId: authentication.id,
        username: user.username,
        email: user.email,
      };
    });

    it("should send a password reset email and ack the message", async (): Promise<void> => {
      await rmqEmailConsumer.handleAuthLocalPasswordReset(payload, mockRmqContext);

      expect(rmqEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(payload);
      expect(mockChannel.ack).toHaveBeenCalled();
      expect(mockChannel.nack).not.toHaveBeenCalled();
    });

    it("should nack the message if sending email fails", async (): Promise<void> => {
      rmqEmailService.sendPasswordResetEmail.mockRejectedValueOnce(new Error("Failed to send email"));

      await rmqEmailConsumer.handleAuthLocalPasswordReset(payload, mockRmqContext);

      expect(rmqEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(payload);
      expect(mockChannel.ack).not.toHaveBeenCalled();
      expect(mockChannel.nack).toHaveBeenCalled();
    });
  });
});
