-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Market" AS ENUM ('LIST', 'ROOMS', 'SERVICES', 'FARM', 'JOBS');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('SELL', 'RENT', 'SERVICE');

-- CreateEnum
CREATE TYPE "PriceUnit" AS ENUM ('TOTAL', 'PER_HOUR', 'PER_DAY', 'PER_WEEK', 'PER_MONTH', 'PER_JOB', 'QUOTE');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RESERVED', 'CLOSED', 'EXPIRED', 'REMOVED');

-- CreateEnum
CREATE TYPE "ContactChannel" AS ENUM ('PHONE', 'SMS', 'MESSENGER', 'FACEBOOK', 'VIBER', 'TRUSTCLUB');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SCAM', 'PROHIBITED', 'DUPLICATE', 'WRONG_CATEGORY', 'SOLD_ALREADY', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "trustclub_id" TEXT NOT NULL,
    "display_name" TEXT,
    "phone" TEXT,
    "phone_verified_at" TIMESTAMP(3),
    "messenger_handle" TEXT,
    "facebook_url" TEXT,
    "viber_number" TEXT,
    "municipality_id" TEXT,
    "is_staff" BOOLEAN NOT NULL DEFAULT false,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipalities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,

    CONSTRAINT "municipalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipality_adjacency" (
    "from_id" TEXT NOT NULL,
    "to_id" TEXT NOT NULL,

    CONSTRAINT "municipality_adjacency_pkey" PRIMARY KEY ("from_id","to_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "market" "Market" NOT NULL DEFAULT 'LIST',
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "attribute_schema" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "type" "ListingType" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" DECIMAL(12,2),
    "price_unit" "PriceUnit",
    "negotiable" BOOLEAN NOT NULL DEFAULT false,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "municipality_id" TEXT NOT NULL,
    "barangay" TEXT,
    "meetup_note" TEXT,
    "contact_channels" JSONB NOT NULL DEFAULT '[]',
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "posted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "bumped_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "removed_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_images" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "bytes" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "listing_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_service_areas" (
    "listing_id" TEXT NOT NULL,
    "municipality_id" TEXT NOT NULL,

    CONSTRAINT "listing_service_areas_pkey" PRIMARY KEY ("listing_id","municipality_id")
);

-- CreateTable
CREATE TABLE "saved_listings" (
    "account_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_listings_pkey" PRIMARY KEY ("account_id","listing_id")
);

-- CreateTable
CREATE TABLE "contact_events" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "channel" "ContactChannel" NOT NULL,
    "viewer_account_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "reporter_account_id" TEXT,
    "reason" "ReportReason" NOT NULL,
    "note" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolved_by" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_chain_cache" (
    "from_id" TEXT NOT NULL,
    "to_id" TEXT NOT NULL,
    "trust_points" INTEGER NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_chain_cache_pkey" PRIMARY KEY ("from_id","to_id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "device_code" TEXT NOT NULL,
    "user_code" TEXT NOT NULL,
    "interval" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_poll_at" TIMESTAMP(3),
    "last_error" TEXT,
    "client_id" TEXT NOT NULL,
    "redirect_path" TEXT,
    "nonce" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_trustclub_id_key" ON "accounts"("trustclub_id");

-- CreateIndex
CREATE INDEX "accounts_municipality_id_idx" ON "accounts"("municipality_id");

-- CreateIndex
CREATE INDEX "municipalities_province_idx" ON "municipalities"("province");

-- CreateIndex
CREATE UNIQUE INDEX "municipalities_name_province_key" ON "municipalities"("name", "province");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "categories_market_is_active_idx" ON "categories"("market", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "listings_code_key" ON "listings"("code");

-- CreateIndex
CREATE INDEX "listings_status_category_id_idx" ON "listings"("status", "category_id");

-- CreateIndex
CREATE INDEX "listings_status_municipality_id_idx" ON "listings"("status", "municipality_id");

-- CreateIndex
CREATE INDEX "listings_status_posted_at_idx" ON "listings"("status", "posted_at");

-- CreateIndex
CREATE INDEX "listings_account_id_status_idx" ON "listings"("account_id", "status");

-- CreateIndex
CREATE INDEX "listing_images_listing_id_sort_order_idx" ON "listing_images"("listing_id", "sort_order");

-- CreateIndex
CREATE INDEX "contact_events_listing_id_created_at_idx" ON "contact_events"("listing_id", "created_at");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "trust_chain_cache_fetched_at_idx" ON "trust_chain_cache"("fetched_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_device_code_key" ON "auth_sessions"("device_code");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "municipality_adjacency" ADD CONSTRAINT "municipality_adjacency_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "municipality_adjacency" ADD CONSTRAINT "municipality_adjacency_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_service_areas" ADD CONSTRAINT "listing_service_areas_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_service_areas" ADD CONSTRAINT "listing_service_areas_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_listings" ADD CONSTRAINT "saved_listings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_listings" ADD CONSTRAINT "saved_listings_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_events" ADD CONSTRAINT "contact_events_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_events" ADD CONSTRAINT "contact_events_viewer_account_id_fkey" FOREIGN KEY ("viewer_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_account_id_fkey" FOREIGN KEY ("reporter_account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

