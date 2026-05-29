export function parseExpiryToMs(expiry) {
  const match = String(expiry || '15d').match(/^(\d+)([smhd])$/i);
  if (!match) return 15 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2].toLowerCase()];
  return n * unit;
}
