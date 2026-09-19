-- Learning Builder · esquema del módulo (workspaces, equipo y recursos).
--
-- Migración única del módulo: añade su permiso, crea el workspace con
-- miembros, el recurso genérico de varios tipos, sus versiones e insumos, los
-- archivos de piezas importadas y las fuentes de datos abiertas.
--
-- También elimina el primer borrador del esquema (LbClient/LbOva), que solo
-- existió en desarrollo. El script scripts/apply-learning-builder-workspaces.ts
-- cuenta sus filas antes y aborta si encuentra una sola.
--
-- El ALTER TYPE va primero y en su propia sentencia: Postgres no permite usar
-- un valor de enum recién añadido dentro de la misma transacción que lo añade.

ALTER TYPE "AdminModule" ADD VALUE IF NOT EXISTS 'LEARNING_BUILDER';

DROP TABLE IF EXISTS "LbOvaSource";
DROP TABLE IF EXISTS "LbOvaVersion";
DROP TABLE IF EXISTS "LbOva";
DROP TABLE IF EXISTS "LbClient";

-- ── Workspace ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "LbWorkspace" (
  "id"           TEXT PRIMARY KEY,
  "name"         TEXT NOT NULL,
  "slug"         TEXT NOT NULL,
  "kind"         TEXT NOT NULL DEFAULT 'EDUCATIVA',
  "notes"        TEXT,
  "active"       BOOLEAN NOT NULL DEFAULT true,
  "directives"   JSONB NOT NULL DEFAULT '{}'::jsonb,
  "integrations" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "LbWorkspace_slug_key" ON "LbWorkspace" ("slug");
CREATE INDEX IF NOT EXISTS "LbWorkspace_active_name_idx" ON "LbWorkspace" ("active", "name");

-- ── Equipo del workspace ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "LbWorkspaceMember" (
  "id"          TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "role"        TEXT NOT NULL DEFAULT 'EDITOR',
  "invitedById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LbWorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "LbWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LbWorkspaceMember_workspaceId_userId_key" ON "LbWorkspaceMember" ("workspaceId", "userId");
CREATE INDEX IF NOT EXISTS "LbWorkspaceMember_userId_idx" ON "LbWorkspaceMember" ("userId");

-- ── Recursos ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "LbResource" (
  "id"           TEXT PRIMARY KEY,
  "publicId"     TEXT NOT NULL,
  "workspaceId"  TEXT NOT NULL,
  "ownerId"      TEXT NOT NULL,
  "kind"         TEXT NOT NULL DEFAULT 'OVA',
  "title"        TEXT NOT NULL,
  "subtitle"     TEXT,
  "course"       TEXT,
  "unit"         TEXT,
  "tags"         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status"       TEXT NOT NULL DEFAULT 'DRAFT',
  "content"      JSONB NOT NULL DEFAULT '{}'::jsonb,
  "assets"       JSONB NOT NULL DEFAULT '{}'::jsonb,
  "importMode"   TEXT,
  "importMeta"   JSONB,
  "shareMode"    TEXT NOT NULL DEFAULT 'OFF',
  "shareCode"    TEXT,
  "embedEnabled" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt"  TIMESTAMP(3),
  "views"        INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LbResource_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "LbWorkspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LbResource_publicId_key" ON "LbResource" ("publicId");
CREATE INDEX IF NOT EXISTS "LbResource_workspaceId_updatedAt_idx" ON "LbResource" ("workspaceId", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "LbResource_workspaceId_kind_updatedAt_idx" ON "LbResource" ("workspaceId", "kind", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "LbResource_ownerId_updatedAt_idx" ON "LbResource" ("ownerId", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "LbResource_status_updatedAt_idx" ON "LbResource" ("status", "updatedAt" DESC);

CREATE TABLE IF NOT EXISTS "LbResourceVersion" (
  "id"          TEXT PRIMARY KEY,
  "resourceId"  TEXT NOT NULL,
  "reason"      TEXT NOT NULL DEFAULT 'manual',
  "label"       TEXT,
  "content"     JSONB NOT NULL,
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LbResourceVersion_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LbResource"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LbResourceVersion_resourceId_createdAt_idx" ON "LbResourceVersion" ("resourceId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "LbResourceSource" (
  "id"         TEXT PRIMARY KEY,
  "resourceId" TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "format"     TEXT NOT NULL DEFAULT 'txt',
  "text"       TEXT NOT NULL,
  "charCount"  INTEGER NOT NULL DEFAULT 0,
  "truncated"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LbResourceSource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LbResource"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LbResourceSource_resourceId_createdAt_idx" ON "LbResourceSource" ("resourceId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "LbResourceFile" (
  "id"          TEXT PRIMARY KEY,
  "resourceId"  TEXT NOT NULL,
  "path"        TEXT NOT NULL,
  "url"         TEXT NOT NULL,
  "contentType" TEXT NOT NULL DEFAULT 'application/octet-stream',
  "bytes"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LbResourceFile_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LbResource"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LbResourceFile_resourceId_path_key" ON "LbResourceFile" ("resourceId", "path");

-- ── Fuentes de datos abiertas ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "LbDataSource" (
  "id"          TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "provider"    TEXT NOT NULL DEFAULT 'GENERIC',
  "config"      JSONB NOT NULL DEFAULT '{}'::jsonb,
  "notes"       TEXT,
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LbDataSource_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "LbWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "LbDataSource_workspaceId_active_idx" ON "LbDataSource" ("workspaceId", "active");
