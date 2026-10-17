import { z } from "zod";
import { userDeactivateSchema, userDeleteSchema } from "#server/users/schemas/users.schemas";

type UserDeactivateDto = z.infer<typeof userDeactivateSchema>;
type UserDeleteDto = z.infer<typeof userDeleteSchema>;

export { UserDeactivateDto, UserDeleteDto };
