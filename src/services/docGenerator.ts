import { GENERATION_PROMPT_SCHEMA_VERSION } from "./generationCacheIdentity";
import { DocGeneratorService as BaseDocGeneratorService } from "./docGeneratorBase";

export type {
  DocGeneratorOptions,
  GeneratedOutputPaths,
} from "./docGeneratorBase";

/**
 * Keep the generator's persisted per-entry cache key on the same canonical
 * prompt schema version used by the release-level generation cache identity.
 *
 * DocGeneratorService historically owned a private static prompt version. The
 * class remains unchanged in docGeneratorBase so this compatibility binding is
 * intentionally isolated at the public module boundary and future prompt-schema
 * bumps have one source of truth.
 */
const runtimeGenerator = BaseDocGeneratorService as unknown as {
  PROMPT_VERSION: string;
};
runtimeGenerator.PROMPT_VERSION = GENERATION_PROMPT_SCHEMA_VERSION;

export { BaseDocGeneratorService as DocGeneratorService };
