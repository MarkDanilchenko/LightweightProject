import { z } from "zod";

const userDeactivateSchema = z
  .object({
    confirmationWord: z
      .string()
      .transform((value: string): string => value.toLowerCase())
      .meta({
        description: "Confirmation word",
        example: "deactivate",
        title: "Confirmation word",
      }),
  })
  .meta({
    title: "Deactivate schema",
    description: "Deactivation confirmation word.",
    example: { confirmationWord: "deactivate" },
  });

const userDeleteSchema = z
  .object({
    confirmationWord: z
      .string()
      .transform((value: string): string => value.toLowerCase())
      .meta({ title: "Confirmation word", description: "Confirmation word", example: "delete" }),
  })
  .meta({
    title: "Delete schema",
    description: "Deletion confirmation word.",
    example: { confirmationWord: "delete" },
  });

export { userDeactivateSchema, userDeleteSchema };
