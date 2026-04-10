"use client";
import { useState, useRef, useEffect, useCallback } from "react";

const CONFIG = {
  practiceId: "e4137916-7d89-4262-bc3c-ce2added3dc2",
  apiUrl: "https://dbj-chatbot.vercel.app/api/chat",
  name: "Bright Smile Dental",
  primaryColor: "#1a5c6b",
  greetingDelay: 15000,
  greetingMessage: "Looking for a new dentist? I can help you find the right fit \u{1F60A}",
  quickReplies: [
    { label: "Book appointment", icon: "\u{1F4C5}", msg: "I'd like to book an appointment" },
    { label: "Insurance questions", icon: "\u{1F6E1}\uFE0F", msg: "What insurance do you accept?" },
    { label: "I have a toothache", icon: "\u{1F9B7}", msg: "I have a toothache and need help" },
    { label: "Hours & location", icon: "\u{1F4CD}", msg: "What are your hours and location?" },
  ],
};

interface Msg { role: "user" | "assistant"; text: string }

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

  // Proactive greeting timer
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!open && !greetingDismissed) {
        setShowGreeting(true);
      }
    }, CONFIG.greetingDelay);
    return () => clearTimeout(timer);
  }, [open, greetingDismissed]);

  // Hide greeting when chat opens
  useEffect(() => {
    if (open) setShowGreeting(false);
  }, [open]);

  const dismissGreeting = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    <div style={S.root}>
      <style>{css}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
      <style>{`html, body { background: transparent !important; }`}</style>

      {open && (
        <div style={S.window}>
          <div style={S.header}>
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
            <button onClick={()=>setOpen(false)} style={S.closeBtn} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div style={S.body} ref={bodyRef}>
            <div style={{textAlign:"center" as const,padding:"8px 12px 14px"}}>
              <p style={{fontSize:16,fontWeight:600,margin:"0 0 4px",color:"#1a1d21"}}>Hi! How can we help you today?</p>
              <p style={{fontSize:11.5,color:"#5f6b7a",margin:0,opacity:.7}}>Powered by AI · Responses may not be 100% accurate</p>
            </div>

            {showInit && msgs.length === 0 && (
              <div style={{display:"flex",flexWrap:"wrap" as const,gap:7,padding:"6px 0"}}>
                {CONFIG.quickReplies.map((r,i) => (
                  <button key={i} onClick={()=>send(r.msg)} style={S.chip}>
                    <span style={{fontSize:14}}>{r.icon}</span> {r.label}
                  </button>
                ))}
              </div>
            )}

            {msgs.map((m,i) => (
              <div key={i} style={{display:"flex",alignItems:"flex-end",gap:8,justifyContent:m.role==="user"?"flex-end":"flex-start",animation:"cbFade .25s ease"}}>
                {m.role==="assistant" && <Avatar/>}
                <div style={{
                  maxWidth:"78%",padding:"10px 14px",fontSize:13.5,lineHeight:"1.55",wordBreak:"break-word" as const,
                  boxShadow:"0 1px 3px rgba(0,0,0,.06)",whiteSpace:"pre-wrap" as const,
                  ...(m.role==="user"
                    ? {background:CONFIG.primaryColor,color:"#fff",borderRadius:"18px 18px 6px 18px",marginLeft:"auto"}
                    : {background:"#f4f6f8",color:"#1a1d21",borderRadius:"18px 18px 18px 6px"})
                }}>{m.text}</div>
              </div>
            ))}

            {typing && <Typing/>}
          </div>

          <div style={S.handoff}>
            <button style={S.handoffBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Talk to our team
            </button>
          </div>

          <div style={S.inputArea}>
            <input ref={inputRef} style={S.input} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();handleSend()}}} placeholder="Type a message..."/>
            <button onClick={handleSend} style={{...S.sendBtn,opacity:input.trim()?1:.35}} disabled={!input.trim()} aria-label="Send">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Proactive greeting bubble */}
      {showGreeting && !open && (
        <div
          style={S.greetingWrap}
          onClick={() => { setShowGreeting(false); setGreetingDismissed(true); setOpen(true); }}
        >
          <div style={S.greetingBubble}>
            <button onClick={dismissGreeting} style={S.greetingClose} aria-label="Dismiss">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div style={S.greetingHeader}>
              <div style={S.greetingAvatar}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 3-1.5 5-3.5 7L12 22l-3.5-6C6.5 14 5 12 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2"/></svg>
            </div>
              <span style={S.greetingName}>{CONFIG.name}</span>
            </div>
            <p style={S.greetingText}>{CONFIG.greetingMessage}</p>
          </div>
          <div style={S.greetingTail}/>
        </div>
      )}

      {/* FAB */}
      <button onClick={()=>{setOpen(!open);setShowGreeting(false);setGreetingDismissed(true)}} style={{...S.fab,...(open?{transform:"scale(0)",opacity:0,pointerEvents:"none" as const}:{})}} aria-label="Chat">
        {showGreeting && <span style={S.fabBadge}/>}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>
    </div>
  );
}

