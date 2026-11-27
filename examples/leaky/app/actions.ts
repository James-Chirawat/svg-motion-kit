"use server";
import { prisma } from "@/lib/db";

export async function deleteAccount(id: string) {
  await prisma.user.delete({ where: { id } });
}
