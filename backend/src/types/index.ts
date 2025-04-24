import { Request } from "express";
import { ParamsDictionary } from "express-serve-static-core";

export interface User {
  id: string;
  email: string;
  username: string;
  name: string | null;
  googleId: string | null;
  password: string | null;
  image: string | null;
  role: "USER" | "ADMIN";
  createdAt: Date;
}

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      username: string;
      name: string | null;
      googleId: string | null;
      password: string | null;
      image: string | null;
      role: "USER" | "ADMIN";
      createdAt: Date;
    }
  }
}

export interface AuthRequest extends Request<ParamsDictionary, any, any, any> {
  user?: User;
}
