-- DropIndex
DROP INDEX "video_is_short_idx";

-- DropIndex
DROP INDEX "video_published_idx";

-- CreateIndex
CREATE INDEX "video_published_id_idx" ON "video"("published", "id");

-- CreateIndex
CREATE INDEX "video_is_short_published_id_idx" ON "video"("is_short", "published", "id");
