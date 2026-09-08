-- Adjuntos del asistente del Cotizador: archivos convertidos a Markdown que la
-- IA usa como referencia o vuelca íntegros en las páginas de la propuesta.
-- Aditivo e idempotente. Equivale a `npx prisma db push` para este modelo.
CREATE TABLE IF NOT EXISTS "QuoteAttachment" (
  "id"           TEXT NOT NULL,
  "quoteId"      TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "mimeType"     TEXT,
  "sourceFormat" TEXT NOT NULL DEFAULT 'md',
  "markdown"     TEXT NOT NULL,
  "charCount"    INTEGER NOT NULL DEFAULT 0,
  "converted"    BOOLEAN NOT NULL DEFAULT false,
  "uploadedBy"   TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuoteAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuoteAttachment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "QuoteAttachment_quoteId_createdAt_idx" ON "QuoteAttachment"("quoteId", "createdAt");
