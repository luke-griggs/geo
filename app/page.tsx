"use client";

import { useState, useRef, useEffect } from "react";

const MODELS = [
  { id: "gpt-5", name: "GPT-5.1", provider: "OpenAI" },
  { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", provider: "Anthropic" },
  { id: "grok-4.1", name: "Grok 4.1", provider: "xAI" },
] as const;

type ModelId = (typeof MODELS)[number]["id"];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface SearchQuery {
  id: string;
  model: string;
  toolName: string;
  query: string;
  timestamp: Date;
}

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<ModelId>("gpt-5");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, assistantMessage]);

    // Buffer for accumulating streamed tool call arguments
    const toolCallBuffer: Record<number, { name: string; arguments: string }> =
      {};

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              // Finalize accumulated tool calls
              for (const tc of Object.values(toolCallBuffer)) {
                if (tc.name && tc.arguments) {
                  try {
                    const args = JSON.parse(tc.arguments);
                    const queryValue =
                      args.query ||
                      args.search_query ||
                      args.q ||
                      JSON.stringify(args);

                    setSearchQueries((prev) => [
                      ...prev,
                      {
                        id: crypto.randomUUID(),
                        model:
                          MODELS.find((m) => m.id === selectedModel)?.name ||
                          selectedModel,
                        toolName: tc.name,
                        query: queryValue,
                        timestamp: new Date(),
                      },
                    ]);
                    console.log(`✅ Search Query: "${queryValue}"`);
                  } catch {
                    // If not JSON, use raw arguments
                    setSearchQueries((prev) => [
                      ...prev,
                      {
                        id: crypto.randomUUID(),
                        model:
                          MODELS.find((m) => m.id === selectedModel)?.name ||
                          selectedModel,
                        toolName: tc.name,
                        query: tc.arguments,
                        timestamp: new Date(),
                      },
                    ]);
                  }
                }
              }
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              // Extract content
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, content: m.content + content }
                      : m
                  )
                );
              }

              // Capture tool_calls - these contain the search arguments!
              const toolCalls = parsed.choices?.[0]?.delta?.tool_calls;
              if (toolCalls) {
                for (const tc of toolCalls) {
                  const index = tc.index ?? 0;

                  if (!toolCallBuffer[index]) {
                    toolCallBuffer[index] = { name: "", arguments: "" };
                  }

                  if (tc.function?.name) {
                    toolCallBuffer[index].name = tc.function.name;
                    console.log(`🔧 Tool: ${tc.function.name}`);
                  }

                  if (tc.function?.arguments) {
                    toolCallBuffer[index].arguments += tc.function.arguments;
                  }
                }
              }
            } catch (err) {
              console.error("Parse error:", err);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? {
                ...m,
                content: `Error: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-zinc-100">
      {/* Sidebar - Search Query Arguments */}
      <aside className="w-96 border-r border-zinc-800 bg-[#111] p-4 flex flex-col">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-1">
            Search Queries
          </h2>
          <p className="text-xs text-zinc-500">
            Arguments passed to web search tool
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {searchQueries.length > 0 ? (
            searchQueries.map((sq) => (
              <div
                key={sq.id}
                className="p-3 bg-zinc-900 rounded-lg border border-zinc-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-500">
                    {sq.toolName}
                  </span>
                  <span className="text-[10px] text-zinc-600">{sq.model}</span>
                </div>
                <p className="text-sm text-amber-400 font-mono break-all">
                  &ldquo;{sq.query}&rdquo;
                </p>
                <p className="text-[10px] text-zinc-600 mt-2">
                  {sq.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-xs text-zinc-600 italic">
                No search queries yet.
              </p>
            </div>
          )}
        </div>

        {searchQueries.length > 0 && (
          <button
            onClick={() => setSearchQueries([])}
            className="mt-4 px-3 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Clear
          </button>
        )}
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        <header className="border-b border-zinc-800 p-4 bg-[#111]">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight">
              OpenRouter <span className="text-amber-400">:online</span> Search
              Test
            </h1>

            <div className="flex items-center gap-3">
              <label className="text-xs text-zinc-500">Model:</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as ModelId)}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              >
                {MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 mb-4">
                  <svg
                    className="w-8 h-8 text-amber-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  Test Native Search Queries
                </h2>
                <p className="text-zinc-500 max-w-md mx-auto">
                  Ask questions requiring current info. The sidebar shows the
                  exact search queries the model passes to its native search
                  tool.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    "What's the latest news about AI?",
                    "Current Bitcoin price?",
                    "Who won the latest NBA game?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="px-3 py-1.5 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-amber-600 text-white"
                      : "bg-zinc-800 text-zinc-100"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.content === "" && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    <div
                      className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <div
                      className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-zinc-800 p-4 bg-[#111]">
          <form
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto flex gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something that requires current information..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-xl font-medium transition-colors"
            >
              Send
            </button>
          </form>
          <p className="text-center text-xs text-zinc-600 mt-2">
            Using{" "}
            <span className="text-amber-400">
              {MODELS.find((m) => m.id === selectedModel)?.name}
            </span>
            <code className="text-zinc-500">:online</code> via OpenRouter
          </p>
        </div>
      </main>
    </div>
  );
}
