import test from "node:test";
import assert from "node:assert/strict";
import { extractLocalDataModelFacts } from "../src/services/localDataModelFacts";
import type { WorkspaceFile } from "../src/types";

function file(path: string, language: string, content: string): WorkspaceFile {
  return { path, language, content };
}

test("data model facts detect Prisma, SQL and GraphQL declarations", () => {
  const facts = extractLocalDataModelFacts([
    file(
      "prisma/schema.prisma",
      "prisma",
      [
        "model User {",
        "  id Int @id",
        "  email String @unique",
        "}",
        "enum Role {",
        "  ADMIN",
        "  USER",
        "}",
      ].join("\n"),
    ),
    file(
      "db/schema.sql",
      "sql",
      [
        "CREATE TABLE public.orders (",
        "  id INTEGER PRIMARY KEY,",
        "  user_id INTEGER NOT NULL,",
        "  total NUMERIC(10, 2),",
        "  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)",
        ");",
      ].join("\n"),
    ),
    file(
      "schema.graphql",
      "graphql",
      [
        "type Product {",
        "  id: ID!",
        "  name: String!",
        "}",
        "input ProductInput {",
        "  name: String!",
        "}",
      ].join("\n"),
    ),
  ]);

  assert.ok(facts);
  assert.equal(facts?.entityCount, 5);

  const prisma = facts?.sources.find((source) => source.format === "Prisma");
  assert.deepEqual(
    prisma?.entities.find((entity) => entity.name === "User")?.fields,
    ["email", "id"],
  );

  const sql = facts?.sources.find((source) => source.format === "SQL");
  assert.deepEqual(sql?.entities[0].fields, ["id", "total", "user_id"]);

  const graphql = facts?.sources.find((source) => source.format === "GraphQL");
  assert.deepEqual(
    graphql?.entities.find((entity) => entity.name === "Product")?.fields,
    ["id", "name"],
  );
});

test("data model facts detect OpenAPI JSON and YAML schemas", () => {
  const facts = extractLocalDataModelFacts([
    file(
      "openapi.json",
      "json",
      JSON.stringify({
        openapi: "3.1.0",
        components: {
          schemas: {
            Account: {
              type: "object",
              properties: {
                id: { type: "string" },
                status: { type: "string" },
              },
            },
          },
        },
      }),
    ),
    file(
      "api.yaml",
      "yaml",
      [
        "openapi: 3.0.3",
        "components:",
        "  schemas:",
        "    Invoice:",
        "      type: object",
        "      properties:",
        "        id:",
        "          type: string",
        "        amount:",
        "          type: number",
      ].join("\n"),
    ),
  ]);

  assert.ok(facts);
  const json = facts?.sources.find((source) => source.path === "openapi.json");
  assert.deepEqual(json?.entities[0].fields, ["id", "status"]);

  const yaml = facts?.sources.find((source) => source.path === "api.yaml");
  assert.deepEqual(yaml?.entities[0].fields, ["amount", "id"]);
});

test("data model facts detect Mongoose and Drizzle declarations", () => {
  const facts = extractLocalDataModelFacts([
    file(
      "src/models/user.ts",
      "typescript",
      [
        "import mongoose from 'mongoose';",
        "const userSchema = new mongoose.Schema({",
        "  email: String,",
        "  active: Boolean,",
        "});",
        "export const User = mongoose.model('User', userSchema);",
      ].join("\n"),
    ),
    file(
      "src/db/schema.ts",
      "typescript",
      [
        "export const posts = pgTable('posts', {",
        "  id: serial('id').primaryKey(),",
        "  title: text('title').notNull(),",
        "});",
      ].join("\n"),
    ),
  ]);

  assert.ok(facts);
  const mongoose = facts?.sources.find((source) => source.format === "Mongoose");
  assert.deepEqual(mongoose?.entities[0], {
    name: "User",
    kind: "model",
    fields: ["active", "email"],
  });

  const drizzle = facts?.sources.find((source) => source.format === "Drizzle");
  assert.deepEqual(drizzle?.entities[0], {
    name: "posts",
    kind: "table",
    fields: ["id", "title"],
  });
});

test("data model facts stay absent without direct schema evidence", () => {
  const facts = extractLocalDataModelFacts([
    file("src/index.ts", "typescript", "export const value = 1;\n"),
    file(
      "src/not-mongoose.ts",
      "typescript",
      "const fake = model('NotMongoose');\nconst schema = new Schema({ value: String });\n",
    ),
    file("config.json", "json", '{"feature":true}\n'),
  ]);

  assert.equal(facts, undefined);
});
