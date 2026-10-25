-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'refunding' BEFORE 'refunded';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "refundedAt" TIMESTAMP(3);
