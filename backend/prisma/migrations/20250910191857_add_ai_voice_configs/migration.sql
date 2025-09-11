/*
  Warnings:

  - You are about to drop the column `password_hash` on the `users` table. All the data in the column will be lost.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."calls" ADD COLUMN     "campaign_id" INTEGER,
ADD COLUMN     "contact_id" INTEGER;

-- AlterTable
ALTER TABLE "public"."provider_configs" ADD COLUMN     "last_tested" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "password_hash",
ADD COLUMN     "password" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."campaigns" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'outbound',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "script_id" INTEGER,
    "script" TEXT,
    "scheduled_start" TIMESTAMP(3),
    "scheduled_end" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "paused_at" TIMESTAMP(3),
    "resumed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "settings" JSONB,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "success_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."scripts" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'conversation',
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "tags" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "activated_at" TIMESTAMP(3),
    "deactivated_at" TIMESTAMP(3),
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."script_versions" (
    "id" SERIAL NOT NULL,
    "script_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "reverted_from" INTEGER,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "script_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."script_tests" (
    "id" SERIAL NOT NULL,
    "script_id" INTEGER NOT NULL,
    "input" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL,
    "processing_time" INTEGER NOT NULL,
    "tested_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "script_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contacts" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."campaign_contacts" (
    "campaign_id" INTEGER NOT NULL,
    "contact_id" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_contacts_pkey" PRIMARY KEY ("campaign_id","contact_id")
);

-- CreateTable
CREATE TABLE "public"."ai_configs" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL DEFAULT 'gpt-4',
    "temperature" DECIMAL(3,2) NOT NULL DEFAULT 0.7,
    "max_tokens" INTEGER NOT NULL DEFAULT 1000,
    "system_prompt" TEXT NOT NULL DEFAULT 'You are a helpful AI assistant for customer support.',
    "enable_function_calling" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."voice_configs" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'elevenlabs',
    "voice_id" TEXT NOT NULL DEFAULT 'default',
    "speed" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "pitch" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "stability" DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    "clarity" DECIMAL(3,2) NOT NULL DEFAULT 0.75,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaigns_organization_id_idx" ON "public"."campaigns"("organization_id");

-- CreateIndex
CREATE INDEX "campaigns_script_id_idx" ON "public"."campaigns"("script_id");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "public"."campaigns"("status");

-- CreateIndex
CREATE INDEX "campaigns_created_at_idx" ON "public"."campaigns"("created_at");

-- CreateIndex
CREATE INDEX "scripts_organization_id_idx" ON "public"."scripts"("organization_id");

-- CreateIndex
CREATE INDEX "scripts_is_active_idx" ON "public"."scripts"("is_active");

-- CreateIndex
CREATE INDEX "scripts_category_idx" ON "public"."scripts"("category");

-- CreateIndex
CREATE INDEX "script_versions_script_id_idx" ON "public"."script_versions"("script_id");

-- CreateIndex
CREATE UNIQUE INDEX "script_versions_script_id_version_key" ON "public"."script_versions"("script_id", "version");

-- CreateIndex
CREATE INDEX "script_tests_script_id_idx" ON "public"."script_tests"("script_id");

-- CreateIndex
CREATE INDEX "script_tests_created_at_idx" ON "public"."script_tests"("created_at");

-- CreateIndex
CREATE INDEX "contacts_organization_id_idx" ON "public"."contacts"("organization_id");

-- CreateIndex
CREATE INDEX "contacts_phone_idx" ON "public"."contacts"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_organization_id_phone_key" ON "public"."contacts"("organization_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "ai_configs_organization_id_key" ON "public"."ai_configs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "voice_configs_organization_id_key" ON "public"."voice_configs"("organization_id");

-- CreateIndex
CREATE INDEX "calls_campaign_id_idx" ON "public"."calls"("campaign_id");

-- CreateIndex
CREATE INDEX "calls_contact_id_idx" ON "public"."calls"("contact_id");

-- AddForeignKey
ALTER TABLE "public"."calls" ADD CONSTRAINT "calls_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."calls" ADD CONSTRAINT "calls_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaigns" ADD CONSTRAINT "campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaigns" ADD CONSTRAINT "campaigns_script_id_fkey" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."scripts" ADD CONSTRAINT "scripts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."script_versions" ADD CONSTRAINT "script_versions_script_id_fkey" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."script_versions" ADD CONSTRAINT "script_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."script_tests" ADD CONSTRAINT "script_tests_script_id_fkey" FOREIGN KEY ("script_id") REFERENCES "public"."scripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."contacts" ADD CONSTRAINT "contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_contacts" ADD CONSTRAINT "campaign_contacts_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."campaign_contacts" ADD CONSTRAINT "campaign_contacts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_configs" ADD CONSTRAINT "ai_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."voice_configs" ADD CONSTRAINT "voice_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
