/*
  Warnings:

  - Added the required column `imageUrl` to the `VideoTask` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "VideoTask" ADD COLUMN     "imageUrl" TEXT NOT NULL;
