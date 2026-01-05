/* eslint-disable @typescript-eslint/unbound-method */
import { createTransport } from "nodemailer";
import appConfiguration from "@server/configs/app.configuration";

// Mock the nodemailer createTransport;
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    verify: jest.fn().mockImplementation((callback: (error: Error | null) => void): void => {
      callback(null);
    }),
  }),
}));

// Mock the app SMTP configuration;
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
  })),
}));

describe("Nodemailer Utility", (): void => {
  beforeEach((): void => {
    jest.clearAllMocks();
  });

  it("should create a transporter with correct configuration", (): void => {
    jest.requireActual("@server/utils/nodemailer");

    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 587,
      secure: false, // Since port is not 465
      auth: {
        user: "tests@example.com",
        pass: "tests-password",
      },
    });
    expect(createTransport).toHaveBeenCalledTimes(1);
  });

  it("should throw an error if SMTP host is missing", (): void => {
    const originalProcessExit = process.exit;
    const mockProcessExit = jest.fn().mockImplementationOnce((code: number): void => {
      throw new Error(`Process exited with code ${code}`);
    });
    process.exit = mockProcessExit as unknown as (code: number) => never;

    (appConfiguration as jest.Mock).mockReturnValueOnce({
      smtpConfiguration: {
        port: 587,
        username: "tests@example.com",
        password: "tests-password",
        from: "noreply@example.com",
      },
    });

    jest.isolateModules((): void => {
      // Ensure, that process.exit is called with code 1;
      expect((): void => {
        jest.requireActual("@server/utils/nodemailer");
      }).toThrow("Process exited with code 1");
    });

    process.exit = originalProcessExit;
  });

  it("should use secure: true for port 465", (): void => {
    (appConfiguration as jest.Mock).mockReturnValueOnce({
      smtpConfiguration: {
        host: "smtp.example.com",
        port: 465,
        username: "tests@example.com",
        password: "tests-password",
        from: "noreply@example.com",
      },
    });

    jest.isolateModules((): void => {
      jest.requireActual("@server/utils/nodemailer");

      // Ensure, that createTransport is called with secure: true;
      expect(createTransport).toHaveBeenCalledWith({
        host: "smtp.example.com",
        port: 465,
        secure: true,
        auth: {
          user: "tests@example.com",
          pass: "tests-password",
        },
      });
      expect(createTransport).toHaveBeenCalledTimes(1);
    });
  });

  it("should successfully verify the transporter configuration", (): void => {
    const mockVerify = jest.fn((callback: (error: Error | null) => void): void => callback(null));
    (createTransport as jest.Mock).mockReturnValueOnce({
      verify: mockVerify,
    });

    jest.isolateModules((): void => {
      jest.requireActual("@server/utils/nodemailer");

      expect(mockVerify).toHaveBeenCalled();
      expect(mockVerify).toHaveBeenCalledTimes(1);
    });
  });

  it("should throw error, if verify of the transporter configuration fails", (): void => {
    const originalProcessExit = process.exit;
    const mockProcessExit = jest.fn().mockImplementationOnce((code: number): void => {
      throw new Error(`Process exited with code ${code}`);
    });
    process.exit = mockProcessExit as unknown as (code: number) => never;

    const mockVerify = jest.fn((callback: (error: Error | null) => void): void =>
      callback(new Error("Verification failed")),
    );
    (createTransport as jest.Mock).mockReturnValueOnce({
      verify: mockVerify,
    });

    jest.isolateModules((): void => {
      expect((): void => {
        jest.requireActual("@server/utils/nodemailer");
      }).toThrow("Process exited with code 1");
    });

    process.exit = originalProcessExit;
  });
});
