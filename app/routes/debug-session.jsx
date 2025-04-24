import prisma from "~/db.server";
import { json } from "@remix-run/node";

export async function loader() {
  const sessions = await prisma.session.findMany();
  return json({ sessions });
}