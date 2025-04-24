import prisma from "../../db.server"; // ✅ относительный путь
import { json } from "@remix-run/node";

export async function loader() {
  const sessions = await prisma.session.findMany();
  return json({ sessions });
}