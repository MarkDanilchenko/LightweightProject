import { z } from "zod";
import { extendZodWithOpenApi } from "@anatine/zod-openapi";

extendZodWithOpenApi(z);

export const signInLocalSchema = z
  .object({
    login: z.string().openapi({ title: "Login", description: "Email or username", example: "johndoe" }),
    password: z
      .string()
      .describe("Password")
      .openapi({ title: "Password", description: "Password", example: "12345678Aa_" }),
  })
  .openapi({
    title: "Sign in schema",
    description: "Sign in with local strategy",
    example: { login: "johndoe", password: "password" },
  });

export const signUpLocalSchema = z
  .object({
    username: z.string().min(3).max(64).openapi({
      title: "Username",
      description: "Username",
      example: "johndoe",
    }),
    firstName: z.string().optional().openapi({
      title: "First name",
      description: "First name",
      example: "John",
    }),
    lastName: z.string().optional().openapi({
      title: "Last name",
      description: "Last name",
      example: "Doe",
    }),
    email: z.string().email().openapi({
      title: "Email",
      description: "Email",
      example: "johndoe@me.com",
    }),
    avatarUrl: z.string().url().optional().openapi({
      title: "Avatar URL",
      description: "Avatar URL",
      example: "https://example.com/avatar.jpg",
    }),
    password: z
      .string()
      .min(8)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/)
      .openapi({
        title: "Password",
        description: "Password",
        example: "12345678Aa_",
      }),
  })
  .openapi({
    title: "Sign up schema",
    description: "Sign up with local strategy",
    example: {
      username: "johndoe",
      firstName: "John",
      lastName: "Doe",
      email: "johndoe@me.com",
      avatarUrl: "https://example.com/avatar.jpg",
      password: "12345678Aa_",
    },
  });
