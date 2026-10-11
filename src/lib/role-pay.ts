// Pay on an event role is optional. Typed as dollars ("25", "25.50"), stored
// as whole cents so there's no floating-point money anywhere.
export function parsePayDollars(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0 || value > 100000) return null;
  return Math.round(value * 100);
}

export function dollarsFromCents(cents: number | null): string {
  if (cents == null) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

// "$25", "$25.50 · per game", or null when the role is unpaid.
export function formatRolePay(payCents: number | null, payNote: string | null): string | null {
  if (payCents == null) return null;
  const amount = payCents % 100 === 0 ? `$${payCents / 100}` : `$${(payCents / 100).toFixed(2)}`;
  const note = payNote?.trim();
  return note ? `${amount} · ${note}` : amount;
}
