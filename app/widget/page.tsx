"use client";
import { useState, useRef, useEffect, useCallback } from "react";

const CONFIG = {
  practiceId: "e4137916-7d89-4262-bc3c-ce2added3dc2",
  apiUrl: "https://dbj-chatbot.vercel.app/api/chat",
  name: "Bright Smile Dental",
  primaryColor: "#1a5c6b",
  greetingDelay: 15000,
  greetingMessage: "Looking for a new dentist? I can help you find the right fit.",
  quickReplies: [
    { label: "Book appointment", icon: "calendar", msg: "I'd like to book an appointment" },
    { label: "Insurance questions", icon: "shield", msg: "What insurance do you accept?" },
    { label: "I have a toothache", icon: "alert", msg: "I have a toothache and need help" },
    { label: "Hours & location", icon: "pin", msg: "What are your hours and location?" },
  ],
};

interface Msg { role: "user" | "assistant"; text: string }

function ChipIcon({ name }: { name: string }) {
  const p = { fill: "none", stroke: "#555", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "calendar") return <svg width="16" height="16" viewBox="0 0 24 24" {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
  if (name === "shield") return <svg width="16" height="16" viewBox="0 0 24 24" {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
  if (name === "alert") return <svg width="16" height="16" viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  if (name === "pin") return <svg width="16" height="16" viewBox="0 0 24 24" {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
  return null;
}

function Avatar() {
  return (
    <div style={{width:28,height:28,borderRadius:9,background:CONFIG.primaryColor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 3-1.5 5-3.5 7L12 22l-3.5-6C6.5 14 5 12 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2"/></svg>
    </div>
  );
}

function Typing() {
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:8,animation:"cbFade .3s ease"}}>
      <Avatar/>
      <div style={{background:"#f4f6f8",borderRadius:"18px 18px 18px 6px",padding:"12px 18px",display:"flex",gap:5}}>
        {[0,1,2].map(i=><span key={i} style={{width:7,height:7,borderRadius:"50%",background:"#5f6b7a",display:"block",animation:"cbDot 1.1s ease-in-out infinite",animationDelay:`${i*.18}s`}}/>)}
      </div>
    </div>
  );
}

export default function Widget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showInit, setShowInit] = useState(true);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingDismissed, setGreetingDismissed] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scroll = useCallback(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, []);

  useEffect(() => { scroll(); }, [msgs, typing, scroll]);
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!open && !greetingDismissed) {
        setShowGreeting(true);
      }
    }, CONFIG.greetingDelay);
    return () => clearTimeout(timer);
  }, [open, greetingDismissed]);

  const openChat = () => {
    setOpen(true);
    setShowGreeting(false);
    setGreetingDismissed(true);
  };

  const closeChat = () => {
    setOpen(false);
  };

  const toggleChat = () => {
    if (open) { closeChat(); } else { openChat(); }
  };

  const dismissGreeting = () => {
    setShowGreeting(false);
    setGreetingDismissed(true);
  };

  const send = async (text: string) => {
    setShowInit(false);
    const userMsg: Msg = { role: "user", text };
    const updated = [...msgs, userMsg];
    setMsgs(updated);
    setTyping(true);

    try {
      const res = await fetch(CONFIG.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practiceId: CONFIG.practiceId,
          messages: updated.map(m => ({ role: m.role, content: m.text })),
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      setTyping(false);
      setMsgs([...updated, { role: "assistant", text: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
          for (const line of lines) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.type === "text") {
                assistantText += json.text;
                setMsgs([...updated, { role: "assistant", text: assistantText }]);
              }
            } catch {}
          }
        }
      }
    } catch {
      setTyping(false);
      setMsgs([...updated, { role: "assistant", text: "I'm having trouble connecting right now. Please call us at (617) 555-0123 and we'll be happy to help." }]);
    }
  };

  const handleSend = () => { if (input.trim()) { send(input.trim()); setInput(""); } };

  return (
    <>
      <style>{css}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>

      {/* Chat window */}
      {open && (
        <div className="cb-window">
          <div className="cb-header">
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:38,height:38,borderRadius:12,background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 3-1.5 5-3.5 7L12 22l-3.5-6C6.5 14 5 12 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2"/></svg>
              </div>
              <div>
                <div style={{fontSize:15,fontWeight:600,color:"#fff"}}>{CONFIG.name}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.8)",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:"#2dd4a8",display:"inline-block"}}/>
                  AI Assistant
                </div>
              </div>
            </div>
            <button onClick={closeChat} className="cb-close-btn" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="cb-body" ref={bodyRef}>
            <div style={{textAlign:"center",padding:"8px 12px 14px"}}>
              <p style={{fontSize:16,fontWeight:600,margin:"0 0 4px",color:"#1a1d21"}}>Hi! How can we help you today?</p>
              <p style={{fontSize:11.5,color:"#5f6b7a",margin:0,opacity:.7}}>Powered by AI · Responses may not be 100% accurate</p>
            </div>

            {showInit && msgs.length === 0 && (
              <div style={{display:"flex",flexWrap:"wrap",gap:7,padding:"6px 0"}}>
                {CONFIG.quickReplies.map((r,i) => (
                  <button key={i} onClick={()=>send(r.msg)} className="cb-chip">
                    <ChipIcon name={r.icon}/> {r.label}
                  </button>
                ))}
              </div>
            )}

            {msgs.map((m,i) => (
              <div key={i} style={{display:"flex",alignItems:"flex-end",gap:8,justifyContent:m.role==="user"?"flex-end":"flex-start",animation:"cbFade .25s ease"}}>
                {m.role==="assistant" && <Avatar/>}
                <div className={m.role==="user"?"cb-bubble-user":"cb-bubble-bot"}>{m.text}</div>
              </div>
            ))}

            {typing && <Typing/>}
          </div>

          <div className="cb-handoff">
            <button className="cb-handoff-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Talk to our team
            </button>
          </div>

          <div className="cb-input-area">
            <input
              ref={inputRef}
              className="cb-input"
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();handleSend()}}}
              placeholder="Type a message..."
            />
            <button onClick={handleSend} className="cb-send-btn" style={{opacity:input.trim()?1:.35}} disabled={!input.trim()} aria-label="Send">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Proactive greeting */}
      {showGreeting && !open && (
        <>
          <div className="cb-greeting-wrap">
            <div className="cb-greeting-bubble">
              <div onClick={openChat} style={{cursor:"pointer"}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                  <div style={{width:22,height:22,borderRadius:6,background:CONFIG.primaryColor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 3-1.5 5-3.5 7L12 22l-3.5-6C6.5 14 5 12 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2"/></svg>
                  </div>
                  <span style={{fontSize:12,fontWeight:600,color:"#333"}}>{CONFIG.name}</span>
                </div>
                <p style={{fontSize:13.5,color:"#444",margin:0,lineHeight:"1.45",paddingRight:20}}>{CONFIG.greetingMessage}</p>
              </div>
            </div>
            <div className="cb-greeting-tail"/>
          </div>
          <button
            className="cb-greeting-x"
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); dismissGreeting(); }}
            aria-label="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </>
      )}

      {/* FAB */}
      <button onClick={toggleChat} className={`cb-fab ${open ? "cb-fab-hidden" : ""}`} aria-label="Chat">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        {showGreeting && !open && <span className="cb-fab-badge"/>}
      </button>
    </>
  );
}

