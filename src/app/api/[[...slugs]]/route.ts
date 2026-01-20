import { api } from "@/lib/api";

// Mark as dynamic to prevent static generation
export const dynamic = "force-dynamic";

export const GET = api.fetch;
export const POST = api.fetch;
export const PUT = api.fetch;
export const PATCH = api.fetch;
export const DELETE = api.fetch;
export const OPTIONS = api.fetch;
