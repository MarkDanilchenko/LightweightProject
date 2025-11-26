import { createZodDto } from "@anatine/zod-nestjs";
import {
  localVerificationEmailSchema,
  localSignInSchema,
  localSignUpSchema,
  localForgotPasswordSchema,
  localResetPasswordSchema,
} from "@server/auth/schemas/auth.schema";

class LocalSignUpDto extends createZodDto(localSignUpSchema) {}

class LocalVerificationEmailDto extends createZodDto(localVerificationEmailSchema) {}

class LocalSignInDto extends createZodDto(localSignInSchema) {}

class LocalPasswordForgotDto extends createZodDto(localForgotPasswordSchema) {}

class LocalPasswordResetDto extends createZodDto(localResetPasswordSchema) {}

export { LocalSignUpDto, LocalSignInDto, LocalVerificationEmailDto, LocalPasswordForgotDto, LocalPasswordResetDto };
