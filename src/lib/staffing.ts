import { formatRolePay } from "@/lib/role-pay";

type StaffingInput = {
  maxParticipants: number | null;
  _count: { registrations: number };
  roles: { id: string; name: string; capacity: number; payCents: number | null; payNote: string | null; _count: { registrations: number } }[];
};

export type RoleStaffing = { id: string; name: string; filled: number; capacity: number; open: number; pay: string | null };

export type Staffing = {
  // "roles": the event has roles with a headcount each. "capacity": no roles,
  // but an overall cap. "open": nothing to staff (anyone can just come).
  kind: "roles" | "capacity" | "open";
  fully: boolean;
  /** Spots still needed — summed across roles, or capacity minus signed up. */
  open: number;
  filled: number;
  target: number | null;
  roles: RoleStaffing[];
};

// One definition of "fully staffed" for every screen that shows it (the
// events list, the staffing board), so a green card means the same thing
// everywhere.
export function computeStaffing(e: StaffingInput): Staffing {
  if (e.roles.length > 0) {
    const roles = e.roles.map((r) => ({
      id: r.id,
      name: r.name,
      filled: r._count.registrations,
      capacity: r.capacity,
      open: Math.max(0, r.capacity - r._count.registrations),
      pay: formatRolePay(r.payCents, r.payNote),
    }));
    const open = roles.reduce((sum, r) => sum + r.open, 0);
    return {
      kind: "roles",
      fully: open === 0,
      open,
      filled: roles.reduce((sum, r) => sum + Math.min(r.filled, r.capacity), 0),
      target: roles.reduce((sum, r) => sum + r.capacity, 0),
      roles,
    };
  }
  if (e.maxParticipants != null) {
    const filled = e._count.registrations;
    const open = Math.max(0, e.maxParticipants - filled);
    return { kind: "capacity", fully: open === 0, open, filled, target: e.maxParticipants, roles: [] };
  }
  return { kind: "open", fully: false, open: 0, filled: e._count.registrations, target: null, roles: [] };
}
