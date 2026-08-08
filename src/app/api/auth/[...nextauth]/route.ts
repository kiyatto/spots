import type { NextRequest } from "next/server";
import { handleAuthRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  return handleAuthRequest(req);
}

export async function POST(req: NextRequest) {
  return handleAuthRequest(req);
}
