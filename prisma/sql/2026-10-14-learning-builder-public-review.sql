-- Learning Builder · revisión externa por enlace.
--
-- Aditivo e idempotente. Un recurso puede abrir un enlace de revisión aparte
-- del enlace público: quien lo recibe se identifica (nombre, correo,
-- organización) y comenta sobre elementos concretos de la pieza. Esos
-- comentarios viven en la misma tabla que los del equipo, sin autor interno.

ALTER TABLE "LbResource" ADD COLUMN IF NOT EXISTS "reviewEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "LbResource" ADD COLUMN IF NOT EXISTS "reviewToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "LbResource_reviewToken_key" ON "LbResource" ("reviewToken");

ALTER TABLE "LbComment" ALTER COLUMN "authorId" DROP NOT NULL;
ALTER TABLE "LbComment" ADD COLUMN IF NOT EXISTS "guestName" TEXT;
ALTER TABLE "LbComment" ADD COLUMN IF NOT EXISTS "guestEmail" TEXT;
ALTER TABLE "LbComment" ADD COLUMN IF NOT EXISTS "guestOrg" TEXT;
ALTER TABLE "LbComment" ADD COLUMN IF NOT EXISTS "target" JSONB;
