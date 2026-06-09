import type { User } from "../../DB/Users/User.model.js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      id?: string;
    }
  }
}

export {};
