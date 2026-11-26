import { z } from "zod";

const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const password = z.string().min(12).max(128).regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password,
  organizationName: z.string().trim().min(2).max(120),
  organizationSlug: z.string().trim().toLowerCase().min(3).max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and single hyphens")
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
  organizationSlug: z.string().trim().toLowerCase().min(3).max(48)
});

export const refreshSchema = z.object({}).strict();
