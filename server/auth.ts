import type { Express, Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";
import { SignJWT, jwtVerify } from "jose";
import { storage } from "./storage";
import { CREDIT_VALUES } from "@shared/schema";
import { z } from "zod";

// Stateless auth: a signed JWT in an httpOnly cookie. No server-side session
// store (replaces express-session + connect-pg-simple) so the app is a clean
// fit for stateless serverless functions on Vercel.

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const AUTH_COOKIE = "auth_token";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET must be set. Refusing to start without a JWT signing secret.",
    );
  }
  return new TextEncoder().encode(secret);
}

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

async function signToken(userId: string): Promise<string> {
  return await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions(), maxAge: THIRTY_DAYS_MS });
}

function clearAuthCookie(res: Response): void {
  // clearCookie must be given the same options (minus maxAge) it was set with.
  res.clearCookie(AUTH_COOKIE, cookieOptions());
}

/**
 * Verify the auth cookie and return the userId, or null. Never throws.
 * Exported because it is needed outside the isAuthenticated middleware:
 * GET /api/auth/user is not behind the middleware, and the Vercel Blob
 * upload-token route must authenticate without relying on req.userId.
 */
export async function readUserId(req: Request): Promise<string | null> {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token || typeof token !== "string") return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

export function setupAuth(app: Express): void {
  // Fail fast if the signing secret is missing.
  getSecretKey();
  // Trust Vercel's TLS-terminating proxy so req.secure (and thus the "secure"
  // cookie flag decision) and req.ip reflect the real client connection.
  app.set("trust proxy", 1);
  app.use(cookieParser());
}

export async function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Express 4 does not await async middleware, so any rejection would become an
  // unhandledRejection with no response. readUserId never throws today, but the
  // try/catch keeps this robust against future changes.
  try {
    const userId = await readUserId(req);
    if (userId) {
      req.userId = userId;
      next();
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  } catch (err) {
    next(err);
  }
}

export function getUserId(req: Request): string {
  return req.userId || "";
}

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parseResult = registerSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.errors[0]?.message || "Invalid request",
        });
      }

      const { email, password, firstName, lastName } = parseResult.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser(email, passwordHash, firstName, lastName);

      await storage.createCreditTransaction({
        userId: user.id,
        amount: CREDIT_VALUES.SIGNUP_BONUS,
        type: "signup_bonus",
        description: "Welcome bonus for joining Inspectly!",
      });

      const token = await signToken(user.id);
      setAuthCookie(res, token);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        message: "Registration successful",
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: parseResult.error.errors[0]?.message || "Invalid request",
        });
      }

      const { email, password } = parseResult.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = await signToken(user.id);
      setAuthCookie(res, token);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        message: "Login successful",
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    clearAuthCookie(res);
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/auth/user", async (req: Request, res: Response) => {
    const userId = await readUserId(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = await storage.getUserById(userId);
      if (!user) {
        clearAuthCookie(res);
        return res.status(401).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });
}
