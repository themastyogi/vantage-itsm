import type { Role } from "./auth";

// ---------- Incident workflow ----------
export type IncidentStatus =
  | "new"
  | "acknowledged"
  | "in_progress"
  | "resolved"
  | "closed";

const INCIDENT_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  new: ["acknowledged"],
  acknowledged: ["in_progress"],
  in_progress: ["resolved"],
  resolved: ["closed", "in_progress"], // reopen if the fix didn't hold
  closed: [],
};

const INCIDENT_TRANSITION_ROLES: Role[] = ["agent", "admin"];

export function canTransitionIncident(
  from: IncidentStatus,
  to: IncidentStatus,
  role: Role
): { ok: boolean; reason?: string } {
  if (!INCIDENT_TRANSITION_ROLES.includes(role) && role !== "admin") {
    return { ok: false, reason: "Only agents or admins can change incident status." };
  }
  if (!INCIDENT_TRANSITIONS[from]?.includes(to)) {
    return { ok: false, reason: `Cannot move an incident from "${from}" to "${to}".` };
  }
  return { ok: true };
}

// ---------- Change workflow (requires approval before implementation) ----------
export type ChangeStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "scheduled"
  | "implemented"
  | "closed";

const CHANGE_TRANSITIONS: Record<ChangeStatus, ChangeStatus[]> = {
  draft: ["pending_approval"],
  pending_approval: ["approved", "rejected"],
  approved: ["scheduled"],
  rejected: ["draft"],
  scheduled: ["implemented"],
  implemented: ["closed"],
  closed: [],
};

// Who is allowed to *initiate* each transition
const CHANGE_TRANSITION_ROLES: Record<string, Role[]> = {
  "draft->pending_approval": ["requester", "agent", "admin"],
  "pending_approval->approved": ["approver", "admin"],
  "pending_approval->rejected": ["approver", "admin"],
  "rejected->draft": ["requester", "agent", "admin"],
  "approved->scheduled": ["agent", "admin"],
  "scheduled->implemented": ["agent", "admin"],
  "implemented->closed": ["agent", "admin"],
};

export function canTransitionChange(
  from: ChangeStatus,
  to: ChangeStatus,
  role: Role
): { ok: boolean; reason?: string } {
  if (!CHANGE_TRANSITIONS[from]?.includes(to)) {
    return { ok: false, reason: `Cannot move a change from "${from}" to "${to}".` };
  }
  const key = `${from}->${to}`;
  const allowedRoles = CHANGE_TRANSITION_ROLES[key] || [];
  if (!allowedRoles.includes(role)) {
    return {
      ok: false,
      reason: `Role "${role}" is not permitted to move a change from "${from}" to "${to}".`,
    };
  }
  return { ok: true };
}

/** High-risk changes always require an explicit approval record, even by an admin. */
export function requiresApprovalRecord(riskLevel: "low" | "medium" | "high") {
  return riskLevel === "medium" || riskLevel === "high";
}
