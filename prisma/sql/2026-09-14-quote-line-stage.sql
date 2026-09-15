-- Cotizador: línea de negocio (educativa / empresarial) y seguimiento comercial
-- (enviada, en estudio, aprobada, descartada) de cada cotización.
-- Aditivo e idempotente.
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "line" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "stage" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "stageAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Quote_line_updatedAt_idx" ON "Quote"("line", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "Quote_stage_updatedAt_idx" ON "Quote"("stage", "updatedAt" DESC);

-- Línea sugerida para las cotizaciones existentes, según su plantilla.
-- Solo rellena las que no tienen línea; se puede cambiar desde el editor.
UPDATE "Quote" SET "line" = 'EMPRESARIAL'
  WHERE "line" IS NULL AND "template" IN ('SOLUCIONES', 'TRANSFORMACION', 'PRODUCTO');
UPDATE "Quote" SET "line" = 'EDUCATIVA'
  WHERE "line" IS NULL AND "template" IN ('CURSOS', 'FORMACION', 'PROFETABLA', 'LMS', 'ESTUDIO', 'PROGRAMAS', 'SERVICIO');

-- Las ya enviadas a algún destinatario arrancan en «Enviada».
UPDATE "Quote" q SET "stage" = 'ENVIADA', "stageAt" = s."sentAt"
  FROM (SELECT "quoteId", MAX("sentAt") AS "sentAt" FROM "QuoteRecipient" WHERE "sentAt" IS NOT NULL GROUP BY "quoteId") s
  WHERE q."id" = s."quoteId" AND q."stage" IS NULL;
