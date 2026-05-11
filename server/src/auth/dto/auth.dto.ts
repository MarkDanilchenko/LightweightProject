import { createZodDto } from "@anatine/zod-nestjs";
import {
  localEmailVerificationSchema,
  localSignInSchema,
  localSignUpSchema,
  localPasswordResetRequestSchema,
  localPasswordResetConfirmSchema,
  userDeactivateSchema,
  localReactivateConfirmSchema,
  userDeleteSchema,
} from "#server/auth/schemas/auth.schema";

class LocalSignUpDto extends createZodDto(localSignUpSchema) {}

class LocalEmailVerificationDto extends createZodDto(localEmailVerificationSchema) {}

class LocalSignInDto extends createZodDto(localSignInSchema) {}

class LocalPasswordResetRequestDto extends createZodDto(localPasswordResetRequestSchema) {}

class LocalPasswordResetConfirmDto extends createZodDto(localPasswordResetConfirmSchema) {}

class LocalReactivationConfirmDto extends createZodDto(localReactivateConfirmSchema) {}

class UserDeactivateDto extends createZodDto(userDeactivateSchema) {}

class UserDeleteDto extends createZodDto(userDeleteSchema) {}

export {
  LocalSignUpDto,
  LocalSignInDto,
  LocalEmailVerificationDto,
  LocalPasswordResetRequestDto,
  LocalPasswordResetConfirmDto,
  LocalReactivationConfirmDto,
  UserDeactivateDto,
  UserDeleteDto,
};
