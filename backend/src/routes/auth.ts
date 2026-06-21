import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "@prisma/client";
import prisma from "../prisma";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-this-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "another-super-secret-key-change-this-in-production";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// Helper to format User model to match frontend types
function formatUserResponse(user: User) {
  return {
    id: user.id,
    username: user.username,
    phone_number: user.phone_number,
    phone_country_code: user.phone_country_code,
    phone_verified: user.phone_verified,
    first_name: user.first_name,
    last_name: user.last_name,
    gender: user.gender || null,
    email: user.email || null,
    about_me: user.about_me || null,
    profession: user.profession || null,
    interest: user.interest || null,
    profile_completed: user.profile_completed,
    mfa_enabled: user.mfa_enabled,
    is_active: user.is_active,
    last_login: user.last_login ? user.last_login.toISOString() : null,
    last_active: user.last_active ? user.last_active.toISOString() : null,
    created_at: user.created_at.toISOString(),
    updated_at: user.updated_at.toISOString(),
  };
}

// Generate tokens helper
async function generateAuthTokens(user: User, ip: string | undefined, userAgent: string | undefined) {
  const payload = {
    userId: user.id,
    username: user.username,
    phoneNumber: user.phone_number,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` });

  // Store refresh token in user_sessions
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.userSession.create({
    data: {
      user_id: user.id,
      refresh_token: refreshToken,
      ip_address: ip || null,
      user_agent: userAgent || null,
      expires_at: expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
  };
}

// Signup Route
router.post("/signup", async (req: Request, res: Response) => {
  const { username, phone_number, password, first_name, last_name } = req.body;

  if (!username || !phone_number || !password || !first_name || !last_name) {
    return res.status(400).json({ detail: "Missing required fields." });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { phone_number }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ detail: "User with this username or phone number already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Extract country code from phone number if provided (e.g. +91), default to +91
    let phoneCountryCode = "+91";
    if (phone_number.startsWith("+")) {
      const match = phone_number.match(/^(\+\d{1,4})/);
      if (match) {
        phoneCountryCode = match[1];
      }
    }

    const user = await prisma.user.create({
      data: {
        username,
        phone_number,
        password_hash: passwordHash,
        first_name,
        last_name,
        phone_country_code: phoneCountryCode,
        phone_verified: false, // OTP is required to verify
      },
    });

    return res.status(201).json({
      user_id: user.id,
      username: user.username,
      phone_number: user.phone_number,
      message: "User created. Please verify your phone number.",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ detail: "Internal server error during registration." });
  }
});

// Verify OTP Route
router.post("/verify-otp", async (req: Request, res: Response) => {
  const { phone_number, otp_code } = req.body;

  if (!phone_number || !otp_code) {
    return res.status(400).json({ detail: "Phone number and OTP code are required." });
  }

  // In demo/mock setup, we accept any 6-digit code or specific code "123456"
  if (otp_code.length !== 6) {
    return res.status(400).json({ detail: "OTP code must be 6 digits." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { phone_number },
    });

    if (!user) {
      return res.status(404).json({ detail: "User not found." });
    }

    // Verify user phone
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        phone_verified: true,
        last_login: new Date(),
      },
    });

    const { accessToken, refreshToken } = await generateAuthTokens(
      updatedUser,
      req.ip,
      req.headers["user-agent"]
    );

    return res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 900, // 15 minutes in seconds
      user: formatUserResponse(updatedUser),
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ detail: "Internal server error during verification." });
  }
});

// Resend OTP Route
router.post("/resend-otp", async (req: Request, res: Response) => {
  const { phone_number } = req.body;

  if (!phone_number) {
    return res.status(400).json({ detail: "Phone number is required." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { phone_number },
    });

    if (!user) {
      return res.status(404).json({ detail: "User not found." });
    }

    return res.status(200).json({
      message: "OTP resent",
      phone_number: user.phone_number,
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json({ detail: "Internal server error." });
  }
});

// Login Route
router.post("/login", async (req: Request, res: Response) => {
  const { username, phone_number, password } = req.body;

  if ((!username && !phone_number) || !password) {
    return res.status(400).json({ detail: "Username/phone number and password are required." });
  }

  try {
    // Find by username or phone number
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          username ? { username } : {},
          phone_number ? { phone_number } : {}
        ],
      },
    });

    if (!user) {
      return res.status(401).json({ detail: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ detail: "Invalid credentials." });
    }

    // Check if phone number is verified
    if (!user.phone_verified) {
      return res.status(400).json({ detail: "Phone not verified." });
    }

    // Update login history
    const loggedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        last_login: new Date(),
        last_active: new Date(),
      },
    });

    const { accessToken, refreshToken } = await generateAuthTokens(
      loggedUser,
      req.ip,
      req.headers["user-agent"]
    );

    return res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      expires_in: 900,
      user: formatUserResponse(loggedUser),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ detail: "Internal server error during sign in." });
  }
});

// Refresh Token Route
router.post("/refresh", async (req: Request, res: Response) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ detail: "Refresh token is required." });
  }

  try {
    // Check if session exists in DB
    const session = await prisma.userSession.findFirst({
      where: {
        refresh_token,
        is_revoked: false,
        expires_at: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      return res.status(401).json({ detail: "Refresh token is invalid or expired." });
    }

    // Verify token cryptographically
    const decoded = jwt.verify(refresh_token, JWT_REFRESH_SECRET) as { userId: string };
    if (decoded.userId !== session.user_id) {
      return res.status(401).json({ detail: "Refresh token mismatch." });
    }

    // Issue new access token
    const payload = {
      userId: session.user.id,
      username: session.user.username,
      phoneNumber: session.user.phone_number,
    };
    const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });

    // Update session activity
    await prisma.userSession.update({
      where: { id: session.id },
      data: { last_active_at: new Date() },
    });

    return res.status(200).json({
      access_token: newAccessToken,
      refresh_token, // Return same token
      token_type: "Bearer",
      expires_in: 900,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return res.status(401).json({ detail: "Refresh token verification failed." });
  }
});

// Logout Route
router.post("/logout", async (req: Request, res: Response) => {
  // If authorization header exists, find the user session and delete it
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  try {
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

        // Revoke active sessions for user
        await prisma.userSession.updateMany({
          where: {
            user_id: decoded.userId,
            is_revoked: false,
          },
          data: {
            is_revoked: true,
            revoked_at: new Date(),
          },
        });
      } catch {
        // Token might already be expired, which is fine
      }
    }

    return res.status(200).json({ message: "Logged out" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ detail: "Internal server error during logout." });
  }
});

// Get Current User Profile (authenticated)
router.get("/me", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
    });

    if (!user) {
      return res.status(404).json({ detail: "User not found." });
    }

    // Update active timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { last_active: new Date() },
    });

    return res.status(200).json(formatUserResponse(user));
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({ detail: "Internal server error." });
  }
});

// Update Profile (authenticated)
router.patch("/profile", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { first_name, last_name, gender, email, about_me, profession, interest } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user?.id },
      data: {
        first_name,
        last_name,
        gender,
        email,
        about_me,
        profession,
        interest,
        profile_completed: true, // Complete profile after updating
      },
    });

    return res.status(200).json(formatUserResponse(updatedUser));
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ detail: "Internal server error while updating profile." });
  }
});

// Get Profile Status (authenticated)
router.get("/profile-status", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: {
        profile_completed: true,
        phone_verified: true,
      },
    });

    if (!user) {
      return res.status(404).json({ detail: "User not found." });
    }

    return res.status(200).json({
      profile_completed: user.profile_completed,
      phone_verified: user.phone_verified,
    });
  } catch (error) {
    console.error("Profile status error:", error);
    return res.status(500).json({ detail: "Internal server error." });
  }
});

export default router;
