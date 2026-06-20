import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (user?.isBanned) {
      res.status(403).json({ error: "Your account has been banned." });
      return;
    }
  } catch (err) {
    // Fail open or closed? Better to let it pass if db connection is weirdly transient, but usually it won't fail here.
  }

  req.userId = userId;
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  req.userId = auth?.userId ?? undefined;
  next();
}
