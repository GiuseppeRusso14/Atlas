-- CreateEnum
CREATE TYPE "Recurrence" AS ENUM ('SETTIMANALE', 'MENSILE');

-- AlterTable
ALTER TABLE "PersonalTodo" ADD COLUMN     "repeat" "Recurrence";

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "renewalDate" TIMESTAMP(3),
ADD COLUMN     "reviewDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "repeat" "Recurrence";
