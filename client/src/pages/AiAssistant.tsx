import { useState, useRef, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bot, Send, User, Sparkles, Loader2, RefreshCw, Zap, Plus } from "lucide-react";
import { Streamdown } from "streamdown";

const QUICK_PROMPTS = [
  "Decode BPAN: MH01NMC100S48A240001",
  "SOH threshold for second-life BESS?",
  "EPR compliance under BWMR 2022",
  "How does CNN-LSTM predict RUL?",
  "What triggers a thermal anomaly alert?",
  "Guide me through BPAN registration",
];

export default function AiAssistant() {
  usePageTitle("AI Assistant");

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: sessions, refetch: refetchSessions } = trpc.assistant.getSessions.useQuery();
  const { data: messages, refetch: refetchMessages } = trpc.assistant.getMessages.useQuery(
    { sessionId: sessionId! },
    { enabled: !!sessionId }
  );

  const createSessionMutation = trpc.assistant.createSession.useMutation({
    onSuccess: (session) => {
      setSessionId(session.id);
      refetchSessions();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const chatMutation = trpc.assistant.chat.useMutation({
    onSuccess: () => {
      refetchMessages();
      setIsLoading(false);
    },
    onError: (e: { message: string }) => {
      toast.error(e.message);
      setIsLoading(false);
    },
  });

  // Auto-create a session on first load
  useEffect(() => {
    if (sessions && sessions.length > 0 && !sessionId) {
      setSessionId(sessions[0].id);
    }
  }, [sessions, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim() || isLoading || !sessionId) return;
    setInput("");
    setIsLoading(true);
    chatMutation.mutate({ sessionId, message: text });
  };

  const startNewSession = () => {
    createSessionMutation.mutate({ title: `Session ${new Date().toLocaleDateString()}` });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (sessionId) {
        sendMessage(input);
      } else {
        createSessionMutation.mutate(
          { title: `Session ${new Date().toLocaleDateString()}` },
          { onSuccess: (s) => chatMutation.mutate({ sessionId: s.id, message: input }) }
        );
        setInput("");
        setIsLoading(true);
      }
    }
  };

  const handleSend = () => {
    if (!sessionId) {
      createSessionMutation.mutate(
        { title: `Session ${new Date().toLocaleDateString()}` },
        { onSuccess: (s) => { chatMutation.mutate({ sessionId: s.id, message: input }); setInput(""); setIsLoading(true); } }
      );
    } else {
      sendMessage(input);
    }
  };

  const displayMessages = messages ?? [];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar: Sessions */}
      <div className="w-56 border-r border-border bg-card flex-shrink-0 flex flex-col hidden lg:flex">
        <div className="p-3 border-b border-border">
          <Button
            size="sm"
            className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-xs h-8"
            onClick={startNewSession}
            disabled={createSessionMutation.isPending}
          >
            <Plus className="w-3 h-3 mr-1.5" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(sessions ?? []).map((s) => (
            <button
              key={s.id}
              onClick={() => setSessionId(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${sessionId === s.id ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-secondary/50"}`}
            >
              <div className="font-mono truncate">{s.title ?? `Session ${s.id}`}</div>
              <div className="font-mono text-[9px] opacity-60 mt-0.5">{new Date(s.createdAt).toLocaleDateString()}</div>
            </button>
          ))}
          {(!sessions || sessions.length === 0) && (
            <div className="text-center py-8">
              <p className="font-mono text-[10px] text-muted-foreground">No sessions yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-display text-sm font-bold">Circul-AI-r Assistant</span>
            <Badge variant="outline" className="font-mono text-[9px] border-primary/20 text-primary/60 hidden sm:flex">
              Battery Intelligence AI
            </Badge>
          </div>
          <Button variant="outline" size="sm" className="border-border h-7 text-xs" onClick={startNewSession}>
            <RefreshCw className="w-3 h-3 mr-1" /> New
          </Button>
        </div>

        {/* Quick Prompts */}
        {displayMessages.length === 0 && (
          <div className="p-5 flex-shrink-0">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2">Battery Lifecycle Intelligence</h2>
              <p className="text-muted-foreground text-sm">Ask me anything about BPAN, SOH analysis, EPR compliance, or lifecycle routing.</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    if (!sessionId) {
                      createSessionMutation.mutate(
                        { title: `Session ${new Date().toLocaleDateString()}` },
                        { onSuccess: (s) => { chatMutation.mutate({ sessionId: s.id, message: prompt }); setIsLoading(true); } }
                      );
                    } else {
                      sendMessage(prompt);
                    }
                  }}
                  className="font-mono text-[10px] px-3 py-1.5 rounded-full border border-primary/20 text-primary/70 hover:bg-primary/10 hover:text-primary transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          {displayMessages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "assistant" ? "bg-primary/20 border border-primary/30" : "bg-secondary border border-border"}`}>
                {msg.role === "assistant" ? <Bot className="w-3.5 h-3.5 text-primary" /> : <User className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
              <div className={`max-w-[80%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`rounded-xl px-4 py-3 ${msg.role === "assistant" ? "bg-card border border-border" : "bg-primary/10 border border-primary/20"}`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded">
                      <Streamdown>{msg.content}</Streamdown>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground">{msg.content}</p>
                  )}
                </div>
                <span className="font-mono text-[9px] text-muted-foreground px-1">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/20 border border-primary/30">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <span className="font-mono text-xs text-muted-foreground">Analyzing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about BPAN decoding, SOH, EPR compliance, lifecycle routing..."
                className="bg-card border-border pr-10 h-11 font-mono text-sm"
                disabled={isLoading}
              />
              <Zap className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/30" />
            </div>
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-5"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="outline" className="font-mono text-[9px] border-primary/20 text-primary/50">
              Powered by Circul-AI-r LLM
            </Badge>
            <Badge variant="outline" className="font-mono text-[9px] border-border text-muted-foreground/50">
              BWMR 2022 Compliant
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
