import { z } from "zod";
import {
  localEmailVerificationSchema,
  localSignInSchema,
  localSignUpSchema,
  localPasswordResetRequestSchema,
  localPasswordResetConfirmSchema,
  localReactivationConfirmSchema,
  localRestorationConfirmSchema,
} from "#server/auth/schemas/auth.schema";

type LocalSignUpDto = z.infer<typeof localSignUpSchema>;
type LocalSignInDto = z.infer<typeof localSignInSchema>;
type LocalEmailVerificationDto = z.infer<typeof localEmailVerificationSchema>;
type LocalPasswordResetRequestDto = z.infer<typeof localPasswordResetRequestSchema>;
type LocalPasswordResetConfirmDto = z.infer<typeof localPasswordResetConfirmSchema>;
type LocalReactivationConfirmDto = z.infer<typeof localReactivationConfirmSchema>;
type LocalRestorationConfirmDto = z.infer<typeof localRestorationConfirmSchema>;

export {
  LocalSignUpDto,
  LocalSignInDto,
  LocalEmailVerificationDto,
  LocalPasswordResetRequestDto,
  LocalPasswordResetConfirmDto,
  LocalReactivationConfirmDto,
  LocalRestorationConfirmDto,
};
