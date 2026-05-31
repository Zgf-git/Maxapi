import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(2).max(80).optional()
});

export type AuthInput = z.infer<typeof authSchema>;
