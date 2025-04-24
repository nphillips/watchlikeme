// src/types/auth.ts
export interface AuthUser {
  /** Always the same as your Prisma `User.id` */
  id: string;
  /** The user’s email claim from the JWT */
  email: string;
  /** Your Google-API token pulled from the cookie */
  accessToken: string;
}
