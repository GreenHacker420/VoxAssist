-- CreateTable
CREATE TABLE "public"."surveys" (
    "id" SERIAL NOT NULL,
    "call_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "surveys_call_id_key" ON "public"."surveys"("call_id");

-- AddForeignKey
ALTER TABLE "public"."surveys" ADD CONSTRAINT "surveys_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