const P = CONFIG.primaryColor;

const css = `
html, body {
  background: transparent !important;
  margin: 0;
  padding: 0;
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
}

@keyframes cbFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes cbDot { 0%, 60%, 100% { opacity: .3; transform: scale(.85); } 30% { opacity: 1; transform: scale(1); } }
@keyframes cbSlide { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes cbGreetIn { from { opacity: 0; transform: translateY(8px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes cbBadgePulse { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }

.cb-window {
  position: fixed;
  bottom: 96px;
  right: 24px;
  width: 380px;
  max-width: calc(100vw - 32px);
  height: 580px;
  max-height: calc(100vh - 120px);
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 12px 48px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e2e6eb;
  animation: cbSlide .3s cubic-bezier(.16,1,.3,1);
  z-index: 99998;
}

@media (max-width: 500px) {
  .cb-window {
    bottom: 0 !important;
    right: 0 !important;
    left: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    height: 100vh !important;
    height: 100dvh !important;
    max-height: 100vh !important;
    max-height: 100dvh !important;
    border-radius: 0 !important;
    border: none !important;
  }
}

.cb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 14px;
  background: ${P};
  flex-shrink: 0;
}

.cb-close-btn {
  background: rgba(255,255,255,.12);
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 6px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cb-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  scroll-behavior: smooth;
}

.cb-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  font-family: 'DM Sans', sans-serif;
  color: #1a1d21;
  background: #f4f6f8;
  border: 1.5px solid #e2e6eb;
  border-radius: 50px;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color .15s, background .15s;
}
.cb-chip:hover {
  border-color: ${P};
  background: #eef6f7;
}

.cb-bubble-user {
  max-width: 78%;
  padding: 10px 14px;
  font-size: 13.5px;
  line-height: 1.55;
  word-break: break-word;
  white-space: pre-wrap;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  background: ${P};
  color: #fff;
  border-radius: 18px 18px 6px 18px;
  margin-left: auto;
}

.cb-bubble-bot {
  max-width: 78%;
  padding: 10px 14px;
  font-size: 13.5px;
  line-height: 1.55;
  word-break: break-word;
  white-space: pre-wrap;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  background: #f4f6f8;
  color: #1a1d21;
  border-radius: 18px 18px 18px 6px;
}

.cb-handoff {
  padding: 0 16px;
  flex-shrink: 0;
  border-top: 1px solid #e2e6eb;
}
.cb-handoff-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  background: none;
  border: none;
  font-family: 'DM Sans', sans-serif;
  font-size: 12.5px;
  font-weight: 500;
  color: #5f6b7a;
  cursor: pointer;
  padding: 10px 0;
  width: 100%;
  justify-content: center;
  transition: color .15s;
}
.cb-handoff-btn:hover { color: ${P}; }

.cb-input-area {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 14px;
  flex-shrink: 0;
}
@media (max-width: 500px) {
  .cb-input-area {
    padding-bottom: max(14px, env(safe-area-inset-bottom));
  }
}

.cb-input {
  flex: 1;
  padding: 10px 14px;
  font-size: 16px;
  font-family: 'DM Sans', sans-serif;
  border: 1.5px solid #e2e6eb;
  border-radius: 50px;
  outline: none;
  color: #1a1d21;
  background: #f4f6f8;
  transition: border-color .15s;
}
.cb-input:focus { border-color: ${P}; }

.cb-send-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  background: ${P};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity .15s;
}

.cb-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: none;
  background: ${P};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0,0,0,.2);
  transition: transform .2s cubic-bezier(.16,1,.3,1), opacity .2s;
  z-index: 99999;
}
.cb-fab-hidden {
  transform: scale(0);
  opacity: 0;
  pointer-events: none;
}
.cb-fab-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #ef4444;
  border: 2px solid #fff;
  animation: cbBadgePulse 2s ease-in-out infinite;
  z-index: 2;
}

.cb-greeting-wrap {
  position: fixed;
  bottom: 96px;
  right: 24px;
  animation: cbGreetIn .4s cubic-bezier(.16,1,.3,1);
  z-index: 99999;
}
.cb-greeting-bubble {
  background: #fff;
  border-radius: 16px;
  padding: 12px 14px;
  box-shadow: 0 6px 24px rgba(0,0,0,.12), 0 1px 4px rgba(0,0,0,.06);
  max-width: 280px;
  min-width: 200px;
  position: relative;
  border: 1px solid #e2e6eb;
}
.cb-greeting-x {
  position: fixed;
  bottom: 152px;
  right: 28px;
  background: #fff;
  border: 1px solid #ddd;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  z-index: 100000;
  box-shadow: 0 2px 8px rgba(0,0,0,.12);
  transition: background .15s;
}
.cb-greeting-x:hover {
  background: #f0f0f0;
}
.cb-greeting-tail {
  width: 14px;
  height: 14px;
  background: #fff;
  border-right: 1px solid #e2e6eb;
  border-bottom: 1px solid #e2e6eb;
  transform: rotate(45deg);
  position: absolute;
  bottom: -7px;
  right: 28px;
  box-shadow: 2px 2px 4px rgba(0,0,0,.04);
}

@media (max-width: 500px) {
  .cb-greeting-wrap {
    right: 16px;
    bottom: 92px;
  }
  .cb-greeting-x {
    right: 20px;
    bottom: 148px;
  }
  .cb-fab {
    bottom: 20px;
    right: 16px;
  }
}
`;
