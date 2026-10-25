-- CreateEnum
CREATE TYPE "BookingParty" AS ENUM ('customer', 'professional');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" "BookingParty";
