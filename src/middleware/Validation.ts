import joi from "joi";
import type { NextFunction, Request, Response } from "express";
import { ErrorCatch } from "../utils/ErrorCatch.js";

export const LoginValidation = ErrorCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const Login = joi
      .object({
        Email: joi
          .string()
          .email({ tlds: { allow: ["com", "net", "org", "edu"] } })
          .allow(null),
        password: joi.string().required(),
        Phone: joi.string().allow(null),
      })
      .custom((value, helpers) => {
        const { Email, Phone } = value as { Email?: string | null; Phone?: string | null };

        if (!Email && !Phone) {
          return helpers.error("any.custom", {
            message: "Either email or PhoneNumber is required",
          });
        }

        return value;
      })
      .required();

    const { error } = Login.validate(req.body);

    if (error) {
      const errorArray = error.details.map((ele) => ele.message);
      return res.status(400).json({ errors: errorArray });
    }

    next();
  }
);

export const SignUpValidation = ErrorCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const SignUpSchema = joi
      .object({
        Name: joi.string().min(2).max(15).required(),
        Email: joi
          .string()
          .email({ tlds: { allow: ["com", "net", "org", "edu"] } })
          .required(),
        password: joi.string().min(9).required(),
        confirmpassword: joi.string().valid(joi.ref("password")).required(),
        Phone: joi.string().required(),
        role: joi.string().valid("User", "Admin").required(),
      })
      .required();

    const { error } = SignUpSchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorArray = error.details.map((ele) => ele.message);
      return res.status(400).json({ errors: errorArray });
    }

    next();
  }
);
