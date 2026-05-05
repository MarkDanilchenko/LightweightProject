import { createZodDto } from "@anatine/zod-nestjs";
import {
  localVerificationEmailSchema,
  localSignInSchema,
  localSignUpSchema,
  localForgotPasswordSchema,
  localResetPasswordSchema,
  deactivateSchema,
  localReactivateRequestSchema,
  localReactivateConfirmSchema,
} from "#server/auth/schemas/auth.schema";

class LocalSignUpDto extends createZodDto(localSignUpSchema) {}

class LocalVerificationEmailDto extends createZodDto(localVerificationEmailSchema) {}

class LocalSignInDto extends createZodDto(localSignInSchema) {}

class LocalPasswordForgotDto extends createZodDto(localForgotPasswordSchema) {}

class LocalPasswordResetDto extends createZodDto(localResetPasswordSchema) {}

class LocalReactivationRequestDto extends createZodDto(localReactivateRequestSchema) {}

class LocalReactivationConfirmDto extends createZodDto(localReactivateConfirmSchema) {}

class DeactivateDto extends createZodDto(deactivateSchema) {}

export {
  LocalSignUpDto,
  LocalSignInDto,
  LocalVerificationEmailDto,
  LocalPasswordForgotDto,
  LocalPasswordResetDto,
  LocalReactivationRequestDto,
  LocalReactivationConfirmDto,
  DeactivateDto,
};
