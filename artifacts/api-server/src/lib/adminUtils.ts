const rawAdminEmails = process.env.ADMIN_EMAILS ?? "";

const adminEmails: Set<string> = new Set(
  rawAdminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails.has(email.trim().toLowerCase());
}
