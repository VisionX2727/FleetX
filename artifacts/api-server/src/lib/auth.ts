import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      authUserId?: string;
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token || !supabaseUrl || !supabaseKey) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }
    const user = await response.json() as { id?: string };
    if (!user.id) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }
    req.authUserId = user.id;
    next();
  } catch {
    res.status(503).json({ error: "Authentication service unavailable" });
  }
}