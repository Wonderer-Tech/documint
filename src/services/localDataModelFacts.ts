import type { WorkspaceFile } from "../types";
import { normalizeProjectPath } from "./structuralModule";

export type LocalDataModelFormat =
  | "Prisma"
  | "SQL"
  | "GraphQL"
  | "OpenAPI"
  | "Mongoose"
  | "Drizzle";

export interface LocalDataModelEntity {
  name: string;
  kind: string;
  fields: string[];
}

export interface LocalDataModelSource {
  path: string;
  format: LocalDataModelFormat;
  entities: LocalDataModelEntity[];
}

export interface LocalDataModelFacts {
  sources: LocalDataModelSource[];
  entityCount: number;
}

export function extractLocalDataModelFacts(
  files: WorkspaceFile[],
): LocalDataModelFacts | undefined {
  const sources: LocalDataModelSource[] = [];

  for (const file of files) {
    const path = normalizeProjectPath(file.path);
    const lower = path.toLowerCase();
    const content = file.content;

    const candidates: Array<LocalDataModelSource | undefined> = [];

    if (lower.endsWith(".prisma")) {
      candidates.push(source(path, "Prisma", parseNamedBlocks(content, /\b(model|enum)\s+([A-Za-z_]\w*)\s*\{/g)));
    }
    if (lower.endsWith(".sql")) {
      candidates.push(source(path, "SQL", parseSqlTables(content)));
    }
    if (lower.endsWith(".graphql") || lower.endsWith(".gql")) {
      candidates.push(source(path, "GraphQL", parseNamedBlocks(content, /\b(type|input|interface|enum)\s+([A-Za-z_]\w*)[^\{]*\{/g)));
    }
    if (lower.endsWith(".json") || lower.endsWith(".yaml") || lower.endsWith(".yml")) {
      candidates.push(source(path, "OpenAPI", parseOpenApi(content, lower)));
    }
    if (/\.(?:ts|tsx|js|jsx|mts|cts|mjs|cjs)$/.test(lower)) {
      candidates.push(source(path, "Mongoose", parseMongoose(content)));
      candidates.push(source(path, "Drizzle", parseDrizzle(content)));
    }

    for (const candidate of candidates) {
      if (candidate && candidate.entities.length) {
        sources.push(candidate);
      }
    }
  }

  const unique = dedupeSources(sources);
  if (!unique.length) return undefined;

  return {
    sources: unique,
    entityCount: unique.reduce((sum, item) => sum + item.entities.length, 0),
  };
}

function source(
  path: string,
  format: LocalDataModelFormat,
  entities: LocalDataModelEntity[],
): LocalDataModelSource | undefined {
  return entities.length ? { path, format, entities } : undefined;
}

function parseNamedBlocks(
  content: string,
  pattern: RegExp,
): LocalDataModelEntity[] {
  const entities: LocalDataModelEntity[] = [];
  for (const match of content.matchAll(pattern)) {
    const openBrace = content.indexOf("{", match.index ?? 0);
    if (openBrace < 0) continue;
    const block = balancedBlock(content, openBrace);
    if (!block) continue;
    const kind = String(match[1] || "type");
    const name = String(match[2] || "").trim();
    if (!name) continue;
    entities.push({
      name,
      kind,
      fields: parseBlockFields(block.body, kind === "enum"),
    });
  }
  return dedupeEntities(entities);
}

function parseSqlTables(content: string): LocalDataModelEntity[] {
  const entities: LocalDataModelEntity[] = [];
  const pattern =
    /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["`]?([A-Za-z_]\w*)["`]?\.)?["`]?([A-Za-z_]\w*)["`]?\s*\(/gi;

  for (const match of content.matchAll(pattern)) {
    const openParen = content.indexOf("(", match.index ?? 0);
    if (openParen < 0) continue;
    const block = balancedDelimited(content, openParen, "(", ")");
    if (!block) continue;
    const name = [match[1], match[2]].filter(Boolean).join(".");
    const fields = splitTopLevel(block.body, ",")
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => !/^(?:CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE\b|CHECK\b|INDEX\b|KEY\b)/i.test(part))
      .map((part) => {
        const field = part.match(/^(?:"([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([A-Za-z_]\w*))/);
        return field ? field[1] || field[2] || field[3] || field[4] : "";
      })
      .filter(Boolean);
    if (name) entities.push({ name, kind: "table", fields: unique(fields) });
  }
  return dedupeEntities(entities);
}

function parseOpenApi(
  content: string,
  lowerPath: string,
): LocalDataModelEntity[] {
  if (lowerPath.endsWith(".json")) {
    try {
      const value = JSON.parse(content);
      if (!value || typeof value !== "object" || (!value.openapi && !value.swagger)) {
        return [];
      }
      const schemas = value.components?.schemas;
      if (!schemas || typeof schemas !== "object") return [];
      return Object.entries(schemas).map(([name, schema]: [string, any]) => ({
        name,
        kind: "schema",
        fields:
          schema && typeof schema.properties === "object"
            ? Object.keys(schema.properties).sort()
            : [],
      }));
    } catch {
      return [];
    }
  }

  if (!/^\s*(?:openapi|swagger)\s*:/m.test(content)) return [];
  const lines = content.split(/\r?\n/);
  let componentsIndent = -1;
  let schemasIndent = -1;
  let current: LocalDataModelEntity | undefined;
  const entities: LocalDataModelEntity[] = [];
  let propertiesIndent = -1;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const indent = raw.length - raw.trimStart().length;

    if (/^components\s*:\s*$/.test(trimmed)) {
      componentsIndent = indent;
      schemasIndent = -1;
      continue;
    }
    if (componentsIndent >= 0 && indent > componentsIndent && /^schemas\s*:\s*$/.test(trimmed)) {
      schemasIndent = indent;
      continue;
    }
    if (schemasIndent < 0) continue;
    if (indent <= schemasIndent) break;

    const schemaMatch = trimmed.match(/^([A-Za-z_][\w.-]*)\s*:\s*$/);
    if (schemaMatch && indent === schemasIndent + 2) {
      current = { name: schemaMatch[1], kind: "schema", fields: [] };
      entities.push(current);
      propertiesIndent = -1;
      continue;
    }
    if (!current) continue;
    if (/^properties\s*:\s*$/.test(trimmed)) {
      propertiesIndent = indent;
      continue;
    }
    if (propertiesIndent >= 0 && indent > propertiesIndent) {
      const field = trimmed.match(/^([A-Za-z_][\w.-]*)\s*:/);
      if (field && indent === propertiesIndent + 2) current.fields.push(field[1]);
    }
  }

  return dedupeEntities(entities);
}

function parseMongoose(content: string): LocalDataModelEntity[] {
  const schemas = new Map<string, string[]>();
  const declaration =
    /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*new\s+(?:mongoose\.)?Schema\s*\(\s*\{/g;

  for (const match of content.matchAll(declaration)) {
    const openBrace = content.indexOf("{", match.index ?? 0);
    const block = openBrace >= 0 ? balancedBlock(content, openBrace) : undefined;
    if (!block) continue;
    schemas.set(match[1], parseObjectKeys(block.body));
  }

  const entities: LocalDataModelEntity[] = [];
  const modelPattern =
    /(?:mongoose\.)?model\s*\(\s*["']([^"']+)["']\s*(?:,\s*([A-Za-z_$][\w$]*))?/g;
  for (const match of content.matchAll(modelPattern)) {
    entities.push({
      name: match[1],
      kind: "model",
      fields: match[2] ? schemas.get(match[2]) ?? [] : [],
    });
  }

  if (!entities.length) {
    for (const [name, fields] of schemas) {
      entities.push({ name, kind: "schema", fields });
    }
  }
  return dedupeEntities(entities);
}

function parseDrizzle(content: string): LocalDataModelEntity[] {
  const entities: LocalDataModelEntity[] = [];
  const pattern =
    /\b(?:pgTable|mysqlTable|sqliteTable)\s*\(\s*["']([^"']+)["']\s*,\s*\{/g;
  for (const match of content.matchAll(pattern)) {
    const openBrace = content.indexOf("{", match.index ?? 0);
    const block = openBrace >= 0 ? balancedBlock(content, openBrace) : undefined;
    if (!block) continue;
    entities.push({
      name: match[1],
      kind: "table",
      fields: parseObjectKeys(block.body),
    });
  }
  return dedupeEntities(entities);
}

function parseBlockFields(body: string, enumMode = false): string[] {
  const fields: string[] = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("#") || line.startsWith("@@")) continue;
    if (enumMode) {
      const value = line.match(/^([A-Za-z_]\w*)\b/);
      if (value) fields.push(value[1]);
      continue;
    }
    const field = line.match(/^([A-Za-z_]\w*)\s+/);
    if (field) fields.push(field[1]);
  }
  return unique(fields);
}

function parseObjectKeys(body: string): string[] {
  const fields: string[] = [];
  let depth = 0;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) {
      depth += braceDelta(raw);
      continue;
    }
    if (depth === 0) {
      const match = line.match(/^(?:["']([^"']+)["']|([A-Za-z_$][\w$]*))\s*:/);
      if (match) fields.push(match[1] || match[2]);
    }
    depth += braceDelta(raw);
  }
  return unique(fields);
}

function balancedBlock(
  content: string,
  openIndex: number,
): { body: string; end: number } | undefined {
  return balancedDelimited(content, openIndex, "{", "}");
}

function balancedDelimited(
  content: string,
  openIndex: number,
  open: string,
  close: string,
): { body: string; end: number } | undefined {
  let depth = 0;
  let quote: string | undefined;
  let escaped = false;
  for (let index = openIndex; index < content.length; index++) {
    const char = content[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote) {
      if (char === "\\") escaped = true;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === open) depth++;
    else if (char === close) {
      depth--;
      if (depth === 0) {
        return {
          body: content.slice(openIndex + 1, index),
          end: index,
        };
      }
    }
  }
  return undefined;
}

function splitTopLevel(value: string, separator: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let paren = 0;
  let brace = 0;
  let quote: string | undefined;
  let escaped = false;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote) {
      if (char === "\\") escaped = true;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") paren++;
    else if (char === ")") paren--;
    else if (char === "{") brace++;
    else if (char === "}") brace--;
    else if (char === separator && paren === 0 && brace === 0) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

function braceDelta(value: string): number {
  let delta = 0;
  for (const char of value) {
    if (char === "{") delta++;
    else if (char === "}") delta--;
  }
  return delta;
}

function dedupeSources(sources: LocalDataModelSource[]): LocalDataModelSource[] {
  const seen = new Set<string>();
  return sources.filter((item) => {
    const key = item.path + "\0" + item.format;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.path.localeCompare(b.path) || a.format.localeCompare(b.format));
}

function dedupeEntities(
  entities: LocalDataModelEntity[],
): LocalDataModelEntity[] {
  const map = new Map<string, LocalDataModelEntity>();
  for (const entity of entities) {
    const key = entity.kind + "\0" + entity.name;
    const current = map.get(key);
    if (!current) {
      map.set(key, { ...entity, fields: unique(entity.fields) });
    } else {
      current.fields = unique([...current.fields, ...entity.fields]);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name) || a.kind.localeCompare(b.kind)
  );
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}
