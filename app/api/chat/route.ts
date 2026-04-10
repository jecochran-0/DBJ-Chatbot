import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  try {
    const { messages, practiceId } = await request.json();

    if (!messages?.length || !practiceId) {
      return Response.json({ error: "Missing messages or practiceId" }, { status: 400, headers: CORS_HEADERS });
    }

    const practice = await getPractice(practiceId);
    if (!practice) {
      return Response.json({ error: "Practice not found" }, { status: 404, headers: CORS_HEADERS });
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
      headers: { ...CORS_HEADERS, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500, headers: CORS_HEADERS });
  }
}
