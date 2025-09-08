-- CreateTable
CREATE TABLE "public"."widgets" (
    "id" TEXT NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "context_url" TEXT,
    "appearance" JSONB NOT NULL,
    "behavior" JSONB NOT NULL,
    "permissions" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."widget_sessions" (
    "id" TEXT NOT NULL,
    "widget_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "visitor_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "referrer_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "start_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 0,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "sentiment" TEXT,
    "sentiment_score" DECIMAL(3,2),
    "metadata" JSONB,

    CONSTRAINT "widget_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."widget_interactions" (
    "id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "speaker" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "audio_url" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ai_confidence" DECIMAL(3,2),
    "intent" TEXT,
    "sentiment" TEXT,
    "sentiment_score" DECIMAL(3,2),
    "processing_time" INTEGER,

    CONSTRAINT "widget_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."context_extracts" (
    "id" TEXT NOT NULL,
    "widget_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "keywords" JSONB,
    "metadata" JSONB,
    "extracted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "context_extracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."provider_configs" (
    "id" TEXT NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "credentials" JSONB NOT NULL,
    "settings" JSONB NOT NULL,
    "webhook_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."provider_calls" (
    "id" TEXT NOT NULL,
    "provider_config_id" TEXT NOT NULL,
    "call_id" INTEGER,
    "external_call_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'initiated',
    "from_number" TEXT NOT NULL,
    "to_number" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(10,4),
    "currency" TEXT DEFAULT 'USD',
    "start_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMP(3),
    "recording_url" TEXT,
    "error_code" TEXT,
    "error_message" TEXT,
    "metadata" JSONB,

    CONSTRAINT "provider_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "widgets_organization_id_idx" ON "public"."widgets"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "widget_sessions_session_id_key" ON "public"."widget_sessions"("session_id");

-- CreateIndex
CREATE INDEX "widget_sessions_widget_id_idx" ON "public"."widget_sessions"("widget_id");

-- CreateIndex
CREATE INDEX "widget_sessions_start_time_idx" ON "public"."widget_sessions"("start_time");

-- CreateIndex
CREATE INDEX "widget_interactions_session_id_idx" ON "public"."widget_interactions"("session_id");

-- CreateIndex
CREATE INDEX "widget_interactions_timestamp_idx" ON "public"."widget_interactions"("timestamp");

-- CreateIndex
CREATE INDEX "context_extracts_widget_id_idx" ON "public"."context_extracts"("widget_id");

-- CreateIndex
CREATE UNIQUE INDEX "context_extracts_widget_id_url_key" ON "public"."context_extracts"("widget_id", "url");

-- CreateIndex
CREATE INDEX "provider_configs_organization_id_idx" ON "public"."provider_configs"("organization_id");

-- CreateIndex
CREATE INDEX "provider_configs_type_idx" ON "public"."provider_configs"("type");

-- CreateIndex
CREATE UNIQUE INDEX "provider_configs_organization_id_type_is_primary_key" ON "public"."provider_configs"("organization_id", "type", "is_primary");

-- CreateIndex
CREATE INDEX "provider_calls_provider_config_id_idx" ON "public"."provider_calls"("provider_config_id");

-- CreateIndex
CREATE INDEX "provider_calls_call_id_idx" ON "public"."provider_calls"("call_id");

-- CreateIndex
CREATE INDEX "provider_calls_external_call_id_idx" ON "public"."provider_calls"("external_call_id");

-- CreateIndex
CREATE INDEX "provider_calls_start_time_idx" ON "public"."provider_calls"("start_time");

-- AddForeignKey
ALTER TABLE "public"."widgets" ADD CONSTRAINT "widgets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."widget_sessions" ADD CONSTRAINT "widget_sessions_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "public"."widgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."widget_interactions" ADD CONSTRAINT "widget_interactions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."widget_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."context_extracts" ADD CONSTRAINT "context_extracts_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "public"."widgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."provider_configs" ADD CONSTRAINT "provider_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."provider_calls" ADD CONSTRAINT "provider_calls_provider_config_id_fkey" FOREIGN KEY ("provider_config_id") REFERENCES "public"."provider_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."provider_calls" ADD CONSTRAINT "provider_calls_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE SET NULL ON UPDATE CASCADE;
