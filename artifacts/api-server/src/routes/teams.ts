import { Router } from "express";
import { db, teamsTable, teamMembersTable, usersTable, sessionsTable, teamInvitesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { sendEmail } from "../lib/email.js";
import crypto from "crypto";

const router = Router();

function generateJoinCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// Create a new team
router.post("/teams", requireAuth, async (req, res): Promise<void> => {
  const { name } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "Team name is required" });
    return;
  }

  try {
    const joinCode = generateJoinCode();
    
    // Create team
    const [team] = await db.insert(teamsTable).values({
      name,
      ownerId: req.userId!,
      joinCode,
    }).returning();

    // Add owner as manager
    await db.insert(teamMembersTable).values({
      teamId: team.id,
      userId: req.userId!,
      role: "manager",
    });

    res.json(team);
  } catch (err) {
    req.log.error(err, "Failed to create team");
    res.status(500).json({ error: "Server error" });
  }
});

// Join a team
router.post("/teams/join", requireAuth, async (req, res): Promise<void> => {
  const { joinCode } = req.body;
  if (!joinCode || typeof joinCode !== "string") {
    res.status(400).json({ error: "Join code is required" });
    return;
  }

  try {
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.joinCode, joinCode.toUpperCase()));
    if (!team) {
      res.status(404).json({ error: "Invalid join code" });
      return;
    }

    // Check if already in team
    const [existing] = await db.select()
      .from(teamMembersTable)
      .where(and(eq(teamMembersTable.teamId, team.id), eq(teamMembersTable.userId, req.userId!)));

    if (existing) {
      res.status(400).json({ error: "Already a member of this team" });
      return;
    }

    // Join as rep
    await db.insert(teamMembersTable).values({
      teamId: team.id,
      userId: req.userId!,
      role: "rep",
    });

    res.json({ success: true, team });
  } catch (err) {
    req.log.error(err, "Failed to join team");
    res.status(500).json({ error: "Server error" });
  }
});

// Get my teams and members (if manager)
router.get("/teams/me", requireAuth, async (req, res): Promise<void> => {
  try {
    const myMemberships = await db
      .select({
        teamId: teamMembersTable.teamId,
        role: teamMembersTable.role,
        teamName: teamsTable.name,
        joinCode: teamsTable.joinCode,
      })
      .from(teamMembersTable)
      .innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
      .where(eq(teamMembersTable.userId, req.userId!));

    if (myMemberships.length === 0) {
      res.json({ teams: [] });
      return;
    }

    const currentTeam = myMemberships[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let members: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sessions: any[] = [];

    // If manager, fetch team members and their sessions
    if (currentTeam.role === "manager") {
      const roster = await db
        .select({
          userId: teamMembersTable.userId,
          role: teamMembersTable.role,
          email: usersTable.email,
          createdAt: teamMembersTable.createdAt,
        })
        .from(teamMembersTable)
        .leftJoin(usersTable, eq(teamMembersTable.userId, usersTable.id))
        .where(eq(teamMembersTable.teamId, currentTeam.teamId));

      members = roster;

      const teamSessions = await db
        .select()
        .from(sessionsTable)
        .where(eq(sessionsTable.teamId, currentTeam.teamId))
        .orderBy(desc(sessionsTable.createdAt));
      
      sessions = teamSessions;
    } else {
      // If rep, just fetch their own sessions linked to the team
      const mySessions = await db
        .select()
        .from(sessionsTable)
        .where(and(eq(sessionsTable.teamId, currentTeam.teamId), eq(sessionsTable.userId, req.userId!)))
        .orderBy(desc(sessionsTable.createdAt));
      
      sessions = mySessions;
    }

    res.json({
      team: currentTeam,
      members,
      sessions,
    });
  } catch (err) {
    req.log.error(err, "Failed to fetch teams");
    res.status(500).json({ error: "Server error" });
  }
});

// Invite a member via Email
router.post("/teams/invite-email", requireAuth, async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  try {
    // 1. Verify user is a manager of a team
    const [managerStatus] = await db
      .select({ teamId: teamMembersTable.teamId, teamName: teamsTable.name })
      .from(teamMembersTable)
      .innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
      .where(and(eq(teamMembersTable.userId, req.userId!), eq(teamMembersTable.role, "manager")));

    if (!managerStatus) {
      res.status(403).json({ error: "Only managers can send invites." });
      return;
    }

    // 2. Generate token and save to DB
    const token = crypto.randomBytes(32).toString("hex");
    await db.insert(teamInvitesTable).values({
      teamId: managerStatus.teamId,
      email,
      token,
      role: "rep",
    });

    // 3. Send Email via Ethereal
    // We assume the frontend runs on localhost:5173 or window.location.origin
    const inviteLink = `http://localhost:5173/join/${token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited!</h2>
        <p>You have been invited to join the <strong>${managerStatus.teamName}</strong> workspace on Closing Clarity.</p>
        <p>Click the button below to accept the invitation and access your dashboard:</p>
        <div style="margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #0066FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Join Workspace</a>
        </div>
        <p style="color: #666; font-size: 12px;">If you did not expect this invitation, you can ignore this email.</p>
      </div>
    `;

    const previewUrl = await sendEmail({
      to: email,
      subject: `Invitation to join ${managerStatus.teamName}`,
      html,
    });

    res.json({ success: true, previewUrl });
  } catch (err) {
    req.log.error(err, "Failed to send invite email");
    res.status(500).json({ error: "Server error" });
  }
});

// Join a team via Email Token
router.post("/teams/join-email", requireAuth, async (req, res): Promise<void> => {
  const { token } = req.body;
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Token is required" });
    return;
  }

  try {
    const [invite] = await db
      .select()
      .from(teamInvitesTable)
      .where(and(eq(teamInvitesTable.token, token), eq(teamInvitesTable.status, "pending")));

    if (!invite) {
      res.status(404).json({ error: "Invalid or expired invite token" });
      return;
    }

    // Mark accepted
    await db
      .update(teamInvitesTable)
      .set({ status: "accepted" })
      .where(eq(teamInvitesTable.id, invite.id));

    // Check if already in team
    const [existing] = await db.select()
      .from(teamMembersTable)
      .where(and(eq(teamMembersTable.teamId, invite.teamId), eq(teamMembersTable.userId, req.userId!)));

    if (!existing) {
      // Join as role
      await db.insert(teamMembersTable).values({
        teamId: invite.teamId,
        userId: req.userId!,
        role: invite.role,
      });
    }

    res.json({ success: true, teamId: invite.teamId });
  } catch (err) {
    req.log.error(err, "Failed to join team via email token");
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
