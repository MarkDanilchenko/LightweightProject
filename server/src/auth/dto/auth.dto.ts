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

class LocalForgotPasswordDto extends createZodDto(localForgotPasswordSchema) {}

class LocalResetPasswordDto extends createZodDto(localResetPasswordSchema) {}

export { LocalSignUpDto, LocalSignInDto, LocalVerificationEmailDto, LocalForgotPasswordDto, LocalResetPasswordDto };
