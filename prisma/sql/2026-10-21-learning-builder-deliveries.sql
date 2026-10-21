-- Learning Builder · versiones entregadas del paquete (V1, V2, V3…).
--
-- Aditivo e idempotente. Hasta ahora subir un paquete nuevo borraba el
-- anterior. Desde aquí cada subida puede ser una versión nueva que convive con
-- las anteriores: sus archivos se guardan aparte, los comentarios dicen sobre
-- qué versión se hicieron y la revisión puede volver a cualquiera.
--
-- Los archivos que ya existen quedan como versión 1, en la misma ruta del
-- almacenamiento (…/pkg/). El script scripts/apply-learning-builder-deliveries.ts,
-- además de correr esto, crea la ficha de la V1 de cada recurso con paquete y
-- marca sus comentarios como hechos sobre la V1.

ALTER TABLE "LbResource" ADD COLUMN IF NOT EXISTS "packageVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "LbResourceFile" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
DROP INDEX IF EXISTS "LbResourceFile_resourceId_path_key";
CREATE UNIQUE INDEX IF NOT EXISTS "LbResourceFile_resourceId_version_path_key" ON "LbResourceFile" ("resourceId", "version", "path");

CREATE TABLE IF NOT EXISTS "LbDelivery" (
  "id"          TEXT PRIMARY KEY,
  "resourceId"  TEXT NOT NULL,
  "version"     INTEGER NOT NULL,
  "fileName"    TEXT NOT NULL,
  "bytes"       INTEGER NOT NULL DEFAULT 0,
  "files"       INTEGER NOT NULL DEFAULT 0,
  "notes"       TEXT,
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "snapshot"    JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "LbDelivery_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "LbResource"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "LbDelivery_resourceId_version_key" ON "LbDelivery" ("resourceId", "version");

ALTER TABLE "LbComment" ADD COLUMN IF NOT EXISTS "version" INTEGER;
