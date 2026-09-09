-- Versiones de cada cotización (restaurables) y plantillas propias del Cotizador.
-- Aditivo e idempotente.
CREATE TABLE IF NOT EXISTS "QuoteVersion" (
  "id"        TEXT NOT NULL,
  "quoteId"   TEXT NOT NULL,
  "reason"    TEXT NOT NULL,
  "label"     TEXT,
  "title"     TEXT NOT NULL,
  "content"   JSONB NOT NULL,
  "pricing"   JSONB NOT NULL,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteVersion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuoteVersion_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "QuoteVersion_quoteId_createdAt_idx" ON "QuoteVersion"("quoteId", "createdAt" DESC);

CREATE TABLE IF NOT EXISTS "QuoteTemplate" (
  "id"            TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "description"   TEXT,
  "template"      TEXT NOT NULL DEFAULT 'SOLUCIONES',
  "currency"      TEXT NOT NULL DEFAULT 'COP',
  "content"       JSONB NOT NULL,
  "pricing"       JSONB NOT NULL,
  "discountScale" JSONB,
  "createdBy"     TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuoteTemplate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "QuoteTemplate_updatedAt_idx" ON "QuoteTemplate"("updatedAt" DESC);
