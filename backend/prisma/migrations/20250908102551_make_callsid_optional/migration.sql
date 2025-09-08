-- AlterTable
ALTER TABLE "public"."calls" ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "call_sid" DROP NOT NULL,
ALTER COLUMN "twilio_phone" DROP NOT NULL;
