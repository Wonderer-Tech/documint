/**
 * Reserve a deterministic byte budget before source HTTP requests.
 * Post-download decoded-size limits remain separately enforced.
 */
export function reserveSourceBytes(entries, budgetBytes) {
  if (!Number.isSafeInteger(budgetBytes) || budgetBytes < 0) {
    throw new RangeError("Invalid source budget");
  }
  const scheduled = [];
  let omitted = 0;
  let remaining = budgetBytes;
  for (const entry of entries) {
    if (!Number.isSafeInteger(entry.size) || entry.size < 0) {
      throw new RangeError("Invalid source size");
    }
    if (entry.size > remaining) {
      omitted++;
      continue;
    }
    scheduled.push(entry);
    remaining -= entry.size;
  }
  return { scheduled, omitted };
}