const css = `
@keyframes cbFade{from{opacity:0}to{opacity:1}}
@keyframes cbDot{0%,60%,100%{opacity:.3;transform:scale(.85)}30%{opacity:1;transform:scale(1)}}
@keyframes cbSlide{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes cbGreetIn{from{opacity:0;transform:translateY(8px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes cbBadgePulse{0%{transform:scale(1)}50%{transform:scale(1.2)}100%{transform:scale(1)}}
`;

const S: Record<string, React.CSSProperties> = {
  root:{position:"fixed",bottom:24,right:24,zIndex:99999,fontFamily:"'DM Sans',sans-serif",fontSize:14,lineHeight:"1.5",WebkitFontSmoothing:"antialiased" as const},
  window:{position:"absolute",bottom:76,right:0,width:380,maxWidth:"calc(100vw - 32px)",height:580,maxHeight:"calc(100vh - 120px)",background:"#fff",borderRadius:20,boxShadow:"0 12px 48px rgba(0,0,0,.15),0 2px 8px rgba(0,0,0,.08)",display:"flex",flexDirection:"column",overflow:"hidden",border:"1px solid #e2e6eb",animation:"cbSlide .3s cubic-bezier(.16,1,.3,1)"},
  header:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 16px 14px",background:CONFIG.primaryColor,flexShrink:0},
  closeBtn:{background:"rgba(255,255,255,.12)",border:"none",color:"#fff",cursor:"pointer",padding:6,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"},
  body:{flex:1,overflowY:"auto" as const,padding:"16px 16px 8px",display:"flex",flexDirection:"column",gap:6,scrollBehavior:"smooth" as const},
  chip:{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",fontSize:13,fontWeight:500,fontFamily:"'DM Sans',sans-serif",color:"#1a1d21",background:"#f4f6f8",border:"1.5px solid #e2e6eb",borderRadius:50,cursor:"pointer",whiteSpace:"nowrap" as const},
  handoff:{padding:"0 16px",flexShrink:0,borderTop:"1px solid #e2e6eb"},
  handoffBtn:{display:"flex",alignItems:"center",gap:7,background:"none",border:"none",fontFamily:"'DM Sans',sans-serif",fontSize:12.5,fontWeight:500,color:"#5f6b7a",cursor:"pointer",padding:"10px 0",width:"100%",justifyContent:"center"},
  inputArea:{display:"flex",alignItems:"center",gap:8,padding:"10px 12px 14px",flexShrink:0},
  input:{flex:1,padding:"10px 14px",fontSize:13.5,fontFamily:"'DM Sans',sans-serif",border:"1.5px solid #e2e6eb",borderRadius:50,outline:"none",color:"#1a1d21",background:"#f4f6f8"},
  sendBtn:{width:38,height:38,borderRadius:"50%",border:"none",background:CONFIG.primaryColor,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  fab:{width:58,height:58,borderRadius:"50%",border:"none",background:CONFIG.primaryColor,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(0,0,0,.2)",transition:"transform .2s cubic-bezier(.16,1,.3,1),opacity .2s",position:"relative" as const},
  fabBadge:{position:"absolute" as const,top:0,right:0,width:14,height:14,borderRadius:"50%",background:"#ef4444",border:"2px solid #fff",animation:"cbBadgePulse 2s ease-in-out infinite"},

  // Proactive greeting
  greetingWrap:{position:"absolute" as const,bottom:76,right:0,cursor:"pointer",animation:"cbGreetIn .4s cubic-bezier(.16,1,.3,1)"},
  greetingBubble:{background:"#fff",borderRadius:16,padding:"12px 36px 12px 14px",boxShadow:"0 6px 24px rgba(0,0,0,.12),0 1px 4px rgba(0,0,0,.06)",maxWidth:280,minWidth:200,position:"relative" as const,border:"1px solid #e2e6eb"},
  greetingClose:{position:"absolute" as const,top:8,right:8,background:"none",border:"none",cursor:"pointer",padding:2,display:"flex",borderRadius:4},
  greetingHeader:{display:"flex",alignItems:"center",gap:7,marginBottom:6},
  greetingAvatar:{width:22,height:22,borderRadius:6,background:CONFIG.primaryColor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  greetingName:{fontSize:12,fontWeight:600,color:"#333"},
  greetingText:{fontSize:13.5,color:"#444",margin:0,lineHeight:"1.45"},
  greetingTail:{width:14,height:14,background:"#fff",borderRight:"1px solid #e2e6eb",borderBottom:"1px solid #e2e6eb",transform:"rotate(45deg)",position:"absolute" as const,bottom:-7,right:28,boxShadow:"2px 2px 4px rgba(0,0,0,.04)"},
};
