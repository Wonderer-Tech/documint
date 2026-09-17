export function extractProviderHttpStatus(error: unknown): number | undefined {
  const record = getRecord(error);
  const response = getRecord(record?.response);

  for (const candidate of [
    response?.status,
    response?.statusCode,
    record?.status,
    record?.statusCode,
  ]) {
    const status = normalizeHttpStatus(candidate);
    if (status !== undefined) {
      return status;
    }
  }

  return undefined;
}

function normalizeHttpStatus(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 100 && value <= 599
      ? value
      : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!/^\d{3}$/.test(trimmed)) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return parsed >= 100 && parsed <= 599 ? parsed : undefined;
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}
