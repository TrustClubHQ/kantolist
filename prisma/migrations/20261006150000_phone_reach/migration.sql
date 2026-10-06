-- Which of the two phone channels a seller wants offered.
--
-- A number implied both a call and a text, and the sheet offered both. Plenty
-- of sellers answer only one: a sari-sari owner behind a counter cannot take
-- calls, a driver cannot read texts. Offering the one they never answer reads
-- to the buyer as being ignored.
--
-- BOTH is the default, so every existing account keeps exactly what it had.
-- CreateEnum
CREATE TYPE "PhoneReach" AS ENUM ('BOTH', 'CALL_ONLY', 'SMS_ONLY');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "phone_reach" "PhoneReach" NOT NULL DEFAULT 'BOTH';
