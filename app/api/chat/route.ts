import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ─── Rate limiting ────────────────────────────────────────────────────────────
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_WINDOW_MS) rateLimitMap.delete(ip);
  }
}, 5 * 60_000);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// ─── Allowed origins ─────────────────────────────────────────────────────────
const FALLBACK_ORIGINS = [
  "https://bright-smile-dental-7d2ed6.webflow.io",
  "https://dbj-chatbot.vercel.app",
  "http://localhost:3000",
];

function getRequestOrigin(request: Request): string | null {
  return request.headers.get("origin") || request.headers.get("referer")?.replace(/\/$/, "").split("/").slice(0, 3).join("/") || null;
}

function isOriginAllowed(origin: string, allowed: string[]): boolean {
  return allowed.some((o) => origin === o || origin.startsWith(o));
}

function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const allowedOrigin = origin && isOriginAllowed(origin, allowed) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function getPractice(practiceId: string) {
  const { data } = await supabase
    .from("practices")
    .select("*")
    .eq("id", practiceId)
    .single();
  return data;
}

async function getKnowledge(practiceId: string) {
  const { data } = await supabase
    .from("knowledge")
    .select("category, title, content")
    .eq("practice_id", practiceId);
  return data || [];
}

// ─── Handlers ────────────────────────────────────────────────────────────────
export async function OPTIONS(request: Request) {
  const origin = getRequestOrigin(request);
  return new Response(null, { headers: corsHeaders(origin, FALLBACK_ORIGINS) });
}

export async function POST(request: Request) {
  const origin = getRequestOrigin(request);

  // IP-based rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return Response.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429, headers: corsHeaders(origin, FALLBACK_ORIGINS) }
    );
  }

  try {
    const { messages, practiceId } = await request.json();

    if (!messages?.length || !practiceId) {
      return Response.json(
        { error: "Missing messages or practiceId" },
        { status: 400, headers: corsHeaders(origin, FALLBACK_ORIGINS) }
      );
    }

    const practice = await getPractice(practiceId);
    if (!practice) {
      return Response.json(
        { error: "Practice not found" },
        { status: 404, headers: corsHeaders(origin, FALLBACK_ORIGINS) }
      );
    }

    // Determine allowed origins: practice-level list takes precedence over fallback
    const allowedOrigins: string[] =
      Array.isArray(practice.allowed_origins) && practice.allowed_origins.length > 0
        ? practice.allowed_origins
        : FALLBACK_ORIGINS;

    const cors = corsHeaders(origin, allowedOrigins);

    // Origin check — skip when there's no origin header (e.g. server-to-server calls)
    if (origin && !isOriginAllowed(origin, allowedOrigins)) {
      return Response.json(
        { error: "Unauthorized origin." },
        { status: 403, headers: cors }
      );
    }

    const knowledge = await getKnowledge(practiceId);
    const knowledgeText = knowledge
      .map((k: any) => `[${k.category}] ${k.title}: ${k.content}`)
      .join("\n\n");

    const systemPrompt = `You are a friendly, professional AI assistant for ${practice.name}, a dental practice located at ${practice.address}.

ROLE AND TONE:
- You are the virtual front desk assistant — warm, calm, competent
- Sound like a real dental receptionist, not a chatbot
- Use short, clear responses — 2 to 3 sentences max unless the patient asks for detail
- Be empathetic about dental anxiety and pain
- Never diagnose conditions or recommend specific treatments — guide patients to book an appointment
- If unsure about something, say so honestly and offer to connect them with the team

PRACTICE INFO:
- Phone: ${practice.phone}
- Address: ${practice.address}
- Hours: ${practice.hours}
${practice.booking_url ? `- Online booking: ${practice.booking_url}` : ""}

KNOWLEDGE BASE:
${knowledgeText}

BOUNDARIES:
- Never provide medical diagnoses or treatment recommendations
- Never guarantee specific pricing — say "typically" or "starting at" and suggest calling to confirm
- Never collect protected health information (SSN, full DOB, health records)
- Never make up information — if it's not in the knowledge base, say you'll have the team follow up
- For dental emergencies (severe pain, trauma, uncontrolled bleeding), urge them to call the office immediately or go to the ER

STYLE:
- Start responses directly — no "Great question!" filler
- Use line breaks between distinct points
- Always end by offering next steps: book, call, or ask another question

${practice.system_prompt_overrides || ""}`;

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: systemPrompt,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        stream.on("text", (text) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`));
        });
        stream.on("end", () => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        });
        stream.on("error", () => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Something went wrong" })}\n\n`));
          controller.close();
        });
      },
    });

    return new Response(readable, {
      headers: { ...cors, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders(origin, FALLBACK_ORIGINS) }
    );
  }
}
