ALTER TABLE "Provider"
ADD COLUMN "testModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
ADD COLUMN "supportsChat" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "supportsEmbeddings" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Provider"
SET "testModel" = CASE
  WHEN "slug" = 'apimart' THEN 'deepseek-v3.1'
  ELSE 'gpt-4o-mini'
END;
