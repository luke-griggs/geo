// Model configurations WITH :online suffix for native search
const MODELS = {
  "gpt-5": "openai/gpt-5.1:online",
  "claude-sonnet-4.5": "anthropic/claude-sonnet-4.5:online",
  "grok-4.1": "x-ai/grok-4.1-fast:online",
} as const;

export async function POST(req: Request) {
  const { messages, model } = await req.json();

  const modelId = MODELS[model as keyof typeof MODELS] || MODELS["gpt-5"];

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Using model: ${modelId}`);
  console.log(`${"=".repeat(60)}\n`);

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
        "X-Title": "OpenRouter Web Search Test",
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        stream: true,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenRouter error:", error);
    return new Response(JSON.stringify({ error }), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const text = decoder.decode(chunk);
      const lines = text.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);

          if (data === "[DONE]") {
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            // Log tool calls with their arguments - this is the search query!
            const toolCalls = parsed.choices?.[0]?.delta?.tool_calls;
            if (toolCalls) {
              for (const tc of toolCalls) {
                if (tc.function?.name) {
                  console.log(`\n🔧 TOOL: ${tc.function.name}`);
                }
                if (tc.function?.arguments) {
                  console.log(`   ARGS: ${tc.function.arguments}`);
                }
              }
            }

            // Log finish_reason
            const finishReason = parsed.choices?.[0]?.finish_reason;
            if (finishReason) {
              console.log(`\n✓ Finish reason: ${finishReason}`);
            }

            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          } catch {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }
      }
    },
  });

  return new Response(response.body?.pipeThrough(transformStream), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
