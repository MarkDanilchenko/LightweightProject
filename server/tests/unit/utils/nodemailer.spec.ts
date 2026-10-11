/* eslint-disable @typescript-eslint/unbound-method */
import { createTransport } from "nodemailer";
import appConfiguration from "#server/configs/app.configuration";
import { expect, Mock } from "vitest";

vi.mock("nodemailer", () => ({
  createTransport: vi.fn().mockReturnValue({
    verify: vi.fn().mockImplementation((callback: (error: Error | null) => void): void => {
      callback(null);
    }),
  }),
}));

// Mock the app SMTP configuration;
vi.mock("#server/configs/app.configuration", () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(() => ({
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
  afterEach((): void => {
    vi.clearAllMocks();
  });

  it("should create a transporter with correct configuration", async (): Promise<void> => {
    await vi.importActual<typeof import("#server/utils/nodemailer")>("#server/utils/nodemailer");

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 587,
      secure: false, // Since port is not 465
      auth: {
        user: "tests@example.com",
        pass: "tests-password",
      },
    });
  });

  it("should throw an error if SMTP host is missing", async (): Promise<void> => {
    const originalProcessExit = process.exit;
    const mockProcessExit = vi.fn().mockImplementationOnce((code: number): void => {
      throw new Error(`Process exited with code ${code}`);
    });
    process.exit = mockProcessExit as unknown as (code: number) => never;

    (appConfiguration as Mock).mockReturnValueOnce({
      smtpConfiguration: {
        port: 587,
        username: "tests@example.com",
        password: "tests-password",
        from: "noreply@example.com",
      },
    });

    vi.resetModules();
    // Ensure, that process.exit is called with code 1;
    await expect(async (): Promise<void> => {
      await vi.importActual<typeof import("#server/utils/nodemailer")>("#server/utils/nodemailer");
    }).rejects.toThrow("Process exited with code 1");

    process.exit = originalProcessExit;
  });

  it("should use secure: true for port 465", async (): Promise<void> => {
    (appConfiguration as Mock).mockReturnValueOnce({
      smtpConfiguration: {
        host: "smtp.example.com",
        port: 465,
        username: "tests@example.com",
        password: "tests-password",
        from: "noreply@example.com",
      },
    });

    vi.resetModules();
    await vi.importActual<typeof import("#server/utils/nodemailer")>("#server/utils/nodemailer");

    // Ensure, that createTransport is called with secure: true;
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 465,
      secure: true,
      auth: {
        user: "tests@example.com",
        pass: "tests-password",
      },
    });
  });

  it("should successfully verify the transporter configuration", async (): Promise<void> => {
    const mockVerify = vi.fn().mockImplementation((callback: (error: Error | null) => void): void => callback(null));
    (createTransport as Mock).mockReturnValueOnce({ verify: mockVerify });

    vi.resetModules();

    await vi.importActual<typeof import("#server/utils/nodemailer")>("#server/utils/nodemailer");

    expect(mockVerify).toHaveBeenCalledTimes(1);
  });

  it("should throw error, if verify of the transporter configuration fails", async (): Promise<void> => {
    const mockVerify = vi.fn((callback): void => callback(new Error("Verification failed")));
    const originalProcessExit = process.exit;
    const mockProcessExit = vi.fn().mockImplementationOnce((code: number): void => {
      throw new Error(`Process exited with code ${code}`);
    });

    process.exit = mockProcessExit as unknown as (code: number) => never;

    (createTransport as Mock).mockReturnValueOnce({ verify: mockVerify });

    vi.resetModules();
    await expect(async (): Promise<void> => {
      await vi.importActual<typeof import("#server/utils/nodemailer")>("#server/utils/nodemailer");
    }).rejects.toThrow("Process exited with code 1");

    process.exit = originalProcessExit;
  });
});
