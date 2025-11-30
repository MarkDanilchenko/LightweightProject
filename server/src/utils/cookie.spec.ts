import { Response } from "express";
import { setCookie, clearCookie } from "./cookie";

describe("Cookie Utility", (): void => {
  afterAll((): void => {
    jest.restoreAllMocks();
  });

  describe("setCookie", (): void => {
    let mockResponse: Partial<Response>;
    let mockCookie: jest.Mock;

    beforeEach((): void => {
      mockCookie = jest.fn();

      mockResponse = {
        cookie: mockCookie,
      };
    });

    afterEach((): void => {
      jest.clearAllMocks();
    });

    it("should set a cookie with default options", (): void => {
      const cookieName = "test-cookie";
      const cookieValue = "test-value";

      setCookie(mockResponse as Response, cookieName, cookieValue);

      expect(mockCookie).toHaveBeenCalledWith(cookieName, cookieValue, {
        httpOnly: true,
        sameSite: "lax",
        signed: true,
        secure: true,
      });
    });

    it("should set a cookie with custom secure option", (): void => {
      const cookieName = "test-cookie";
      const cookieValue = "test-value";
      const secure = false;

      setCookie(mockResponse as Response, cookieName, cookieValue, secure);

      expect(mockCookie).toHaveBeenCalledWith(cookieName, cookieValue, {
        httpOnly: true,
        sameSite: "lax",
        signed: true,
        secure,
      });
    });

    it("should handle different value types", (): void => {
      const testCases: { value: any; type: string }[] = [
        { value: "string", type: "string" },
        { value: 123, type: "number" },
        { value: true, type: "boolean" },
        { value: { key: "value" }, type: "object" },
        { value: [1, 2, 3], type: "array" },
        { value: null, type: "null" },
      ];

      testCases.forEach(({ value, type }): void => {
        setCookie(mockResponse as Response, `test-${type}`, value);
        expect(mockCookie).toHaveBeenCalledWith(`test-${type}`, value, expect.any(Object));
      });
    });
  });

  describe("clearCookie", (): void => {
    let mockResponse: Partial<Response>;
    let mockClearCookie: jest.Mock;

    beforeEach((): void => {
      mockClearCookie = jest.fn();

      mockResponse = {
        clearCookie: mockClearCookie,
      };
    });

    afterEach((): void => {
      jest.clearAllMocks();
    });

    it("should clear a cookie", (): void => {
      const cookieName = "test-cookie";

      clearCookie(mockResponse as Response, cookieName);

      expect(mockClearCookie).toHaveBeenCalledWith(cookieName);
    });

    it("should handle different cookie names", (): void => {
      const cookieNames: string[] = ["session", "auth-token", "user-prefs", "kCQbZZdz2Ny"];

      cookieNames.forEach((name: string): void => {
        clearCookie(mockResponse as Response, name);
        expect(mockClearCookie).toHaveBeenCalledWith(name);
      });
    });
  });
});
