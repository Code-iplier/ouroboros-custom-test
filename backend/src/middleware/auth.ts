import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../prisma";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    phone_number: string;
  };
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ detail: "Authentication credentials were not provided." });
  }

  try {
    const secret = process.env.JWT_SECRET || "super-secret-key-change-this-in-production";
    const decoded = jwt.verify(token, secret) as {
      userId: string;
      username: string;
      phoneNumber: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        phone_number: true,
        is_active: true,
      },
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ detail: "User is inactive or deleted." });
    }

    req.user = {
      id: user.id,
      username: user.username,
      phone_number: user.phone_number,
    };
    
    next();
  } catch {
    return res.status(401).json({ detail: "Given token not valid for any token type" });
  }
}
