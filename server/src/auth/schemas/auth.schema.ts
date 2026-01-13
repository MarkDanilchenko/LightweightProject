import { z } from "zod";
import { extendZodWithOpenApi } from "@anatine/zod-openapi";

extendZodWithOpenApi(z);

const localSignUpSchema = z
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
        example: "12345678Aa_",
      }),
  })
  .openapi({
    title: "Sign up schema",
    description: "Sign up credentials for the local authentication.",
    example: {
      username: "johndoe",
      firstName: "John",
      lastName: "Doe",
      email: "johndoe@me.com",
      avatarUrl: "https://example.com/avatar.jpg",
      password: "12345678Aa_",
    },
  });

const localVerificationEmailSchema = z
  .object({
    token: z.string().openapi({ title: "Token", description: "Token.", example: "Token in jwt format" }),
  })
  .openapi({
    title: "Local verification email schema",
    description: "Local verification email with provided token.",
    example: { token: "Token in jwt format" },
  });

const localSignInSchema = z
  .object({
    login: z
      .string()
      .openapi({ title: "Login", description: "Email or username", example: "johndoe or johndoe@me.com" }),
    password: z.string().openapi({ title: "Password", description: "Password", example: "12345678Aa_" }),
  })
  .openapi({
    title: "Sign in schema",
    description: "Sign in credentials for the local authentication.",
    example: { login: "johndoe or johndoe@me.com", password: "12345678Aa_" },
  });

const localForgotPasswordSchema = z
  .object({
    email: localSignUpSchema.shape.email,
  })
  .openapi({
    title: "Local forgot password schema",
    description: "Local forgot password with provided email.",
    example: { email: "johndoe@me.com" },
  });

const localResetPasswordSchema = z
  .object({
    token: z
      .string()
      .openapi({ title: "Token", description: "Token with short ttl (15 minutes).", example: "Token in jwt format" }),
    password: localSignUpSchema.shape.password,
  })
  .openapi({
    title: "Local reset password schema",
    description: "Local reset password with provided token and new password.",
    example: { token: "Token in jwt format", password: "12345678Aa_" },
  });

export {
  localSignInSchema,
  localSignUpSchema,
  localVerificationEmailSchema,
  localForgotPasswordSchema,
  localResetPasswordSchema,
};
