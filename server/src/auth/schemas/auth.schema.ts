import { z } from "zod";

const localSignUpSchema = z
  .object({
    username: z.string().min(3).max(64).meta({
      title: "Username",
      description: "Username",
      example: "johndoe",
    }),
    firstName: z.string().optional().meta({
      title: "First name",
      description: "First name",
      example: "John",
    }),
    lastName: z.string().optional().meta({
      title: "Last name",
      description: "Last name",
      example: "Doe",
    }),
    email: z.email().meta({
      title: "Email",
      description: "Email",
      example: "johndoe@me.com",
    }),
    avatarUrl: z.url().optional().meta({
      title: "Avatar URL",
      description: "Avatar URL",
      example: "https://example.com/avatar.jpg",
    }),
    password: z
      .string()
      .min(8)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/)
      .meta({
        title: "Password",
        description: `Password must contain at least one uppercase letter, one lowercase letter, one digit
        and be at least 8 characters long.`,
        example: "12345678Aa",
      }),
  })
  .meta({
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

const localEmailVerificationSchema = z
  .object({
    token: z.string().meta({ title: "Token", description: "Token.", example: "Token in jwt format" }),
  })
  .meta({
    title: "Local verification email schema",
    description: "Local verification email with provided token.",
    example: { token: "Token in jwt format" },
  });

const localSignInSchema = z
  .object({
    login: z.string().meta({ title: "Login", description: "Email or username", example: "johndoe or johndoe@me.com" }),
    password: z.string().meta({ title: "Password", description: "Password", example: "12345678Aa_" }),
  })
  .meta({
    title: "Sign in schema",
    description: "Sign in credentials for the local authentication.",
    example: { login: "johndoe or johndoe@me.com", password: "12345678Aa_" },
  });

const localPasswordResetRequestSchema = z
  .object({
    email: localSignUpSchema.shape.email,
  })
  .meta({
    title: "Local forgot password schema",
    description: "Local forgot password with provided email.",
    example: { email: "johndoe@me.com" },
  });

const localPasswordResetConfirmSchema = z
  .object({
    token: z
      .string()
      .meta({ title: "Token", description: "Token with short ttl (15 minutes).", example: "Token in jwt format" }),
    password: localSignUpSchema.shape.password,
  })
  .meta({
    title: "Local reset password schema",
    description: "Local reset password with provided token and new password.",
    example: { token: "Token in jwt format", password: "12345678Aa_" },
  });

const localReactivationConfirmSchema = z
  .object({
    token: z
      .string()
      .meta({ title: "Token", description: "Token with short ttl (15 minutes).", example: "Token in jwt format" }),
  })
  .meta({
    title: "Local reactivation confirm schema",
    description: "Local reactivation confirm with provided token.",
    example: { token: "Token in jwt format" },
  });

const localRestorationConfirmSchema = z
  .object({
    token: z
      .string()
      .meta({ title: "Token", description: "Token with short ttl (15 minutes).", example: "Token in jwt format" }),
  })
  .meta({
    title: "Local restoration confirm schema",
    description: "Local restoration confirm with provided token.",
    example: { token: "Token in jwt format" },
  });

export {
  localSignInSchema,
  localSignUpSchema,
  localEmailVerificationSchema,
  localPasswordResetRequestSchema,
  localPasswordResetConfirmSchema,
  localReactivationConfirmSchema,
  localRestorationConfirmSchema,
};
