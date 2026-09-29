-- Listings no longer expire: nothing ever set EXPIRED, and a column that only
-- ever held "posted_at plus a month" was filtering listings out of search for
-- a policy we do not have.
ALTER TABLE "listings" DROP COLUMN "expires_at";

-- A link to a video the seller already posted elsewhere. KantoList does not
-- host video; the host is checked in the application before this is written.
ALTER TABLE "listings" ADD COLUMN "video_url" TEXT;
