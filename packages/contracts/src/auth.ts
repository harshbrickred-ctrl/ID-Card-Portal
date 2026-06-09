import { z } from "zod";

export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof LoginSchema>;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRoleType;
};
