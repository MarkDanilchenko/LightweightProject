import { z } from "zod";
import { extendZodWithOpenApi } from "@anatine/zod-openapi";

extendZodWithOpenApi(z);

const signUpLocalSchema = z
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
        description: `Password must contain at least one uppercase letter, one lowercase letter, one digit
        and be at least 8 characters long.`,
        example: "********",
      }),
  })
  .openapi({
    title: "Sign up schema",
    description: `Sign up with local authentication strategy.
      Password must contain at least one uppercase letter, one lowercase letter, one digit
      and be at least 8 characters long.`,
    example: {
      username: "johndoe",
      firstName: "John",
      lastName: "Doe",
      email: "johndoe@me.com",
      avatarUrl: "https://example.com/avatar.jpg",
      password: "********",
    },
  });

const signInLocalSchema = z
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

const profileSchema = z
  .object({
    id: z
      .string()
      .uuid()
      .openapi({ title: "User ID", description: "User ID", example: "123e4567-e89b-12d3-a456-426655440000" }),
    username: z.string().openapi({ title: "Username", description: "Username", example: "johndoe" }),
    firstName: z.string().optional().openapi({ title: "First name", description: "First name", example: "John" }),
    lastName: z.string().optional().openapi({ title: "Last name", description: "Last name", example: "Doe" }),
    email: z.string().email().openapi({ title: "Email", description: "Email", example: "johndoe@me.com" }),
    avatarUrl: z.string().url().optional().openapi({
      title: "Avatar URL",
      description: "Avatar URL",
      example: "https://example.com/avatar.jpg",
    }),
    createdAt: z
      .date()
      .openapi({ title: "Created at", description: "Created at", example: "2022-01-01T00:00:00.000Z" }),
    updatedAt: z
      .date()
      .openapi({ title: "Updated at", description: "Updated at", example: "2022-01-01T00:00:00.000Z" }),
    authentications: z.array(
      z.object({
        id: z.string().uuid().openapi({
          title: "Authentication ID",
          description: "Authentication ID",
          example: "123e4567-e89b-12d3-a456-426655440000",
        }),
        provider: z.string().openapi({ title: "Provider", description: "Provider", example: "local" }),
        lastAccessedAt: z
          .date()
          .openapi({ title: "Last accessed at", description: "Last accessed at", example: "2022-01-01T00:00:00.000Z" }),
      }),
    ),
  })
  .openapi({
    title: "Profile schema",
    description: "User's profile",
    example: {
      id: "123e4567-e89b-12d3-a456-426655440000",
      username: "johndoe",
      firstName: "John",
      lastName: "Doe",
      email: "johndoe@me.com",
      avatarUrl: "https://example.com/avatar.jpg",
      createdAt: "2022-01-01T00:00:00.000Z",
      updatedAt: "2022-01-01T00:00:00.000Z",
      authentications: [
        {
          id: "123e4567-e89b-12d3-a456-426655440000",
          provider: "local",
          lastAccessedAt: "2022-01-01T00:00:00.000Z",
        },
      ],
    },
  });

export { signInLocalSchema, profileSchema, signUpLocalSchema };
