import axios from "axios";
import {
  getLocalPresetDefinition,
  LocalPresetProviderName,
} from "./localProviderPolicy";

const LOCAL_MODEL_DISCOVERY_TIMEOUT_MS = 5_000;

export interface LocalModelListResponse {
  data?: unknown;
}

export function parseLocalProviderModels(
  payload: unknown,
): string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const data = (payload as LocalModelListResponse).data;
  if (!Array.isArray(data)) {
    return [];
  }

  const models = new Set<string>();
  for (const entry of data) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const id = (entry as { id?: unknown }).id;
    if (typeof id !== "string") {
      continue;
    }
    const normalized = id.trim();
    if (normalized) {
      models.add(normalized);
    }
  }

  return Array.from(models).sort((a, b) =>
    a.localeCompare(b),
  );
}

export async function discoverLocalProviderModels(
  provider: LocalPresetProviderName,
): Promise<string[]> {
  const definition = getLocalPresetDefinition(provider);

  const response = await axios.get(
    definition.modelsEndpoint,
    {
      timeout: LOCAL_MODEL_DISCOVERY_TIMEOUT_MS,
      maxRedirects: 0,
      maxContentLength: 1_000_000,
      headers: {
        Accept: "application/json",
      },
    },
  );

  return parseLocalProviderModels(response.data);
}
