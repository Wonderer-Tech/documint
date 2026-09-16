export interface ModelMetadataLookupIdentity {
  provider: string;
  model: string;
  credentialRevision: number;
  cacheKey: string;
}

export function buildModelMetadataLookupIdentity(
  provider: string,
  model: string,
  credentialRevision: number,
): ModelMetadataLookupIdentity {
  const normalizedProvider = provider.trim().toLowerCase();
  const normalizedModel = model.trim().toLowerCase();
  const normalizedRevision =
    Number.isFinite(credentialRevision) && credentialRevision > 0
      ? Math.floor(credentialRevision)
      : 0;

  return {
    provider: normalizedProvider,
    model: normalizedModel,
    credentialRevision: normalizedRevision,
    cacheKey: `${normalizedProvider}:${normalizedRevision}:${normalizedModel}`,
  };
}
