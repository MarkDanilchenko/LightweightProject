import { createZodDto } from "@anatine/zod-nestjs";
import {
  localEmailVerificationSchema,
  localSignInSchema,
  localSignUpSchema,
  localPasswordResetRequestSchema,
  localPasswordResetConfirmSchema,
  deactivateSchema,
  localReactivateConfirmSchema,
} from "#server/auth/schemas/auth.schema";

class LocalSignUpDto extends createZodDto(localSignUpSchema) {}

class LocalEmailVerificationDto extends createZodDto(localEmailVerificationSchema) {}

class LocalSignInDto extends createZodDto(localSignInSchema) {}

class LocalPasswordResetRequestDto extends createZodDto(localPasswordResetRequestSchema) {}

class LocalPasswordResetConfirmDto extends createZodDto(localPasswordResetConfirmSchema) {}

class LocalReactivationConfirmDto extends createZodDto(localReactivateConfirmSchema) {}

class DeactivateDto extends createZodDto(deactivateSchema) {}

export {
  LocalSignUpDto,
  LocalSignInDto,
  LocalEmailVerificationDto,
  LocalPasswordResetRequestDto,
  LocalPasswordResetConfirmDto,
  LocalReactivationConfirmDto,
  DeactivateDto,
};
