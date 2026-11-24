-- Learning Builder · etapas de producción de un recurso.
--
-- Cada recurso da cuenta de su proceso: 1) texto plano, 2) guion, 3) recurso
-- producido y 4) recurso entregado. Las dos últimas ya existían (el editor en
-- línea y la pieza final con sus versiones entregadas). Esto añade las dos
-- primeras: documentos —Word o PowerPoint— que se suben, se versionan, se
-- publican por su propio enlace y se comentan.
--
-- Aditivo e idempotente: crea dos tablas y no toca ninguna existente. Los
-- comentarios de una etapa viven en LbComment con el ancla «stage:TEXTO» o
-- «stage:GUION», así que esa tabla tampoco cambia.

-- Estado de una etapa de un recurso: si está publicada y con qué enlace.
CREATE TABLE IF NOT EXISTS "LbStage" (
  "id"          TEXT PRIMARY KEY,
  "resourceId"  TEXT NOT NULL,
  "stage"       TEXT NOT NULL,
  "published"   BOOLEAN NOT NULL DEFAULT false,
  "reviewToken" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LbStage_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LbResource"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LbStage_resourceId_stage_key" ON "LbStage" ("resourceId", "stage");
CREATE UNIQUE INDEX IF NOT EXISTS "LbStage_reviewToken_key" ON "LbStage" ("reviewToken");

-- Cada versión del documento de una etapa (V1, V2…): el original y su lectura en HTML.
CREATE TABLE IF NOT EXISTS "LbStageDoc" (
  "id"          TEXT PRIMARY KEY,
  "resourceId"  TEXT NOT NULL,
  "stage"       TEXT NOT NULL,
  "version"     INTEGER NOT NULL,
  "fileName"    TEXT NOT NULL,
  "format"      TEXT NOT NULL DEFAULT 'docx',
  "bytes"       INTEGER NOT NULL DEFAULT 0,
  "fileUrl"     TEXT NOT NULL,
  "htmlUrl"     TEXT NOT NULL,
  "units"       INTEGER NOT NULL DEFAULT 0,
  "images"      INTEGER NOT NULL DEFAULT 0,
  "keys"        JSONB NOT NULL DEFAULT '[]'::jsonb,
  "warnings"    JSONB NOT NULL DEFAULT '[]'::jsonb,
  "notes"       TEXT,
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LbStageDoc_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LbResource"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LbStageDoc_resourceId_stage_version_key" ON "LbStageDoc" ("resourceId", "stage", "version");
