// Unsmoke v3.1 - {"t": 1783017382.753017}
import { useState, useEffect, useRef } from "react";


const C = {
  bg:"#F5F0E8", surface:"#FFFFFF", surfaceHi:"#FAF7F2",
  border:"#E8DDD0", gold:"#A0720A", goldHi:"#C9921A",
  goldFade:"rgba(160,114,10,0.08)",
  emerald:"#0A8A6A", emeraldFade:"rgba(10,138,106,0.08)",
  ruby:"#C03050", rubyFade:"rgba(192,48,80,0.08)",
  orchid:"#7050A8", orchidFade:"rgba(112,80,168,0.08)",
  amber:"#B87000", amberFade:"rgba(184,112,0,0.08)",
  text:"#1A1208", sub:"#786858", muted:"#C8B8A8",
  accent:"#A0720A", accentFade:"rgba(160,114,10,0.08)",
  teal:"#0A8A6A", tealFade:"rgba(10,138,106,0.08)",
  purple:"#7050A8", purpleFade:"rgba(112,80,168,0.08)",
};

const pad=n=>String(n).padStart(2,"0");
const sanitize=s=>String(s||"").replace(/<[^>]*>/g,"").replace(/[<>&"']/g,"").trim().slice(0,500);
const glassCard=(accent,extra={})=>({
  background:"#FFFFFF",border:"1px solid "+(accent||"#E8DDD0"),
  borderRadius:18,padding:"20px 18px",
  boxShadow:"0 2px 12px rgba(0,0,0,0.06)",...extra,
});
const card=(extra={})=>({
  background:"#FFFFFF",border:"1px solid #E8DDD0",
  borderRadius:18,padding:"20px 18px",
  boxShadow:"0 2px 12px rgba(0,0,0,0.06)",...extra,
});
function GoldBtn({children,onClick,disabled,outline,style={}}){
  return <button onClick={onClick} disabled={disabled} style={{background:outline?"transparent":"linear-gradient(135deg,#A0720A,#B87000)",color:outline?"#A0720A":"#fff",border:outline?"1.5px solid #A0720A66":"none",borderRadius:14,padding:"14px 20px",fontWeight:700,fontSize:19,cursor:disabled?"not-allowed":"pointer",width:"100%",opacity:disabled?0.4:1,boxShadow:outline?"none":"0 4px 20px rgba(160,114,10,0.25)",...style}}>{children}</button>;
}

function parseDur(ms){const s=Math.floor(ms/1000);return{d:Math.floor(s/86400),h:Math.floor((s%86400)/3600),m:Math.floor((s%3600)/60),s:s%60};}
function msLabel(min){if(min<60)return Math.ceil(min)+"m";if(min<1440)return Math.ceil(min/60)+"h";if(min<43800)return Math.ceil(min/1440)+"d";if(min<525600)return Math.round(min/43800)+" months";return Math.round(min/525600)+" years";}
function dateKey(ts){const d=new Date(ts);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());}
function todayKey(){return dateKey(Date.now());}
function genId(len=8){return Math.random().toString(36).substr(2,len).toUpperCase();}

// Session (browser local - just login token)
const session={
  async get(k){
    try{
      // Try localStorage first
      const ls=localStorage.getItem(k);
      if(ls)return JSON.parse(ls);
      // Fallback: read from cookie
      const match=document.cookie.split(";").map(c=>c.trim()).find(c=>c.startsWith(k+"="));
      if(match)return JSON.parse(decodeURIComponent(match.split("=").slice(1).join("=")));
      return null;
    }catch{return null;}
  },
  async set(k,v){
    try{
      const str=JSON.stringify(v);
      // Save to localStorage
      localStorage.setItem(k,str);
      // Also save as 30-day cookie (survives localStorage clears on iOS)
      const exp=new Date(Date.now()+30*86400000).toUTCString();
      document.cookie=k+"="+encodeURIComponent(str)+"; expires="+exp+"; path=/; SameSite=Strict";
    }catch{}
  },
  async del(k){
    try{
      localStorage.removeItem(k);
      document.cookie=k+"=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }catch{}
  },
};

// Firebase Firestore REST
const FB_KEY="AIzaSyBy6CrePlG8499_tVBwqNw97ivycI142mI";
const FB_BASE="https://firestore.googleapis.com/v1/projects/unsmoke-app-92a39/databases/(default)/documents";
const FB={
  _pv(v){
    if(v.stringValue!==undefined)return v.stringValue;
    if(v.booleanValue!==undefined)return v.booleanValue;
    if(v.integerValue!==undefined)return parseInt(v.integerValue);
    if(v.doubleValue!==undefined)return v.doubleValue;
    if(v.nullValue!==undefined)return null;
    if(v.arrayValue)return(v.arrayValue.values||[]).map(x=>this._pv(x));
    if(v.mapValue)return this._pd(v.mapValue);
    return null;
  },
  _pd(doc){
    if(!doc||!doc.fields)return null;
    const r={};
    Object.entries(doc.fields).forEach(([k,v])=>{r[k]=this._pv(v);});
    return r;
  },
  _tv(v){
    if(v===null||v===undefined)return{nullValue:null};
    if(typeof v==="boolean")return{booleanValue:v};
    if(typeof v==="number")return Number.isInteger(v)&&Math.abs(v)<2e15?{integerValue:String(v)}:{doubleValue:v};
    if(typeof v==="string")return{stringValue:v};
    if(Array.isArray(v))return{arrayValue:{values:v.map(x=>this._tv(x))}};
    if(typeof v==="object"){
      const fields={};
      Object.entries(v).forEach(([k,val])=>{if(val!==undefined)fields[k]=this._tv(val);});
      return{mapValue:{fields}};
    }
    return{stringValue:String(v)};
  },
  _td(data){
    const fields={};
    Object.entries(data).forEach(([k,v])=>{if(v!==undefined)fields[k]=this._tv(v);});
    return{fields};
  },
  async get(path){
    try{
      const res=await fetch(FB_BASE+"/"+path+"?key="+FB_KEY);
      if(!res.ok)return null;
      return this._pd(await res.json());
    }catch{return null;}
  },
  async set(path,data){
    try{
      const res=await fetch(FB_BASE+"/"+path+"?key="+FB_KEY,{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(this._td(data))
      });
      return res.ok;
    }catch{return false;}
  },
  async merge(path,data){
    const cur=await this.get(path)||{};
    return this.set(path,Object.assign({},cur,data));
  },
  async del(path){
    try{await fetch(FB_BASE+"/"+path+"?key="+FB_KEY,{method:"DELETE"});}catch{}
  }
};

const crd=(x={})=>({background:C.surface,border:"1px solid "+C.border,borderRadius:14,padding:"16px 14px",...x});
function Btn({children,onClick,disabled,ghost,style={}}){
  return (
    <button onClick={onClick} disabled={disabled} style={{background:ghost?"transparent":C.accent,color:ghost?C.accent:"#fff",border:ghost?"1.5px solid "+C.accent:"none",borderRadius:11,padding:"13px 18px",fontWeight:700,fontSize:19,cursor:disabled?"not-allowed":"pointer",width:"100%",opacity:disabled?0.5:1,...style}}>
      {children}
    </button>
  );
}


const FOUNDER_STORY=[
  {label:"THE STARTING POINT",color:"#FF6534",heading:"2 packs a day. 12 years straight. That was me.",body:"I was a big time smoker. Not the occasional one, not the social one. Two packs a day, every single day, for 12 years."},
  {label:"THE THING PEOPLE WONT BELIEVE",color:"#FFB800",heading:"I never thought of quitting.",body:"Even while I was quitting, I kept telling myself I will never quit. There was no big decision, no this is it speech. I genuinely believed I would smoke for life."},
  {label:"WHAT ACTUALLY WORKED",color:"#00D9AA",heading:"Less willpower. More numbers.",body:"I started with nicotine patches for a week. I calculated roughly how much nicotine I was taking in from two packs a day and matched it against the patch, then started bringing that number down.\n\nWithin the first 2-3 days of using the patch, the number of cigarettes had already dropped on its own. That is when the real work started: breaking the habit itself. Morning coffee. Stress at work. After meals. Long drives."},
  {label:"DAY 8",color:"#8B5CF6",heading:"Cold turkey. And a strange trick.",body:"On the 8th day, I went cold turkey. Off the cigarettes, off the patch, off everything.\n\nAnd the way I got through it sounds strange, but it worked. I played reverse psychology on myself. I kept telling myself I love smoking and I will never quit, almost daring myself to prove it wrong."},
  {label:"TODAY",color:"#00D9AA",heading:"I have not taken a single drag.",body:"If I can go from 40-50 sticks a day to zero, so can anyone out there. This app is built for exactly that."},
];

function AIChat({systemPrompt,welcomeMsg,avatar,name,subtitle,onClose}){
  const [messages,setMessages]=useState([{role:"assistant",content:welcomeMsg}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const endRef=useRef(null);
  useEffect(()=>{endRef.current&&endRef.current.scrollIntoView({behavior:"smooth"});},[messages]);
  async function send(){
    const text=input.trim();if(!text||loading)return;
    const updated=[...messages,{role:"user",content:text}];
    setMessages(updated);setInput("");setLoading(true);
    try{
      const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,system:systemPrompt,messages:updated})});
      const data=await res.json();
      setMessages(m=>[...m,{role:"assistant",content:(data.content&&data.content[0]&&data.content[0].text)||"I am here. Keep going."}]);
    }catch{setMessages(m=>[...m,{role:"assistant",content:"Something went wrong. But you are still here, still quit. That counts."}]);}
    setLoading(false);
  }
  return (
    <div style={{position:"absolute",inset:0,zIndex:999,background:C.bg,display:"flex",flexDirection:"column"}}>
      <div style={{paddingTop:"max(48px, env(safe-area-inset-top, 48px))",paddingBottom:14,paddingLeft:16,paddingRight:16,borderBottom:"1px solid #E8DDD0",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#FF6534,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,flexShrink:0}}>{avatar}</div>
        <div style={{flex:1}}><div style={{fontWeight:800,fontSize:30,color:"#1A1208"}}>{name}</div><div style={{fontSize:30,color:"#00D9AA",marginTop:1}}>{subtitle}</div></div>
        <button onClick={onClose} style={{background:"#FAF7F2",border:"1px solid #E8DDD0",borderRadius:20,padding:"6px 14px",color:"#786858",fontSize:19,fontWeight:700,cursor:"pointer"}}>Close</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:16}}>
        {messages.map((msg,i)=>(
          <div key={i} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start",marginBottom:12}}>
            {msg.role==="assistant"&&<div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#FF6534,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,marginRight:8,flexShrink:0,alignSelf:"flex-end"}}>{avatar}</div>}
            <div style={{maxWidth:"78%",padding:"11px 14px",borderRadius:msg.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:msg.role==="user"?"#FF6534":"#FFFFFF",color:"#1A1208",fontSize:30,lineHeight:1.65,border:msg.role==="user"?"none":"1px solid #E8DDD0"}}>{msg.content}</div>
          </div>
        ))}
        {loading&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#FF6534,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🤖</div>
          <div style={{padding:"11px 14px",borderRadius:"14px 14px 14px 4px",background:"#FFFFFF",border:"1px solid #E8DDD0"}}>
            <div style={{display:"flex",gap:4}}>
              {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#786858",animation:"bounce 1s "+i*0.2+"s infinite"}}/>)}
            </div>
          </div>
        </div>}
        <div ref={endRef}/>
      </div>
      <div style={{padding:"12px 16px",borderTop:"1px solid #E8DDD0",display:"flex",gap:8,flexShrink:0}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Type a message..." style={{flex:1,background:"#FAF7F2",border:"1px solid #E8DDD0",borderRadius:22,padding:"11px 16px",color:"#1A1208",fontSize:19,outline:"none"}}/>
        <button onClick={send} disabled={loading||!input.trim()} style={{background:"#FF6534",border:"none",borderRadius:"50%",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",opacity:loading||!input.trim()?0.5:1,flexShrink:0,color:"#fff",fontSize:22}}>up</button>
      </div>
      <style>{"@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}"}</style>
    </div>
  );
}

function VoiceCall({person,systemPrompt,avatar,onClose}){
  const [callState,setCallState]=useState("connecting");
  const [aiState,setAiState]=useState("idle");
  const [duration,setDuration]=useState(0);
  const [transcript,setTranscript]=useState([]);
  const [isRecording,setIsRecording]=useState(false);
  const [lang,setLang]=useState("en-IN");
  const [inputText,setInputText]=useState("");
  const [useText,setUseText]=useState(false);
  const [ended,setEnded]=useState(false);
  const synthRef=useRef(window.speechSynthesis);
  const recogRef=useRef(null);
  const durRef=useRef(null);
  const histRef=useRef([]);
  const speechOK=!!(window.SpeechRecognition||window.webkitSpeechRecognition);

  function getVoice(){
    const vs=(synthRef.current&&synthRef.current.getVoices())||[];
    if(lang==="hi-IN")return vs.find(v=>v.lang==="hi-IN")||vs.find(v=>v.lang==="en-IN")||vs[0];
    return vs.find(v=>v.lang==="en-IN")||vs.find(v=>v.name&&v.name.includes("India"))||vs.find(v=>v.lang&&v.lang.startsWith("en"))||vs[0];
  }
  function speak(text){
    if(!synthRef.current)return;
    synthRef.current.cancel();setAiState("speaking");
    const utt=new SpeechSynthesisUtterance(text);
    const voice=getVoice();if(voice)utt.voice=voice;
    utt.rate=0.88;utt.pitch=1.0;utt.volume=1.0;
    utt.onend=()=>setAiState("waiting");utt.onerror=()=>setAiState("waiting");
    synthRef.current.speak(utt);
    histRef.current=[...histRef.current,{role:"assistant",content:text}];
    setTranscript(t=>[...t,{role:"assistant",text}]);
  }
  async function getReply(userText){
    setAiState("thinking");
    try{
      const res=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:120,system:systemPrompt+" VOICE CALL: Max 1-2 short sentences. Sound human and natural. "+(lang==="hi-IN"?"Reply in Hinglish.":"Indian English."),messages:[...histRef.current,{role:"user",content:userText}]})});
      const data=await res.json();
      speak((data.content&&data.content[0]&&data.content[0].text)||"Keep going, you are doing great.");
    }catch{speak(person==="saksham"?"Yaar, connection issue. But you are doing great!":"Connection issue. You are doing well, keep going.");}
  }
  useEffect(()=>{
    const t=setTimeout(()=>{
      setCallState("active");
      durRef.current=setInterval(()=>setDuration(d=>d+1),1000);
      const greeting=person==="saksham"?(lang==="hi-IN"?"Arre yaar! Kya haal hai?":"Hey! Good to connect. How are things going?"):"Hey! Good to talk. What is on your mind today?";
      setTimeout(()=>speak(greeting),800);
    },1800);
    return()=>{clearTimeout(t);clearInterval(durRef.current);if(synthRef.current)synthRef.current.cancel();if(recogRef.current)recogRef.current.stop();};
  },[]);

  function startRec(){
    if(!speechOK){setUseText(true);return;}
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    const r=new SR();r.lang=lang;r.continuous=false;r.interimResults=false;
    r.onstart=()=>{setIsRecording(true);setAiState("listening");};
    r.onresult=(e)=>{
      const text=e.results[0][0].transcript;
      histRef.current=[...histRef.current,{role:"user",content:text}];
      setTranscript(t=>[...t,{role:"user",text}]);
      setIsRecording(false);getReply(text);
    };
    r.onerror=()=>{setIsRecording(false);setAiState("waiting");};
    r.onend=()=>setIsRecording(false);
    recogRef.current=r;r.start();
  }
  function stopRec(){if(recogRef.current)recogRef.current.stop();setIsRecording(false);}
  function sendText(){
    if(!inputText.trim())return;
    const text=inputText.trim();
    histRef.current=[...histRef.current,{role:"user",content:text}];
    setTranscript(t=>[...t,{role:"user",text}]);
    setInputText("");getReply(text);
  }
  function endCall(){if(synthRef.current)synthRef.current.cancel();if(recogRef.current)recogRef.current.stop();clearInterval(durRef.current);setEnded(true);}

  const pulsing=aiState==="speaking";
  const mins=Math.floor(duration/60),secs=duration%60;
  const pad2=n=>String(n).padStart(2,"0");

  return (
    <div style={{position:"fixed",inset:0,zIndex:1002,background:"#F5F0E8",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{width:"100%",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:6}}>
          {[["en-IN","EN-IN"],["hi-IN","हिंदी"]].map(([l,label])=>(
            <button key={l} onClick={()=>setLang(l)} style={{background:lang===l?"rgba(0,217,170,0.15)":"transparent",border:"1px solid "+(lang===l?"#00D9AA":"#786858"),borderRadius:20,padding:"4px 10px",color:lang===l?"#00D9AA":"#786858",fontSize:30,fontWeight:700,cursor:"pointer"}}>{label}</button>
          ))}
        </div>
        <div style={{fontSize:19,color:"#786858",fontVariantNumeric:"tabular-nums"}}>{pad2(mins)}:{pad2(secs)}</div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,width:"100%"}}>
        <div style={{position:"relative",width:140,height:140,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {pulsing&&[1,2,3].map(i=>(
            <div key={i} style={{position:"absolute",width:140+i*36,height:140+i*36,borderRadius:"50%",border:"2px solid #00D9AA",opacity:0.3/i,animation:"callpulse "+(1+i*0.3)+"s ease-out "+(i*0.2)+"s infinite"}}/>
          ))}
          <div style={{width:140,height:140,borderRadius:"50%",background:"linear-gradient(135deg,#FF6534,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:56,zIndex:1}}>{avatar}</div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontWeight:900,fontSize:34,color:"#1A1208",marginBottom:4}}>{person==="saksham"?"Saksham":"AI Coach"}</div>
          <div style={{fontSize:30,fontWeight:600,color:ended?"#786858":callState==="connecting"?"#FFB800":aiState==="listening"?"#FF6534":aiState==="thinking"?"#FFB800":aiState==="speaking"?"#00D9AA":"rgba(0,217,170,0.4)"}}>
            {ended?"Call ended":callState==="connecting"?"Connecting...":aiState==="listening"?"Listening...":aiState==="thinking"?"Thinking...":aiState==="speaking"?"Speaking...":"Ready"}
          </div>
        </div>
        {transcript.length>0&&(
          <div style={{width:"100%",maxWidth:320,maxHeight:100,overflowY:"auto",padding:"0 20px"}}>
            {transcript.slice(-2).map((msg,i)=>(
              <div key={i} style={{marginBottom:6,textAlign:msg.role==="user"?"right":"left"}}>
                <span style={{display:"inline-block",background:msg.role==="user"?"#FF6534":"#FFFFFF",border:msg.role==="assistant"?"1px solid #E8DDD0":"none",borderRadius:10,padding:"6px 12px",fontSize:19,color:"#1A1208",maxWidth:"85%",lineHeight:1.4}}>{msg.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{width:"100%",padding:"0 24px 40px"}}>
        {ended?(
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:30,color:"#786858",marginBottom:16}}>{pad2(mins)}:{pad2(secs)} - {transcript.filter(t=>t.role==="user").length} exchanges</div>
            <button onClick={onClose} style={{background:"#FF6534",border:"none",borderRadius:12,padding:"14px 40px",color:"#fff",fontWeight:700,fontSize:30,cursor:"pointer"}}>Done</button>
          </div>
        ):(
          <>
            {!useText?(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
                {speechOK?(
                  <button onMouseDown={startRec} onTouchStart={startRec} onMouseUp={stopRec} onTouchEnd={stopRec}
                    disabled={aiState==="speaking"||aiState==="thinking"||callState==="connecting"}
                    style={{width:72,height:72,borderRadius:"50%",background:isRecording?"#FF6534":"rgba(255,101,52,0.2)",border:"2px solid "+(isRecording?"#FF6534":"#786858"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,cursor:"pointer",opacity:aiState==="speaking"||aiState==="thinking"?0.4:1}}>
                    🎤
                  </button>
                ):(
                  <button onClick={()=>setUseText(true)} style={{background:"rgba(0,217,170,0.15)",border:"1px solid #00D9AA",borderRadius:12,padding:"12px 24px",color:"#00D9AA",fontWeight:700,fontSize:30,cursor:"pointer"}}>Use text input</button>
                )}
                <div style={{fontSize:30,color:"#C8B8A8"}}>{isRecording?"Release to send":"Hold mic to speak"}</div>
                <button onClick={()=>setUseText(true)} style={{background:"none",border:"none",color:"#C8B8A8",fontSize:30,cursor:"pointer",textDecoration:"underline"}}>Type instead</button>
              </div>
            ):(
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <input value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendText()} placeholder="Type your message..." disabled={aiState==="speaking"||aiState==="thinking"} style={{flex:1,background:"#FAF7F2",border:"1px solid #E8DDD0",borderRadius:22,padding:"11px 16px",color:"#1A1208",fontSize:30,outline:"none"}}/>
                  <button onClick={sendText} disabled={!inputText.trim()||aiState==="speaking"||aiState==="thinking"} style={{background:"#FF6534",border:"none",borderRadius:"50%",width:44,height:44,color:"#fff",fontSize:34,cursor:"pointer",flexShrink:0,opacity:!inputText.trim()?0.5:1}}>up</button>
                </div>
                {speechOK&&<button onClick={()=>setUseText(false)} style={{background:"none",border:"none",color:"#C8B8A8",fontSize:30,cursor:"pointer",textDecoration:"underline"}}>Use voice instead</button>}
              </div>
            )}
            <button onClick={endCall} style={{width:"100%",background:"#FF3B30",border:"none",borderRadius:12,padding:14,color:"#fff",fontWeight:700,fontSize:30,cursor:"pointer",marginTop:8}}>End Call</button>
          </>
        )}
      </div>
      <style>{"@keyframes callpulse{0%{transform:scale(0.95);opacity:0.7}70%{transform:scale(1.15);opacity:0}100%{opacity:0}}"}</style>
    </div>
  );
}

function ScoreRing({score}){
  const r=52,circ=2*Math.PI*r;
  const color=score<40?C.accent:score<70?C.amber:C.teal;
  const label=score<20?"Critical":score<40?"Recovering":score<60?"Healing":score<80?"Strong":score<96?"Thriving":"Transformed";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <div style={{position:"relative",width:120,height:120}}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{transform:"rotate(-90deg)"}}>
          <circle cx="60" cy="60" r={r} fill="none" stroke={C.border} strokeWidth="8"/>
          <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circ} strokeDashoffset={circ*(1-score/100)}
            strokeLinecap="round" style={{transition:"stroke-dashoffset 1s ease"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontSize:32,fontWeight:900,color,lineHeight:1}}>{score}</div>
          <div style={{fontSize:19,color:C.sub,marginTop:1}}>/ 100</div>
        </div>
      </div>
      <div style={{fontSize:30,fontWeight:700,color,letterSpacing:"0.06em",textTransform:"uppercase"}}>{label}</div>
      <div style={{fontSize:30,color:C.sub}}>Recovery score</div>
    </div>
  );
}


// ── SAKSHAM REAL CHAT (Firestore-based) ────────────────────
function SakshamChat({userPhone, userName, d, healthScore, onClose}){
  const [messages, setMessages] = useState([
    {id:"welcome", role:"saksham", text:"Hey! "+d+" days smoke-free. That is real. What is going on?", ts:Date.now()-1000}
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("online");
  const endRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(()=>{
    loadMessages();
    pollRef.current = setInterval(loadMessages, 4000);
    return()=>clearInterval(pollRef.current);
  },[]);

  useEffect(()=>{endRef.current&&endRef.current.scrollIntoView({behavior:"smooth"});},[messages]);

  async function loadMessages(){
    try{
      const conv = await FB.get("conversations/"+userPhone);
      if(conv&&conv.messages&&conv.messages.length>0){
        setMessages([
          {id:"welcome", role:"saksham", text:"Hey! "+d+" days smoke-free. That is real. What is going on?", ts:0},
          ...conv.messages.sort((a,b)=>a.ts-b.ts)
        ]);
      }
    }catch{}
  }

  async function send(){
    if(!input.trim()||sending) return;
    const text = input.trim();
    setInput("");setSending(true);
    const msg = {id:String(Date.now()), role:"user", text, ts:Date.now(), senderName:userName, read:false};
    setMessages(m=>[...m, msg]);
    try{
      const conv = await FB.get("conversations/"+userPhone) || {};
      const existing = conv.messages || [];
      await FB.set("conversations/"+userPhone, {
        userPhone, userName, d, healthScore,
        lastMessage:text, lastActivity:Date.now(),
        unread:(conv.unread||0)+1,
        messages:[...existing, msg]
      });
    }catch{}
    setSending(false);
  }

  const timeStr = (ts) => {
    const d2 = new Date(ts);
    return d2.getHours()+":"+String(d2.getMinutes()).padStart(2,"0");
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:999,background:"#F5F0E8",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{paddingTop:"max(48px, env(safe-area-inset-top, 48px))",paddingBottom:14,paddingLeft:16,paddingRight:16,borderBottom:"1px solid #E8DDD0",display:"flex",alignItems:"center",gap:12,flexShrink:0,background:"linear-gradient(180deg,#FAF7F2,#F5F0E8)"}}>
        <div style={{width:42,height:42,borderRadius:"50%",background:"linear-gradient(135deg,#C9A84C,#E8A020)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,flexShrink:0,fontWeight:900,color:"#F5F0E8",boxShadow:"0 4px 12px rgba(201,168,76,0.3)"}}>S</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:800,fontSize:30,color:"#1A1208"}}>Saksham</div>
          <div style={{fontSize:30,color:"#10C9A0",marginTop:1}}>Founder - Will respond soon</div>
        </div>
        <button onClick={onClose} style={{background:"#FAF7F2",border:"1px solid #E8DDD0",borderRadius:20,padding:"6px 14px",color:"#68788A",fontSize:19,fontWeight:600,cursor:"pointer"}}>Close</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 16px"}}>
        {messages.map(msg=>(
          <div key={msg.id} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start",marginBottom:14}}>
            {msg.role==="saksham"&&<div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#C9A84C,#E8A020)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,marginRight:8,flexShrink:0,alignSelf:"flex-end",color:"#F5F0E8",fontWeight:900}}>S</div>}
            <div style={{maxWidth:"78%"}}>
              <div style={{padding:"12px 16px",borderRadius:msg.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:msg.role==="user"?"linear-gradient(135deg,#C9A84C,#E8A020)":"#FAF7F2",color:msg.role==="user"?"#F5F0E8":"#1A1208",fontSize:30,lineHeight:1.7,border:msg.role==="user"?"none":"1px solid #E8DDD0",boxShadow:msg.role==="user"?"0 4px 16px rgba(201,168,76,0.2)":"none"}}>{msg.text}</div>
              {msg.ts>1000&&<div style={{fontSize:30,color:"#C8B8A8",marginTop:4,textAlign:msg.role==="user"?"right":"left"}}>{timeStr(msg.ts)}</div>}
            </div>
          </div>
        ))}
        {sending&&<div style={{textAlign:"left",padding:"8px 16px",fontSize:19,color:"#68788A"}}>Sending...</div>}
        <div ref={endRef}/>
      </div>
      <div style={{padding:"12px 16px",paddingBottom:"calc(env(safe-area-inset-bottom, 0px) + 12px)",borderTop:"1px solid #E8DDD0",display:"flex",gap:10,flexShrink:0,background:"#FAF7F2"}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Message Saksham..." style={{flex:1,minWidth:0,background:"#FFFFFF",border:"1px solid #E8DDD0",borderRadius:24,padding:"12px 16px",color:"#1A1208",fontSize:19,outline:"none"}}/>
        <button onClick={send} disabled={sending||!input.trim()} style={{background:"linear-gradient(135deg,#C9A84C,#E8A020)",border:"none",borderRadius:"50%",width:46,height:46,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",opacity:sending||!input.trim()?0.4:1,flexShrink:0,boxShadow:"0 4px 12px rgba(201,168,76,0.3)"}}>
          <span style={{color:"#F5F0E8",fontSize:19,fontWeight:900}}>up</span>
        </button>
      </div>
    </div>
  );
}

const BANNERS=[
    // To use image ads: add image:"https://your-ad-image-url.jpg" to any banner
    // Leave image field out to use emoji placeholder
  {id:"b1",tag:"Sponsored",brand:"Nicotex",image:null,headline:"Nicotine patches clinically proven to double quit success",cta:"Get 20% off",color:"#0A8A6A",emoji:"💊",url:"https://nicotex.in"},
  {id:"b2",tag:"Sponsored",brand:"Quit Genius",image:null,headline:"AI-powered CBT therapy for nicotine addiction — free trial",cta:"Try free",color:"#7050A8",emoji:"🧠",url:"https://quitgenius.com"},
  {id:"b3",tag:"Partner",brand:"Apollo Pharmacy",image:null,headline:"Find NRT products near you — delivered in 2 hours",cta:"Order now",color:"#B87000",emoji:"🏥",url:"https://apollopharmacy.in"},
];

// ── APP CONSTANTS (module level) ──────────────────────

const MILESTONES=[
  {min:20,icon:"heart",label:"Heart rate drops to normal"},
  {min:480,icon:"drop",label:"Carbon monoxide clears from blood"},
  {min:1440,icon:"flex",label:"Heart attack risk starts falling"},
  {min:2880,icon:"nose",label:"Taste and smell begin recovering"},
  {min:4320,icon:"wind",label:"Breathing becomes easier"},
  {min:20160,icon:"heart2",label:"Circulation improves significantly"},
  {min:43800,icon:"lung",label:"Lung function up by 30 percent"},
  {min:131400,icon:"star",label:"Coughing and breathlessness reduce"},
  {min:525600,icon:"trophy",label:"Heart disease risk cut in half"},
  {min:2628000,icon:"star2",label:"Stroke risk equals a non-smoker"},
  {min:5256000,icon:"target",label:"Lung cancer risk halved"},
  {min:7884000,icon:"crown",label:"Heart disease risk equals non-smoker"},
];

const LESSONS=[
  {tag:"SCIENCE",color:C.teal,title:"The Craving Lie",body:"A craving is not your body asking for nicotine. It is a trained reflex. The nicotine is gone in 72 hours. What remains is the pattern. Patterns can be unlearned.",key:"The craving is a ghost. It has no real power over you."},
  {tag:"TECHNIQUE",color:C.accent,title:"The 5-Minute Rule",body:"Every craving peaks and passes in under 5 minutes. Your brain creates the sensation of emergency but it is not an emergency. Start a timer. Do anything else. When it ends, the craving will have passed.",key:"You do not fight cravings. You just outlast them."},
  {tag:"MINDSET",color:C.purple,title:"Identity, Rewritten",body:"Most people say I am trying to quit smoking. Try instead: I do not smoke. That shift is the difference between struggle and freedom.",key:"You are not a smoker who quit. You are a non-smoker."},
  {tag:"CBT",color:C.teal,title:"Triggers Are Information",body:"A trigger does not cause you to smoke. It causes you to think about smoking. Between the trigger and the cigarette there is always a gap. CBT works by expanding that gap.",key:"Log your triggers. Awareness is the first act of choice."},
  {tag:"SCIENCE",color:C.accent,title:"Already Healing",body:"The moment you stopped smoking, your body began repairing itself. Within 20 minutes your heart rate normalized. Within 8 hours blood oxygen rose. Every cigarette you do not smoke is your body getting more of what it is already doing.",key:"Recovery is already happening. You just need to let it."},
  {tag:"MINDSET",color:C.purple,title:"The Real Cost of One",body:"One cigarette does not satisfy the pattern, it re-activates it. One almost always leads back to regular smoking within a week. The only one that works is the one you never smoke.",key:"There is no such thing as just one."},
];

const CHALLENGES=["When a craving hits today, name 5 things you can see around you right now.","Take a 10-minute walk the next time you think about smoking.","Text someone you love that you have been smoke-free.","Drink a full glass of cold water every time a craving comes.","Do 10 deep breaths before opening any social app today.","Write down one thing quitting has already given you.","Notice your sense of taste or smell today. It is coming back.","Tell one person in your life about your quit journey.","When a craving hits, count to 60 before doing anything else.","Identify your number one trigger today and plan a substitute action.","Drink a herbal tea slowly, the way you used to smoke slowly.","Name 3 physical improvements you have noticed since quitting.","Replace your usual smoking time with a 5-minute stretch.","Think of one person who would be proud of you right now. Text them.","Write down what you will do with the money you are saving."];

const REFRAMES=[{trigger:"I am stressed and need it",reframe:"Stress existed before smoking. A cigarette delays relief, it does not solve the stress."},{trigger:"I will just have one",reframe:"One cigarette relights a pattern that was nearly out. There is no just one for someone quitting."},{trigger:"I have done well, I deserve it",reframe:"You have done well. The reward is everything you have already built, not a step backwards."},{trigger:"Everyone around me is smoking",reframe:"They are feeding a habit they probably wish they could quit. You already did what they have not."},{trigger:"I cannot focus without it",reframe:"That is withdrawal talking, not reality. It passes in 3 minutes. Wait it out."}];

const MOODS=[{v:1,e:"😰",l:"Rough"},{v:2,e:"😕",l:"Tough"},{v:3,e:"😐",l:"Okay"},{v:4,e:"🙂",l:"Good"},{v:5,e:"😊",l:"Great"}];

const TRIGGERS=["Stress","Coffee","After meal","Alcohol","Social","Boredom","Driving","Morning","Work break","Phone call"];

const ACHIEVEMENTS=[{id:"1h",label:"1 Hour",icon:"⚡",min:60},{id:"1d",label:"1 Day",icon:"🌅",min:1440},{id:"3d",label:"3 Days",icon:"🔥",min:4320},{id:"1w",label:"1 Week",icon:"🏅",min:10080},{id:"2w",label:"2 Weeks",icon:"💫",min:20160},{id:"1m",label:"1 Month",icon:"🏆",min:43800}];

const PHASES=[{phase:"inhale",dur:4000,label:"Breathe in",color:C.teal},{phase:"hold",dur:7000,label:"Hold",color:C.accent},{phase:"exhale",dur:8000,label:"Breathe out",color:C.purple}];

const QUOTES=["Quitting is not about willpower. It is about changing how you see cigarettes.","Every minute without one is your lungs quietly thanking you.","The urge to smoke is a reflex, not a need. Watch it pass.","You are not giving something up. You are getting everything back.","A craving is proof your brain is rewiring. It is working.","The hardest part is believing it is hard. It gets easier by the hour."];

const EXERCISES=[
  {day:"Monday",theme:"Morning Mobility",duration:"15 min",moves:[
    {name:"Neck Rolls",reps:"10 each side",why:"Releases tension from sleep"},
    {name:"Shoulder Rolls",reps:"15 circles",why:"Opens chest tightened by smoking"},
    {name:"Hip Circles",reps:"10 each side",why:"Wakes up core and spine"},
    {name:"Standing Forward Fold",reps:"Hold 30s x 3",why:"Calms nervous system, reduces craving anxiety"},
    {name:"Deep Diaphragmatic Breathing",reps:"5 min",why:"Rebuilds lung capacity post-smoking"},
  ]},
  {day:"Tuesday",theme:"Cardio Burst",duration:"15 min",moves:[
    {name:"Jumping Jacks",reps:"3 sets of 30s",why:"Releases endorphins that replace nicotine reward"},
    {name:"High Knees",reps:"3 sets of 20s",why:"Boosts dopamine naturally"},
    {name:"Mountain Climbers",reps:"3 sets of 15",why:"Full body activation, burns restlessness"},
    {name:"Rest Walk in Place",reps:"1 min between sets",why:"Active recovery, keeps momentum"},
  ]},
  {day:"Wednesday",theme:"Upper Body",duration:"15 min",moves:[
    {name:"Push-Ups",reps:"3 sets of 8-12",why:"Builds strength, occupies the hands"},
    {name:"Tricep Dips on Chair",reps:"3 sets of 10",why:"Arms that held cigarettes now lift weight"},
    {name:"Arm Circles",reps:"30s forward, 30s back",why:"Shoulder mobility and blood flow"},
    {name:"Wall Push-Ups",reps:"2 sets of 15",why:"Gentler option, same benefit"},
  ]},
  {day:"Thursday",theme:"Core Strength",duration:"15 min",moves:[
    {name:"Plank Hold",reps:"3 x 20-40 seconds",why:"Core strength improves posture damaged by smoking"},
    {name:"Crunches",reps:"3 sets of 15",why:"Activates deep breathing muscles"},
    {name:"Leg Raises",reps:"3 sets of 10",why:"Lower core, stabilizes breathing"},
    {name:"Bicycle Crunches",reps:"2 sets of 20",why:"Coordination that replaces smoking rituals"},
  ]},
  {day:"Friday",theme:"Lower Body",duration:"15 min",moves:[
    {name:"Squats",reps:"3 sets of 15",why:"Largest muscle group, maximum endorphin release"},
    {name:"Reverse Lunges",reps:"3 sets of 10 each leg",why:"Balance and focus, counters brain fog"},
    {name:"Glute Bridges",reps:"3 sets of 15",why:"Activates hip flexors tightened from sitting and smoking"},
    {name:"Calf Raises",reps:"3 sets of 20",why:"Improves circulation that nicotine had restricted"},
  ]},
  {day:"Saturday",theme:"Yoga Flow",duration:"15 min",moves:[
    {name:"Child Pose",reps:"Hold 1 min",why:"Calms the fight-or-flight craving response"},
    {name:"Downward Dog",reps:"Hold 30s x 3",why:"Opens lungs, improves oxygen flow"},
    {name:"Warrior I",reps:"Hold 30s each side",why:"Confidence and groundedness"},
    {name:"Seated Twist",reps:"Hold 30s each side",why:"Detoxifies organs stressed by smoking"},
    {name:"Legs Up The Wall",reps:"5 min",why:"Best craving killer, calms the entire nervous system"},
  ]},
  {day:"Sunday",theme:"Active Recovery",duration:"15 min",moves:[
    {name:"Gentle Walk",reps:"10 min easy pace",why:"Fresh air replaces the outdoor smoking ritual"},
    {name:"Full Body Stretch",reps:"5 min",why:"Recovery and reflection"},
    {name:"Gratitude Breathing",reps:"10 deep breaths",why:"Acknowledge what your lungs are gaining back"},
  ]},
];

const VEG_FOODS=[
  {name:"Raw Carrot Sticks",reason:"Crunching satisfies the oral fixation. The act of biting replaces the hand-to-mouth habit.",emoji:"🥕"},
  {name:"Sunflower Seeds",reason:"Shelling seeds keeps hands and mouth busy, directly replacing the smoking ritual.",emoji:"🌻"},
  {name:"Tulsi or Ginger Tea",reason:"Warm beverages replace the ritual comfort of a cigarette. Tulsi calms the nervous system.",emoji:"🍵"},
  {name:"Orange or Lemon",reason:"Citrus boosts Vitamin C depleted by nicotine. The sharp taste overrides craving signals.",emoji:"🍊"},
  {name:"Celery with Hummus",reason:"Low calorie, high satiety. The crunch and chewing action is a direct craving disruptor.",emoji:"🥬"},
  {name:"Dark Chocolate (1 piece)",reason:"Releases dopamine just like nicotine did, but without the harm. One small piece is enough.",emoji:"🍫"},
  {name:"Almonds or Walnuts",reason:"Healthy fats stabilise blood sugar which spikes during nicotine withdrawal and triggers cravings.",emoji:"🥜"},
];

const NONVEG_FOODS=[
  {name:"Boiled Egg",reason:"High protein stabilises blood sugar, reducing the hunger-like feeling that triggers cravings.",emoji:"🥚"},
  {name:"Grilled Fish",reason:"Omega-3 fatty acids help repair brain receptors damaged by nicotine over time.",emoji:"🐟"},
  {name:"Chicken Soup",reason:"Warm, comforting, and nutritious. Replaces the warmth and ritual comfort of smoking.",emoji:"🍲"},
  {name:"Greek Yogurt",reason:"Probiotic cultures reduce cortisol, the stress hormone that drives most cravings.",emoji:"🥛"},
  {name:"Tuna with Crackers",reason:"Protein and complex carbs together prevent the blood sugar dips that trigger craving episodes.",emoji:"🐠"},
];

const PREP_DAYS=[
  {day:1,title:"Why You Really Smoke",duration:"15 min",type:"read",content:"Nicotine is not what keeps you smoking. The physical withdrawal from nicotine lasts 3 days and feels like mild flu. What keeps you coming back is the psychological association — the belief that cigarettes give you something. Pleasure, relief, focus, a break. None of that is real. The cigarette does not create those feelings. It briefly relieves the withdrawal it caused. This is the trap. Today, just observe when you smoke. Notice what you tell yourself it is giving you.",exercise:"Each time you smoke today, pause before lighting and write down one word: what do you think this cigarette is about to give you?",key:"The cigarette gives you nothing. It relieves the craving it created."},
  {day:2,title:"The Nicotine Trap Explained",duration:"15 min",type:"read",content:"When you smoke, nicotine floods your brain within 10 seconds. Dopamine releases. You feel good. But your brain adapts — it reduces its own dopamine production to compensate. Now you need nicotine just to feel normal. Without it, you feel anxious, irritable, unable to focus. You smoke and feel relief. But that relief is just the restoration of the state every non-smoker lives in permanently, without effort. Non-smokers are not deprived. They simply have no trap.",exercise:"Write down 3 moments today where you felt a craving. What was happening just before it? This is your trigger map.",key:"You are not giving up a pleasure. You are escaping a trap."},
  {day:3,title:"The Identity Shift",duration:"15 min",type:"read",content:"Most people say: I am trying to quit smoking. The word trying assumes failure is likely. The word quit implies loss. Try instead: I am a non-smoker. Not will be. Am. This is not a trick. Your brain responds to identity differently from goals. A goal is something you chase. An identity is something you live. From today, when someone offers you a cigarette, you do not say no thank you I am quitting. You say no thank you I do not smoke.",exercise:"Say the phrase I do not smoke out loud 10 times. Notice how it feels different from I am trying to quit.",key:"You are not a smoker who quit. You are a non-smoker who used to smoke."},
  {day:4,title:"What Cravings Actually Are",duration:"10 min",type:"read",content:"A craving is not a need. It is a signal. Specifically, it is your brain recognising a pattern — coffee, stress, meals, driving — and firing a learned response: light a cigarette. The pattern was trained. It can be untrained. The important thing to know: every craving peaks within 3 minutes and passes completely within 5, whether you smoke or not. You do not fight cravings. You simply wait. The craving is not a sign you need to smoke. It is a sign your brain is rewiring.",exercise:"The next time a craving hits, start a timer. Breathe slowly. Watch the minutes pass. Note: did it pass?",key:"Every craving is a wave. It builds, peaks, and breaks. You only need to stay standing."},
  {day:5,title:"The Ritual Replacement",duration:"15 min",type:"read",content:"Smoking is not just chemical — it is behavioural. The act of stepping outside. Holding something. The pause from work. The hand-to-mouth motion. These are habits layered on top of the addiction. When you stop smoking, these rituals do not automatically disappear. You need to replace them consciously, not with willpower, but with better rituals. A walk. A glass of cold water. A minute of breathing. Something that gives you the pause without the poison.",exercise:"Identify your 2 most consistent smoking rituals and write a replacement for each. Be specific. Not I will go for a walk. I will walk to the water cooler and back.",key:"Replace the ritual, not just the cigarette."},
  {day:6,title:"Social Pressure and How to Handle It",duration:"10 min",type:"read",content:"The hardest moments after quitting are not cravings. They are social situations. A drink with friends who smoke. Office culture. A family member who offers. The people around you are not trying to make you fail. They are in the trap themselves and may feel uncomfortable that you escaped. You do not owe anyone an explanation. I do not smoke is a complete sentence. You do not need to justify a decision that is saving your life.",exercise:"Prepare your response to three scenarios: friend offering a cigarette, colleague smoking break, stress moment at work. Rehearse them in your head.",key:"I do not smoke is a complete sentence."},
  {day:7,title:"Your Quit Day",duration:"20 min",type:"ceremony",content:"Today is the day. You have spent 6 days understanding exactly why you smoked and exactly why none of it was real. You are not giving up anything. You are removing a trap that cost you money, health, and control over your own mind. Saksham smoked his last cigarette on October 31, 2024. He did not feel deprived. He felt free. That feeling is available to you right now. Not tomorrow. Now. Smoke your last cigarette with full awareness. Notice it has no special power. Then put it down and do not pick another one up.",exercise:"Write down the exact time of your last cigarette. This is your quit timestamp. Enter it in the app.",key:"Freedom is not what happens after you quit. It is the moment you decide."},
];

const todayExercise=EXERCISES[new Date().getDay()===0?6:new Date().getDay()-1];

function App(){
  const [ready,setReady]=useState(false);
  const [authStep,setAuthStep]=useState(null);
  const [authUser,setAuthUser]=useState(null);
  const [authPhone,setAuthPhone]=useState("");
  const [authName,setAuthName]=useState("");
  const [authPhoto,setAuthPhoto]=useState(null);
  const [authOtpCode,setAuthOtpCode]=useState("");
  const [authOtpInput,setAuthOtpInput]=useState(["","","","","",""]);
  const [authError,setAuthError]=useState("");
  const [authLoading,setAuthLoading]=useState(false);
  const [otpTries,setOtpTries]=useState(0);
  const [otpLocked,setOtpLocked]=useState(false);
  const [isSignIn,setIsSignIn]=useState(false);
  const [fbStatus,setFbStatus]=useState(null); // null | testing | ok | fail
  const [showProfile,setShowProfile]=useState(false);
  const [profileCam,setProfileCam]=useState(false);
  const profileVideoRef=useRef(null);
  const profileStreamRef=useRef(null);
  const otpRefs=[useRef(null),useRef(null),useRef(null),useRef(null),useRef(null),useRef(null)];

  const [step,setStep]=useState(0);
  const [quitTS,setQuitTS]=useState(null);
  const [cpd,setCpd]=useState("20");
  const [pp,setPP]=useState("300");
  const [cpp,setCpp]=useState("20");
  const [sDate,setSDate]=useState("");
  const [sTime,setSTime]=useState("00:00");
  const [tab,setTab]=useState("home");
  const [now,setNow]=useState(Date.now());
  const [userId,setUserId]=useState(null);
  const [userName,setUserName]=useState("");
  const [entries,setEntries]=useState([]);
  const [read,setRead]=useState([]);
  const [moods,setMoods]=useState({});
  const [goalName,setGoalName]=useState("");
  const [goalAmt,setGoalAmt]=useState("");
  const [isPremium,setIsPremium]=useState(false);
  const [msgThread,setMsgThread]=useState([]);
  const [msgInput,setMsgInput]=useState("");
  const [msgSending,setMsgSending]=useState(false);
  const [msgUnread,setMsgUnread]=useState(0);
  const [msgPollRef,setMsgPollRef]=useState(null);
  const [myStreaks,setMyStreaks]=useState([]);
  const [showPremium,setShowPremium]=useState(false);
  const [challengeDone,setChallengeDone]=useState(()=>localStorage.getItem('cd_'+new Date().toDateString())==='1');
  const [showHomePrompt,setShowHomePrompt]=useState(false);
  const [premiumScreen,setPremiumScreen]=useState(null);
  const [showFounderStory,setShowFounderStory]=useState(false);
  const [nrtCigsLocal,setNrtCigsLocal]=useState("20");
  const [showShare,setShowShare]=useState(false);
  const [showStory,setShowStory]=useState(false);
  const [showSlipped,setShowSlipped]=useState(false);
  const [breathOn,setBreathOn]=useState(false);
  const [bStep,setBStep]=useState(0);
  const [bPhase,setBPhase]=useState("inhale");
  const [cSec,setCSec]=useState(300);
  const [cRun,setCRun]=useState(false);
  const [rfOpen,setRfOpen]=useState(null);
  const [lsnOpen,setLsnOpen]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [lTags,setLTags]=useState([]);
  const [lInt,setLInt]=useState(5);
  const [lRes,setLRes]=useState(true);
  const [lNote,setLNote]=useState("");
  const [journalText,setJournalText]=useState("");
  const [journalEntries,setJournalEntries]=useState([]);
  const [showJournal,setShowJournal]=useState(false);
  const [communityPosts,setCommunityPosts]=useState([]);
  const [communityInput,setCommunityInput]=useState("");
  const [communityPosting,setCommunityPosting]=useState(false);
  const [friends,setFriends]=useState([]);
  const [friendInput,setFriendInput]=useState("");
  const [friendStatus,setFriendStatus]=useState("");
  const [peerChat,setPeerChat]=useState(null);
  const [peerMsgs,setPeerMsgs]=useState([]);
  const [peerInput,setPeerInput]=useState("");
  const [peerSending,setPeerSending]=useState(false);
  const [myPublicId,setMyPublicId]=useState("");
  const [sessionToken,setSessionToken]=useState("");
  const [forcedOut,setForcedOut]=useState(false);
  const [copied,setCopied]=useState(false);
  const [snapPhoto,setSnapPhoto]=useState(null);
  const [showCamera,setShowCamera]=useState(false);
  const [cameraFacing,setCameraFacing]=useState("user");
  const [cameraErr,setCameraErr]=useState("");
  const videoRef=useRef(null);
  const streamRef=useRef(null);
  const [mySentSnap,setMySentSnap]=useState(null);
  const [codeInput,setCodeInput]=useState("");
  const [snapStatus,setSnapStatus]=useState("");
  const [snapMsg,setSnapMsg]=useState("");
  const [sendingSnap,setSendingSnap]=useState(false);
  const [viewingSnap,setViewingSnap]=useState(null);
  const [celebMS,setCelebMS]=useState(null);
  const [prevAchieved,setPrevAchieved]=useState(0);
  const [nameInput,setNameInput]=useState("");
  const [camPerm,setCamPerm]=useState(null);
  const [micPerm,setMicPerm]=useState(null);
  const [photoPerm,setPhotoPerm]=useState(null);
  const [locPerm,setLocPerm]=useState(null);
  const [permLoading,setPermLoading]=useState(null);
  const [nrtCigs,setNrtCigs]=useState("20");
  const [exDone,setExDone]=useState([]);
  const [exStarted,setExStarted]=useState(false);
  const [prepDay,setPrepDay]=useState(0);
  const [prepOpen,setPrepOpen]=useState(null);
  const [prepRead,setPrepRead]=useState(()=>{try{return JSON.parse(localStorage.getItem("prep_read")||"[]");}catch{return [];}});
  const [showPrepCeremony,setShowPrepCeremony]=useState(false);
  const [dietTab,setDietTab]=useState("veg");
  const [exTab,setExTab]=useState("today");
  const [bannerIdx,setBannerIdx]=useState(0);

  const FOUNDER_QUIT_TS=new Date("2024-10-31T00:00:00").getTime();
  const founderDays=Math.floor((now-FOUNDER_QUIT_TS)/86400000);
  const curBanner=BANNERS[bannerIdx];

  useEffect(()=>{
    const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone=window.navigator.standalone;
    if(isIOS&&!isStandalone&&!localStorage.getItem('prompted'))setShowHomePrompt(true);
  },[]);
  useEffect(()=>{
    (async()=>{
      const auth=await session.get("uns9-session");
      if(auth&&auth.loggedIn){
        setAuthUser(auth);setAuthStep("done");
        if(auth.name){setAuthName(auth.name);setUserName(auth.name);}
        if(auth.photo)setAuthPhoto(auth.photo);
        const ud=await FB.get("users/"+auth.phone);
        if(ud){
          if(ud.quitTS){setQuitTS(ud.quitTS);setCpd(String(ud.cpd||20));setPP(String(ud.pp||300));setCpp(String(ud.cpp||20));setStep(4);}
          else setStep(1);
          if(ud.journal)setEntries(ud.journal);
          if(ud.lessonsRead)setRead(ud.lessonsRead);
          if(ud.moods)setMoods(ud.moods);
          if(ud.goalName)setGoalName(ud.goalName);
          if(ud.goalAmt)setGoalAmt(ud.goalAmt);
          if(ud.premium)setIsPremium(ud.premium);
          if(ud.streaks)setMyStreaks(ud.streaks);
          setUserId(ud.userId||auth.userId||genId(8));
          if(ud.mySnapCode){
            const snap=await FB.get("snaps/"+ud.mySnapCode);
            if(snap&&!snap.viewed)setMySentSnap({code:ud.mySnapCode,created:ud.mySnapCreated||Date.now(),viewed:false});
            else if(snap&&snap.viewed)setMySentSnap({code:ud.mySnapCode,created:ud.mySnapCreated||Date.now(),viewed:true,viewerName:snap.viewerName});
          }
        } else {setStep(1);}
      } else {
        setAuthStep("welcome");
      }
      setReady(true);
    })();
  },[]);

  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{
    if(!breathOn)return;
    const cur=PHASES[bStep];setBPhase(cur.phase);
    const t=setTimeout(()=>setBStep(i=>(i+1)%3),cur.dur);
    return()=>clearTimeout(t);
  },[breathOn,bStep]);
  useEffect(()=>{
    if(!cRun||cSec<=0){if(cSec<=0)setCRun(false);return;}
    const t=setTimeout(()=>setCSec(v=>v-1),1000);
    return()=>clearTimeout(t);
  },[cRun,cSec]);

  const elMs=quitTS?Math.max(0,now-quitTS):0,elMin=elMs/60000;
  const {d,h,m,s}=parseDur(elMs);
  const nCpd=parseFloat(cpd)||20,nPP=parseFloat(pp)||300,nCpp=parseFloat(cpp)||20;
  const cigs=Math.floor((elMin/1440)*nCpd),money=Math.floor((cigs/nCpp)*nPP);
  const achieved=MILESTONES.filter(ms=>elMin>=ms.min);
  const nextMS=MILESTONES.find(ms=>elMin<ms.min);
  const resistedCount=entries.filter(e=>e.resisted).length;
  const resRate=entries.length>0?resistedCount/entries.length:0.75;
  const healthScore=Math.min(100,Math.round((achieved.length/MILESTONES.length)*65+(read.length/LESSONS.length)*15+resRate*20));
  const streak=(()=>{
    if(!quitTS)return 0;
    const slipDays=new Set(entries.filter(e=>!e.resisted).map(e=>dateKey(e.ts)));
    let count=0,check=new Date();
    for(let i=0;i<365;i++){
      const k=dateKey(check.getTime()),ds=new Date(check.getFullYear(),check.getMonth(),check.getDate()).getTime();
      if(ds<quitTS)break;
      if(slipDays.has(k))break;
      count++;check.setDate(check.getDate()-1);
    }
    return count;
  })();
  const topTrig=(()=>{if(!entries.length)return null;const c={};entries.forEach(e=>e.tags.forEach(t=>c[t]=(c[t]||0)+1));return Object.entries(c).sort((a,b)=>b[1]-a[1])[0]?.[0];})();
  const todayMood=moods[todayKey()]||0;
  const moodWeek=(()=>{const arr=[];for(let i=6;i>=0;i--){const d2=new Date();d2.setDate(d2.getDate()-i);arr.push({key:dateKey(d2.getTime()),label:["S","M","T","W","T","F","S"][d2.getDay()]});}return arr;})();
  const quote=QUOTES[new Date().getDate()%QUOTES.length];
  const challenge=CHALLENGES[Math.floor((now/86400000))%CHALLENGES.length];

  function startMsgPoll(phone){
    if(!phone)return;
    loadMsgs(phone);
    const interval=setInterval(()=>loadMsgs(phone),6000);
    setMsgPollRef(interval);
    return ()=>clearInterval(interval);
  }
  async function loadMsgs(phone){
    if(!phone)return;
    const conv=await FB.get("conversations/"+phone);
    if(conv&&conv.messages){
      const sorted=[...conv.messages].sort((a,b)=>a.ts-b.ts);
      setMsgThread(sorted);
      const unread=sorted.filter(m=>m.role==="saksham"&&!m.seenByUser).length;
      setMsgUnread(unread);
      if(unread>0){
        const updated=sorted.map(m=>m.role==="saksham"?Object.assign({},m,{seenByUser:true}):m);
        await FB.merge("conversations/"+phone,{messages:updated});
        setMsgUnread(0);
      }
    }
  }
  async function sendMsg(){
    const phone=authUser?authUser.phone:authPhone;
    if(!msgInput.trim()||msgSending||!phone)return;
    const text=sanitize(msgInput);
    setMsgInput("");setMsgSending(true);
    const msg={id:String(Date.now()),role:"user",text,ts:Date.now(),senderName:userName,read:false,seenByUser:true};
    const updated=[...msgThread,msg];
    setMsgThread(updated);
    try{
      const conv=await FB.get("conversations/"+phone)||{};
      await FB.set("conversations/"+phone,{
        userPhone:phone,userName,d,healthScore,
        lastMessage:text,lastActivity:Date.now(),
        unread:(conv.unread||0)+1,
        messages:updated
      });
    }catch{}
    setMsgSending(false);
  }

  // Generate short public ID for this user
  useEffect(()=>{
    if(userId){
      const shortId=userId.substring(0,6).toUpperCase();
      setMyPublicId(shortId);
      // Register in lookup table
      const phone=authUser?authUser.phone:authPhone;
      if(phone)FB.set("user_lookup/"+shortId,{phone,name:userName||authName,publicId:shortId,userId});
    }
  },[userId]);

  // Load community posts
  async function loadCommunity(){
    try{
      const r=await fetch("https://firestore.googleapis.com/v1/projects/unsmoke-app-92a39/databases/(default)/documents/community_posts?key=AIzaSyBy6CrePlG8499_tVBwqNw97ivycI142mI&orderBy=ts+desc&pageSize=30");
      const data=await r.json();
      const posts=(data.documents||[]).map(doc=>{
        const d=doc.fields||{};
        const pv=v=>{if(!v)return null;if(v.stringValue!==undefined)return v.stringValue;if(v.integerValue!==undefined)return parseInt(v.integerValue);if(v.booleanValue!==undefined)return v.booleanValue;if(v.arrayValue)return(v.arrayValue.values||[]).map(pv);return null;};
        return{id:doc.name.split("/").pop(),name:pv(d.name),text:pv(d.text),days:pv(d.days),ts:pv(d.ts),type:pv(d.type),publicId:pv(d.publicId),likes:pv(d.likes)||0};
      });
      setCommunityPosts(posts.sort((a,b)=>(b.ts||0)-(a.ts||0)));
    }catch{}
  }

  async function postToCommunity(text,type="post"){
    if(!text.trim()||communityPosting)return;
    setCommunityPosting(true);
    const post={id:Date.now()+"",name:userName||authName,text:sanitize(text),days:d,ts:Date.now(),type,publicId:myPublicId,likes:0};
    await FB.set("community_posts/"+post.id,post);
    setCommunityInput("");
    await loadCommunity();
    setCommunityPosting(false);
  }

  async function likePost(postId,currentLikes){
    await FB.merge("community_posts/"+postId,{likes:(currentLikes||0)+1});
    setCommunityPosts(prev=>prev.map(p=>p.id===postId?{...p,likes:(p.likes||0)+1}:p));
  }

  async function addFriend(publicId){
    const id=publicId.trim().toUpperCase();
    if(!id){setFriendStatus("Enter a user ID");return;}
    if(id===myPublicId){setFriendStatus("That is your own ID");return;}
    setFriendStatus("Searching...");
    const lookup=await FB.get("user_lookup/"+id);
    if(!lookup){setFriendStatus("User not found. Check the ID and try again.");return;}
    const alreadyFriend=friends.find(f=>f.publicId===id);
    if(alreadyFriend){setFriendStatus("Already added");return;}
    const newFriend={publicId:id,name:lookup.name||"User",phone:lookup.phone,addedAt:Date.now()};
    const updated=[...friends,newFriend];
    setFriends(updated);
    const phone=authUser?authUser.phone:authPhone;
    await FB.merge("users/"+phone,{friends:updated});
    setFriendInput("");
    setFriendStatus(lookup.name+" added!");
    setTimeout(()=>setFriendStatus(""),3000);
  }

  async function openPeerChat(friend){
    setPeerChat(friend);
    setPeerMsgs([]);
    const myPhone=authUser?authUser.phone:authPhone;
    const chatId=[myPhone,friend.phone].sort().join("_");
    const conv=await FB.get("peer_chats/"+chatId);
    if(conv&&conv.messages)setPeerMsgs([...conv.messages].sort((a,b)=>a.ts-b.ts));
  }

  async function sendPeerMsg(){
    if(!peerInput.trim()||peerSending||!peerChat)return;
    const text=sanitize(peerInput.trim());
    setPeerInput("");setPeerSending(true);
    const myPhone=authUser?authUser.phone:authPhone;
    const chatId=[myPhone,peerChat.phone].sort().join("_");
    const msg={id:String(Date.now()),senderPhone:myPhone,senderName:userName||authName,text,ts:Date.now()};
    const conv=await FB.get("peer_chats/"+chatId)||{};
    const existing=conv.messages||[];
    await FB.set("peer_chats/"+chatId,{...conv,messages:[...existing,msg],lastMessage:text,lastActivity:Date.now(),user1:myPhone,user2:peerChat.phone});
    setPeerMsgs(prev=>[...prev,msg]);
    setPeerSending(false);
  }

  // Load community on mount and when tab switches
  useEffect(()=>{if(tab==="community")loadCommunity();},[tab]);
  // Load friends from user data
  useEffect(()=>{
    const phone=authUser?authUser.phone:authPhone;
    if(phone)FB.get("users/"+phone).then(ud=>{if(ud&&ud.friends)setFriends(ud.friends);});
  },[authUser]);
  // Poll peer chat
  useEffect(()=>{
    if(!peerChat)return;
    const myPhone=authUser?authUser.phone:authPhone;
    const chatId=[myPhone,peerChat.phone].sort().join("_");
    const t=setInterval(async()=>{
      const conv=await FB.get("peer_chats/"+chatId);
      if(conv&&conv.messages)setPeerMsgs([...conv.messages].sort((a,b)=>a.ts-b.ts));
    },5000);
    return()=>clearInterval(t);
  },[peerChat]);

  async function saveUD(fields){
    const phone=authUser?authUser.phone:authPhone;
    if(!phone)return;
    await FB.merge("users/"+phone,fields);
  }

  function sendOTP(){
    if(authPhone.replace(/\D/g,"").length<10){setAuthError("Enter a valid 10-digit number.");return;}
    setAuthError("");
    const code=String(Math.floor(100000+Math.random()*900000));
    setAuthOtpCode(code);setAuthStep("otp");
    setAuthOtpInput(["","","","","",""]);
  }
  function handleOtpKey(idx,val){
    const next=[...authOtpInput];next[idx]=val.slice(-1);setAuthOtpInput(next);setAuthError("");
    if(val&&idx<5)setTimeout(()=>otpRefs[idx+1]&&otpRefs[idx+1].current&&otpRefs[idx+1].current.focus(),30);
  }
  async function verifyOTP(){
    if(otpLocked){setAuthError("Too many wrong attempts. Request a new code.");return;}
    const entered=authOtpInput.join("");
    if(entered!==authOtpCode){
      const tries=otpTries+1;setOtpTries(tries);
      if(tries>=5){setOtpLocked(true);setAuthError("Too many wrong attempts. Request a new code.");}
      else{setAuthError("Wrong code. "+( 5-tries)+" attempts left.");}
      return;
    }
    setAuthError("");
    if(isSignIn){
      setAuthLoading(true);
      const ud=await FB.get("users/"+authPhone);
      if(!ud){setAuthError("No account found. Tap Back and create one instead.");setAuthLoading(false);return;}
      const sessionData={userId:ud.userId,phone:authPhone,name:ud.name,loggedIn:true};
      await session.set("uns9-session",sessionData);
      setAuthUser(Object.assign({},sessionData,{photo:ud.photo||null}));
      setUserId(ud.userId||genId(8));setUserName(ud.name||"");
      if(ud.photo)setAuthPhoto(ud.photo);
      if(ud.quitTS){setQuitTS(ud.quitTS);setCpd(String(ud.cpd||20));setPP(String(ud.pp||300));setCpp(String(ud.cpp||20));setStep(4);}
      else setStep(1);
      if(ud.journal)setEntries(ud.journal);
      if(ud.lessonsRead)setRead(ud.lessonsRead);
      if(ud.moods)setMoods(ud.moods);
      if(ud.premium)setIsPremium(ud.premium);
      const newToken=Math.random().toString(36).substring(2)+Date.now().toString(36);
      setSessionToken(newToken);
      // Save token to Firebase - invalidates any other active session
      await FB.merge("users/"+authPhone,{sessionToken:newToken});
      // Save token locally too
      const sData=await session.get("uns9-session")||{};
      await session.set("uns9-session",{...sData,sessionToken:newToken});
      setAuthStep("done");setReady(true);setAuthLoading(false);
      startMsgPoll(authPhone);
      // Poll for session invalidation (another device logged in)
      const myTok=newToken;
      const pollSes=setInterval(async()=>{
        try{
          const live=await FB.get("users/"+authPhone);
          if(live&&live.sessionToken&&live.sessionToken!==myTok){
            clearInterval(pollSes);
            await session.del("uns9-session");
            setForcedOut(true);setTab("home");
            setAuthStep("welcome");setReady(true);
          }
        }catch{}
      },20000);
    } else {
      setAuthStep("profile");
    }
  }
  async function startProfileCam(){
    try{
      if(profileStreamRef.current)profileStreamRef.current.getTracks().forEach(t=>t.stop());
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:false});
      profileStreamRef.current=stream;setProfileCam(true);
      setTimeout(()=>{if(profileVideoRef.current){profileVideoRef.current.srcObject=stream;profileVideoRef.current.play();}},80);
    }catch{setAuthError("Camera access denied.");}
  }
  function captureProfilePhoto(){
    const video=profileVideoRef.current;if(!video)return;
    const canvas=document.createElement("canvas");canvas.width=300;canvas.height=300;
    const ctx=canvas.getContext("2d");
    const sz=Math.min(video.videoWidth,video.videoHeight);
    ctx.drawImage(video,(video.videoWidth-sz)/2,(video.videoHeight-sz)/2,sz,sz,0,0,300,300);
    setAuthPhoto(canvas.toDataURL("image/jpeg",0.7));
    profileStreamRef.current&&profileStreamRef.current.getTracks().forEach(t=>t.stop());
    setProfileCam(false);
  }
  async function saveAuthProfile(){
    const cleanName=sanitize(authName);
    if(!cleanName){setAuthError("Please enter your name.");return;}
    setAuthLoading(true);
    const uid=genId(8);
    const sessionData={userId:uid,phone:authPhone,name:cleanName,loggedIn:true};
    await session.set("uns9-session",sessionData);
    let userData=await FB.get("users/"+authPhone);
    if(!userData){
      userData={userId:uid,phone:authPhone,name:authName.trim(),photo:authPhoto||null,createdAt:Date.now()};
      await FB.set("users/"+authPhone,userData);
    } else {
      const updates={name:authName.trim()};
      if(authPhoto)updates.photo=authPhoto;
      await FB.merge("users/"+authPhone,updates);
      userData=Object.assign({},userData,updates);
    }
    const user=Object.assign({},sessionData,{photo:userData.photo||authPhoto||null});
    setAuthUser(user);setUserId(userData.userId||uid);setUserName(authName.trim());
    if(userData.quitTS){setQuitTS(userData.quitTS);setCpd(String(userData.cpd||20));setPP(String(userData.pp||300));setCpp(String(userData.cpp||20));setStep(4);}
    else setStep(1);
    if(userData.journal)setEntries(userData.journal);
    if(userData.lessonsRead)setRead(userData.lessonsRead);
    if(userData.moods)setMoods(userData.moods);
    if(userData.premium)setIsPremium(userData.premium);
    if(userData.streaks)setMyStreaks(userData.streaks);
    setAuthStep("done");setReady(true);setAuthLoading(false);
  }
  async function logout(){
    await session.del("uns9-session");
    setAuthUser(null);setAuthStep("welcome");setAuthName("");setAuthPhone("");
    setAuthPhoto(null);setShowProfile(false);setQuitTS(null);setStep(1);setTab("home");
  }

  function setNowTime(){const n=new Date();setSDate(n.toISOString().split("T")[0]);setSTime(pad(n.getHours())+":"+pad(n.getMinutes()));}
  function saveSetup(){
    const ts=new Date(sDate+"T"+sTime).getTime();
    if(isNaN(ts))return;
    setQuitTS(ts);setStep(3);
    saveUD({quitTS:ts,cpd:+cpd,pp:+pp,cpp:+cpp});
  }
  async function saveEntry(){
    const e={id:Date.now(),ts:Date.now(),tags:lTags.map(t=>sanitize(t)),intensity:Math.max(1,Math.min(10,lInt)),resisted:lRes,note:sanitize(lNote)};
    const u=[e,...entries];setEntries(u);setLTags([]);setLInt(5);setLNote("");setLRes(true);setShowForm(false);
    saveUD({journal:u});
  }
  function markRead(i){if(read.includes(i))return;const u=[...read,i];setRead(u);saveUD({lessonsRead:u});}
  function setMood(v){const u=Object.assign({},moods,{[todayKey()]:v});setMoods(u);saveUD({moods:u});}
  function confirmSlipped(){const ts=Date.now();setQuitTS(ts);saveUD({quitTS:ts,cpd:+cpd,pp:+pp,cpp:+cpp});setShowSlipped(false);}
  function resetApp(){setQuitTS(null);setStep(1);setTab("home");saveUD({quitTS:null});}
  function unlockPremium(){setIsPremium(true);saveUD({premium:true});setShowPremium(false);}

  const askCamera=async()=>{
    setPermLoading("cam");
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
      stream.getTracks().forEach(t=>t.stop());setCamPerm("granted");
    }catch{setCamPerm("denied");}
    setPermLoading(null);
  };
  const askMic=async()=>{
    setPermLoading("mic");
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      stream.getTracks().forEach(t=>t.stop());
      setMicPerm("granted");
    }catch{setMicPerm("denied");}
    setPermLoading(null);
  };
  const askPhotos=()=>{
    // Trigger file picker which prompts iOS photo library permission
    const input=document.createElement("input");
    input.type="file";input.accept="image/*";
    input.onchange=()=>setPhotoPerm("granted");
    input.onerror=()=>setPhotoPerm("denied");
    setPermLoading("photo");
    input.click();
    // After 2s assume granted if no error (iOS does not fire error on deny of picker)
    setTimeout(()=>{setPhotoPerm("granted");setPermLoading(null);},2000);
  };
  const askLocation=()=>{
    setPermLoading("loc");
    navigator.geolocation.getCurrentPosition(
      ()=>{setLocPerm("granted");setPermLoading(null);},
      ()=>{setLocPerm("denied");setPermLoading(null);},
      {timeout:8000}
    );
  };

  async function startCamera(){
    setCameraErr("");
    try{
      if(streamRef.current)streamRef.current.getTracks().forEach(t=>t.stop());
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:cameraFacing},audio:false});
      streamRef.current=stream;setShowCamera(true);
      setTimeout(()=>{if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play();}},100);
    }catch{setCameraErr("Camera permission denied.");}
  }
  function capturePhoto(){
    const video=videoRef.current;if(!video)return;
    const canvas=document.createElement("canvas");canvas.width=400;canvas.height=400;
    const ctx=canvas.getContext("2d");
    const sz=Math.min(video.videoWidth,video.videoHeight);
    ctx.drawImage(video,(video.videoWidth-sz)/2,(video.videoHeight-sz)/2,sz,sz,0,0,400,400);
    setSnapPhoto(canvas.toDataURL("image/jpeg",0.65));
    streamRef.current&&streamRef.current.getTracks().forEach(t=>t.stop());
    setShowCamera(false);
  }
  function stopCamera(){if(streamRef.current){streamRef.current.getTracks().forEach(t=>t.stop());streamRef.current=null;}setShowCamera(false);}

  async function sendSnap(){
    if(!userName||!userId)return;setSendingSnap(true);
    const code=genId(6);
    const phone=authUser?authUser.phone:authPhone;
    const snapData={code,senderId:userId,senderPhone:phone,senderName:userName,quitDays:d,healthScore,cigsAvoided:cigs,moneySaved:money,message:snapMsg.trim(),photo:snapPhoto||null,streakCount:0,viewed:false,viewerId:null,viewerName:null,created:Date.now()};
    await FB.set("snaps/"+code,snapData);
    setMySentSnap({code,created:Date.now(),viewed:false});
    saveUD({mySnapCode:code,mySnapCreated:Date.now(),mySnapViewed:false});
    setSnapMsg("");setSnapPhoto(null);setSendingSnap(false);
  }
  async function openCode(){
    const code=codeInput.trim().toUpperCase();if(!code){setSnapStatus("Enter a code first.");return;}
    setSnapStatus("Opening...");
    const snap=await FB.get("snaps/"+code);
    if(!snap){setSnapStatus("Code not found. Check and try again.");return;}
    if(snap.viewed){setSnapStatus("This snap has already been opened.");return;}
    if(snap.senderId===userId){setSnapStatus("That is your own snap!");return;}
    const myPhone=authUser?authUser.phone:authPhone;
    const pairId=[myPhone,snap.senderPhone||snap.senderId].sort().join("_");
    const ex=await FB.get("streakPairs/"+pairId);
    snap.streakCount=(ex?ex.count:0)+1;
    setViewingSnap(snap);setCodeInput("");setSnapStatus("");
  }
  async function handleSnapViewed(){
    if(!viewingSnap)return;
    const myPhone=authUser?authUser.phone:authPhone;
    const senderPhone=viewingSnap.senderPhone||viewingSnap.senderId||"unknown";
    await FB.merge("snaps/"+viewingSnap.code,{viewed:true,viewerId:userId,viewerName:userName,viewedAt:Date.now()});
    const pairId=[myPhone,senderPhone].sort().join("_");
    const ex=await FB.get("streakPairs/"+pairId)||{count:0};
    const newCount=(ex.count||0)+1;
    await FB.set("streakPairs/"+pairId,{user1Phone:myPhone,user2Phone:senderPhone,user1Name:userName,user2Name:viewingSnap.senderName,count:newCount,lastActivity:Date.now()});
    const idx=myStreaks.findIndex(s=>s.friendPhone===senderPhone);
    const us=idx>=0?myStreaks.map((s,i)=>i===idx?Object.assign({},s,{count:newCount,lastActivity:Date.now()}):s):[...myStreaks,{friendPhone:senderPhone,friendName:viewingSnap.senderName,count:newCount,lastActivity:Date.now()}];
    setMyStreaks(us);saveUD({streaks:us});
  }
  function copyCode(){
    const text="I have been smoke-free for "+d+" days! View my streak snap on Unsmoke.\nCode: "+(mySentSnap?mySentSnap.code:"")+"\n\nUnsmoke app - by @ssakshamchauhan";
    navigator.clipboard&&navigator.clipboard.writeText(text).catch(()=>{});
    setCopied(true);setTimeout(()=>setCopied(false),2000);
  }

  useEffect(()=>{
    const achieved=MILESTONES.filter(ms=>elMin>=ms.min);
    if(achieved.length>prevAchieved&&prevAchieved>0){
      setCelebMS(achieved[achieved.length-1]);setTimeout(()=>setCelebMS(null),4000);
    }
    setPrevAchieved(achieved.length);
  },[achieved.length]);

  const coachSystem="You are an expert AI quit-smoking coach on Unsmoke, built by Saksham Singh Chauhan who quit after 12 years of 2 packs per day.\n\nUser: "+d+" days, "+h+" hours smoke-free. "+cigs+" cigarettes avoided. Rs "+money+" saved. Health score "+healthScore+"/100. Streak: "+streak+" days."+(topTrig?"\nTop trigger: "+topTrig:"")+".\n\nBe warm, direct, honest. Psychology-based, not willpower-based. 3-4 sentences max.";
  const sakshamSystem="You are Saksham Singh Chauhan, founder of Unsmoke. You quit Oct 31 2024 after 12 years of 2 packs per day. Delhi entrepreneur. Cold turkey Day 8. Reverse psychology trick. Now "+founderDays+" days clean.\n\nUser: "+d+" days smoke-free, score "+healthScore+".\n\nText like a real person. Short messages. Honest. Occasional yaar naturally. No corporate language.";
  const nrtPlan=(()=>{const c=parseFloat(nrtCigsLocal)||20,s1=c>=20?21:c>=10?14:7;return [{week:"Week 1-"+Math.ceil(s1/7),patch:c>=20?"21mg patch":c>=10?"14mg patch":"7mg patch",desc:"Full replacement. Match your current nicotine intake."},{week:"Week "+Math.ceil(s1/7+1)+"-"+Math.ceil(s1/7+2),patch:c>=20?"14mg patch":"7mg patch",desc:"Step down. Your baseline need is dropping."},{week:"Week "+Math.ceil(s1/7+3)+"+",patch:c>=20?"7mg patch":"None",desc:c>=20?"Final step. Wean off completely.":"You are done with NRT. Day 8: go cold turkey."}];})();

  const outerWrap={background:C.bg,minHeight:"100dvh",display:"flex",justifyContent:"center"};


  const wrap={fontFamily:"-apple-system,BlinkMacSystemFont,sans-serif",background:C.bg,color:C.text,height:"100svh",display:"flex",flexDirection:"column",overflow:"hidden",width:"100%",position:"fixed",top:0,left:0,right:0,bottom:0};
  const inputStyle={background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:9,padding:"12px 13px",color:C.text,fontSize:19,width:"100%",boxSizing:"border-box",outline:"none"};
  const lblStyle={color:C.sub,fontSize:30,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:5,display:"block"};
  const curB=PHASES.find(p=>p.phase===bPhase)||PHASES[0];

  if(!ready||authStep===null){
    return (
      <div style={Object.assign({},wrap,{alignItems:"center",justifyContent:"center",gap:12})}>
        <div style={{fontSize:36}}>🚭</div>
        <div style={{color:C.sub,fontSize:24}}>Loading...</div>
      </div>
    );
  }

  // AUTH SCREENS
  if(authStep&&authStep!=="done"){
    const authWrap=Object.assign({},wrap,{alignItems:"center",justifyContent:"center",overflowY:"auto"});
    const field={background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:11,padding:"13px 15px",color:C.text,fontSize:30,width:"100%",boxSizing:"border-box",outline:"none"};
    const brandHeader=(
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontSize:44,marginBottom:8}}>🚭</div>
        <div style={{fontSize:32,fontWeight:900,background:"linear-gradient(135deg,"+C.accent+","+C.teal+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Unsmoke</div>
        <div style={{color:C.muted,fontSize:19,marginTop:3}}>with Saksham</div>
      </div>
    );

    if(authStep==="welcome"){
      return (
        <div style={authWrap}>
          <div style={{width:"100%",maxWidth:420,padding:"28px 22px"}}>
            {brandHeader}
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{fontSize:34,fontWeight:800,marginBottom:8}}>Start your smoke-free journey</div>
              <div style={{color:C.sub,fontSize:30,lineHeight:1.7}}>Join thousands quitting with Saksham proven method. Track every second. Every rupee saved. Every milestone earned.</div>
            </div>
            <button onClick={()=>{setIsSignIn(true);setAuthStep("phone");}} style={{width:"100%",background:"linear-gradient(135deg,"+C.gold+","+C.amber+")",border:"none",borderRadius:13,padding:15,color:"#F5F0E8",fontWeight:800,fontSize:19,cursor:"pointer",marginBottom:10,marginTop:12,boxShadow:"0 4px 20px rgba(201,168,76,0.25)"}}>
              Sign In
            </button>
            <button onClick={()=>{setIsSignIn(false);setAuthStep("phone");}} style={{width:"100%",background:"transparent",border:"1.5px solid "+C.gold+"55",borderRadius:13,padding:14,color:C.gold,fontWeight:700,fontSize:30,cursor:"pointer",marginBottom:14}}>
              Create Account
            </button>
            <div style={{textAlign:"center",fontSize:30,color:C.muted}}>By continuing you agree to our Terms. We never share your data.</div>
          </div>
        </div>
      );
    }

    if(authStep==="phone"){
      return (
        <div style={authWrap}>
          <div style={{width:"100%",maxWidth:420,padding:"28px 22px"}}>
            {brandHeader}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:30,fontWeight:800,marginBottom:5}}>{isSignIn?"Welcome back":"Enter your number"}</div>
              <div style={{color:C.sub,fontSize:24}}>{isSignIn?"Enter your registered number to sign in.":"We will send a one-time code to verify."}</div>
              <div style={{color:C.sub,fontSize:24}}>We will send a one-time code to verify.</div>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              <div style={{background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:11,padding:"13px 14px",fontSize:30,fontWeight:700,color:C.sub,flexShrink:0}}>
                🇮🇳 +91
              </div>
              <input type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit number"
                value={authPhone} onChange={e=>setAuthPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
                onKeyDown={e=>e.key==="Enter"&&sendOTP()} style={Object.assign({},field,{flex:1})} autoFocus/>
            </div>
            {authError&&<div style={{color:C.accent,fontSize:19,marginBottom:10,fontWeight:600}}>{authError}</div>}
            <button onClick={sendOTP} disabled={authPhone.length<10} style={{width:"100%",background:C.accent,border:"none",borderRadius:13,padding:14,color:"#fff",fontWeight:800,fontSize:30,cursor:"pointer",marginBottom:12,opacity:authPhone.length<10?0.5:1}}>
              Send OTP
            </button>
            <button onClick={()=>setAuthStep("welcome")} style={{background:"none",border:"none",color:C.muted,fontSize:30,cursor:"pointer",width:"100%"}}>Back</button>
          </div>
        </div>
      );
    }

    if(authStep==="otp"){
      const allFilled=authOtpInput.every(d=>d!=="");
      return (
        <div style={authWrap}>
          <div style={{width:"100%",maxWidth:420,padding:"28px 22px"}}>
            {brandHeader}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:30,fontWeight:800,marginBottom:5}}>Verify your number</div>
              <div style={{color:C.sub,fontSize:24}}>Code sent to +91 {authPhone}</div>
            </div>
            <div style={{background:C.amberFade,border:"1px solid "+C.amber+"44",borderRadius:12,padding:"12px 14px",marginBottom:20,display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:24}}>📱</span>
              <div>
                <div style={{fontSize:30,color:C.amber,fontWeight:700,marginBottom:2}}>Demo Mode</div>
                <div style={{fontSize:30,color:C.text}}>Your code: <span style={{fontWeight:900,fontSize:34,letterSpacing:"0.12em",color:C.amber}}>{authOtpCode}</span></div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:16}}>
              {authOtpInput.map((val,idx)=>(
                <input key={idx} ref={otpRefs[idx]} type="text" inputMode="numeric" maxLength={1} value={val}
                  onChange={e=>handleOtpKey(idx,e.target.value)}
                  onKeyDown={e=>{if(e.key==="Backspace"&&!val&&idx>0)otpRefs[idx-1]&&otpRefs[idx-1].current&&otpRefs[idx-1].current.focus();}}
                  style={{width:44,height:52,textAlign:"center",fontSize:34,fontWeight:900,background:val?C.tealFade:C.surfaceHi,border:"2px solid "+(val?C.teal:C.border),borderRadius:10,color:C.text,outline:"none"}}/>
              ))}
            </div>
            {authError&&<div style={{color:C.accent,fontSize:19,marginBottom:10,fontWeight:600,textAlign:"center"}}>{authError}</div>}
            <button onClick={verifyOTP} disabled={!allFilled} style={{width:"100%",background:C.teal,border:"none",borderRadius:13,padding:14,color:"#F5F0E8",fontWeight:800,fontSize:30,cursor:"pointer",marginBottom:12,opacity:allFilled?1:0.5}}>
              Verify and Continue
            </button>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <button onClick={()=>{setAuthStep("phone");setAuthOtpInput(["","","","","",""]);setAuthError("");}} style={{background:"none",border:"none",color:C.muted,fontSize:30,cursor:"pointer"}}>Change number</button>
              <button onClick={sendOTP} style={{background:"none",border:"none",color:C.sub,fontSize:30,cursor:"pointer"}}>Resend code</button>
            </div>
          </div>
        </div>
      );
    }

    if(authStep==="profile"){
      return (
        <div style={authWrap}>
          <div style={{width:"100%",maxWidth:420,padding:"28px 22px"}}>
            {brandHeader}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:30,fontWeight:800,marginBottom:5}}>Set up your profile</div>
              <div style={{color:C.sub,fontSize:24}}>This is how friends will see you in streak snaps.</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:20}}>
              {!profileCam ? (
                <div style={{position:"relative",marginBottom:12}}>
                  <div onClick={startProfileCam} style={{width:100,height:100,borderRadius:"50%",background:"linear-gradient(135deg,"+C.accent+"44,"+C.purple+"44)",border:"3px solid "+(authPhoto?C.teal:C.border),display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",cursor:"pointer"}}>
                    {authPhoto?<img src={authPhoto} alt="Profile" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:36}}>🧑</span>}
                  </div>
                  <button onClick={startProfileCam} style={{position:"absolute",bottom:2,right:2,width:30,height:30,borderRadius:"50%",background:C.accent,border:"2px solid "+C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,cursor:"pointer",color:"#fff"}}>📸</button>
                </div>
              ) : (
                <div style={{width:"100%",marginBottom:12}}>
                  <div style={{position:"relative",width:"100%",paddingBottom:"100%",borderRadius:16,overflow:"hidden",background:"#000",border:"2px solid "+C.purple+"55"}}>
                    <video ref={profileVideoRef} autoPlay playsInline muted style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",transform:"scaleX(-1)"}}/>
                  </div>
                  <button onClick={captureProfilePhoto} style={{width:"100%",marginTop:10,background:"linear-gradient(135deg,"+C.accent+","+C.purple+")",border:"none",borderRadius:12,padding:13,color:"#fff",fontWeight:800,fontSize:30,cursor:"pointer"}}>Take Photo</button>
                  <button onClick={()=>{profileStreamRef.current&&profileStreamRef.current.getTracks().forEach(t=>t.stop());setProfileCam(false);}} style={{width:"100%",marginTop:8,background:"none",border:"none",color:C.muted,fontSize:30,cursor:"pointer"}}>Skip for now</button>
                </div>
              )}
              {!profileCam&&<div style={{fontSize:19,color:C.muted}}>{authPhoto?"Tap photo to retake":"Tap to add a profile photo"}</div>}
            </div>
            {!profileCam&&(
              <>
                <div style={{marginBottom:16}}>
                  <label style={lblStyle}>Your name</label>
                  <input type="text" placeholder="e.g. Rahul, Priya..." value={authName}
                    onChange={e=>{setAuthName(e.target.value);setAuthError("");}}
                    onKeyDown={e=>e.key==="Enter"&&saveAuthProfile()}
                    style={field} autoFocus/>
                </div>
                {authError&&<div style={{color:C.accent,fontSize:19,marginBottom:10,fontWeight:600}}>{authError}</div>}
                <button onClick={saveAuthProfile} disabled={authLoading||!authName.trim()} style={{width:"100%",background:"linear-gradient(135deg,"+C.accent+","+C.teal+")",border:"none",borderRadius:13,padding:14,color:"#fff",fontWeight:800,fontSize:30,cursor:"pointer",marginBottom:10,opacity:!authName.trim()?0.5:1}}>
                  {authLoading?"Setting up...":"Lets go! 🚭"}
                </button>
              </>
            )}
          </div>
        </div>
      );
    }
  }

  // SETUP SCREENS
  if(step<4){
    if(step===3){
      const allAsked=camPerm!==null&&micPerm!==null&&locPerm!==null&&photoPerm!==null;
      const pBg={background:C.surface,border:"1px solid "+C.border,borderRadius:16,padding:"20px 18px",marginBottom:12};
      return (
        <div style={Object.assign({},wrap,{alignItems:"center",justifyContent:"center",overflowY:"auto"})}>
          <div style={{width:"100%",maxWidth:420,padding:"24px 20px"}}>
            <div style={{textAlign:"center",marginBottom:32}}>
              <div style={{fontSize:48,marginBottom:10}}>🚭</div>
              <div style={{fontSize:34,fontWeight:900,background:"linear-gradient(135deg,"+C.accent+","+C.teal+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>One last step</div>
              <div style={{color:C.sub,fontSize:30,marginTop:6,lineHeight:1.6}}>Allow these permissions so Unsmoke can work properly. We never share your data.</div>
            </div>
            <div style={pBg}>
              <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                <div style={{width:52,height:52,borderRadius:14,background:camPerm==="granted"?C.tealFade:camPerm==="denied"?C.accentFade:C.purpleFade,border:"1px solid "+(camPerm==="granted"?C.teal:camPerm==="denied"?C.accent:C.purple)+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,flexShrink:0}}>
                  {camPerm==="granted"?"✅":camPerm==="denied"?"📵":"📸"}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:30,marginBottom:3}}>Camera</div>
                  <div style={{color:C.sub,fontSize:19,lineHeight:1.6,marginBottom:12}}>
                    {camPerm==="granted"?"Camera access granted. You can take selfies with your streak snaps.":camPerm==="denied"?"Camera blocked. You can still use the app, but cannot take snap photos.":"Take selfies to include with your streak snaps. Your photos never leave your device."}
                  </div>
                  {camPerm===null&&<button onClick={askCamera} disabled={permLoading==="cam"} style={{background:"linear-gradient(135deg,"+C.purple+","+C.accent+")",border:"none",borderRadius:10,padding:"10px 20px",color:"#fff",fontWeight:700,fontSize:30,cursor:"pointer",opacity:permLoading==="cam"?0.6:1}}>{permLoading==="cam"?"Asking...":"Allow Camera"}</button>}
                  {camPerm==="granted"&&<div style={{fontSize:19,color:C.teal,fontWeight:700}}>Allowed</div>}
                  {camPerm==="denied"&&<button onClick={askCamera} style={{background:"none",border:"1px solid "+C.muted,borderRadius:10,padding:"8px 16px",color:C.muted,fontWeight:600,fontSize:19,cursor:"pointer"}}>Try again</button>}
                </div>
              </div>
            </div>
            <div style={pBg}>
              <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                <div style={{width:52,height:52,borderRadius:14,background:locPerm==="granted"?C.tealFade:locPerm==="denied"?C.accentFade:C.tealFade,border:"1px solid "+(locPerm==="granted"?C.teal:locPerm==="denied"?C.accent:C.teal)+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,flexShrink:0}}>
                  {locPerm==="granted"?"✅":locPerm==="denied"?"📍":"🗺️"}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:30,marginBottom:3}}>Location</div>
                  <div style={{color:C.sub,fontSize:19,lineHeight:1.6,marginBottom:12}}>
                    {locPerm==="granted"?"Location access granted. We will find support groups and resources near you.":locPerm==="denied"?"Location blocked. Support group finder will not work, but everything else will.":"Find Saksham quit support groups near you and local NRT stores. Optional."}
                  </div>
                  {locPerm===null&&<button onClick={askLocation} disabled={permLoading==="loc"} style={{background:"linear-gradient(135deg,"+C.teal+","+C.purple+")",border:"none",borderRadius:10,padding:"10px 20px",color:"#fff",fontWeight:700,fontSize:30,cursor:"pointer",opacity:permLoading==="loc"?0.6:1}}>{permLoading==="loc"?"Asking...":"Allow Location"}</button>}
                  {locPerm==="granted"&&<div style={{fontSize:19,color:C.teal,fontWeight:700}}>Allowed</div>}
                  {locPerm==="denied"&&<button onClick={askLocation} style={{background:"none",border:"1px solid "+C.muted,borderRadius:10,padding:"8px 16px",color:C.muted,fontWeight:600,fontSize:19,cursor:"pointer"}}>Try again</button>}
                </div>
              </div>
            </div>
            <div style={{background:C.tealFade,border:"1px solid "+C.teal+"22",borderRadius:12,padding:"12px 14px",marginBottom:20,display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:19,flexShrink:0}}>🔒</span>
              <div style={{fontSize:30,color:C.sub,lineHeight:1.6}}>Your data stays on your device. We do not store photos, location, or any personal information on our servers.</div>
            </div>
            <button onClick={()=>setStep(4)} style={{width:"100%",background:C.accent,border:"none",borderRadius:13,padding:15,color:"#fff",fontWeight:800,fontSize:19,cursor:"pointer",marginBottom:10}}>
              {allAsked?"Lets go! 🚭":"Continue anyway"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={Object.assign({},wrap,{overflowY:"auto"})}>
        <div style={{maxWidth:420,margin:"0 auto",width:"100%",padding:28}}>
          <div style={{textAlign:"center",marginBottom:36}}>
            <div style={{fontSize:40,marginBottom:8}}>🚭</div>
            <div style={{fontSize:30,fontWeight:900,background:"linear-gradient(135deg,"+C.accent+","+C.teal+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Unsmoke</div>
            <div style={{color:C.sub,fontSize:19,marginTop:2}}>with Saksham</div>
          </div>
          {step===1&&(
            <>
              <div style={{fontSize:30,fontWeight:800,marginBottom:5}}>When did you quit?</div>
              <div style={{color:C.sub,fontSize:30,marginBottom:22,lineHeight:1.6}}>Set your quit date and we will track every second of your progress.</div>
              <div style={{marginBottom:14}}><label style={lblStyle}>Quit date</label><input type="date" style={inputStyle} value={sDate} onChange={e=>setSDate(e.target.value)}/></div>
              <div style={{marginBottom:22}}><label style={lblStyle}>Quit time</label><input type="time" style={inputStyle} value={sTime} onChange={e=>setSTime(e.target.value)}/></div>
              <Btn onClick={()=>setStep(2)} disabled={!sDate}>Next</Btn>
              <Btn ghost style={{marginTop:10}} onClick={()=>{setNowTime();setStep(2);}}>I am quitting right now</Btn>
            </>
          )}
          {step===2&&(
            <>
              <div style={{fontSize:30,fontWeight:800,marginBottom:5}}>Your smoking habit</div>
              <div style={{color:C.sub,fontSize:30,marginBottom:22,lineHeight:1.6}}>We will calculate exactly what you are saving.</div>
              <div style={{marginBottom:14}}><label style={lblStyle}>Cigarettes per day</label><input type="number" style={inputStyle} value={cpd} onChange={e=>setCpd(e.target.value)} min="1" max="100"/></div>
              <div style={{marginBottom:14}}><label style={lblStyle}>Price per pack (Rs)</label><input type="number" style={inputStyle} value={pp} onChange={e=>setPP(e.target.value)} min="10"/></div>
              <div style={{marginBottom:22}}><label style={lblStyle}>Cigarettes per pack</label><input type="number" style={inputStyle} value={cpp} onChange={e=>setCpp(e.target.value)} min="5" max="40"/></div>
              <Btn onClick={saveSetup}>Start My Journey</Btn>
              <Btn ghost style={{marginTop:10}} onClick={()=>setStep(1)}>Back</Btn>
            </>
          )}
        </div>
      </div>
    );
  }

  // MAIN APP
  const TABS=[{id:"home",icon:"🏠",label:"Home"},{id:"messages",icon:"💬",label:"Messages"},{id:"community",icon:"🤝",label:"Community"},{id:"sos",icon:"🆘",label:"SOS"},{id:"journey",icon:"🗓",label:"Journey"}];

  return (
    <div style={wrap}>
      {/* AI Chat screens */}
      {premiumScreen==="coach"&&<AIChat systemPrompt={coachSystem} welcomeMsg={"Hey! "+d+" days smoke-free with a score of "+healthScore+"/100. Solid. What is on your mind today?"} avatar="🤖" name="AI Quit Coach" subtitle="Powered by Claude - Online" onClose={()=>setPremiumScreen(null)}/>}
      {premiumScreen==="saksham"&&<SakshamChat userPhone={authUser?authUser.phone:authPhone} userName={userName} d={d} healthScore={healthScore} onClose={()=>setPremiumScreen(null)}/>}

      {/* NRT overlay */}
      {premiumScreen==="nrt"&&(
        <div style={{position:"absolute",inset:0,zIndex:999,background:"#F5F0E8",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{paddingTop:"max(48px, env(safe-area-inset-top, 48px))",paddingBottom:14,paddingLeft:16,paddingRight:16,borderBottom:"1px solid #E8DDD0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div><div style={{fontWeight:800,fontSize:30,color:"#1A1208"}}>NRT Step-Down Plan</div><div style={{fontSize:30,color:"#786858"}}>Saksham own protocol</div></div>
            <button onClick={()=>setPremiumScreen(null)} style={{background:"#FAF7F2",border:"1px solid #E8DDD0",borderRadius:20,padding:"6px 14px",color:"#786858",fontSize:19,fontWeight:700,cursor:"pointer"}}>Close</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"20px 16px"}}>
            <div style={{background:"rgba(255,184,0,0.1)",border:"1px solid #FFB80033",borderRadius:14,padding:"16px",marginBottom:16}}>
              <div style={{fontSize:19,fontWeight:700,color:"#FFB800",marginBottom:12}}>Your smoking details</div>
              <label style={{color:"#786858",fontSize:30,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:5,display:"block"}}>Cigarettes per day</label>
              <input type="number" value={nrtCigsLocal} onChange={e=>setNrtCigsLocal(e.target.value)} min="1" max="80" style={{background:"#FAF7F2",border:"1px solid #E8DDD0",borderRadius:9,padding:"12px 13px",color:"#1A1208",fontSize:19,width:"100%",boxSizing:"border-box",outline:"none"}}/>
            </div>
            <div style={{fontSize:30,color:"#786858",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:12}}>Your personalized plan</div>
            {nrtPlan.map((step,i)=>(
              <div key={i} style={{background:"#FFFFFF",border:"1px solid #E8DDD0",borderRadius:14,padding:"16px 14px",marginBottom:10,borderLeft:"3px solid "+(i===0?"#FF6534":i===1?"#FFB800":"#00D9AA")}}>
                <div style={{fontSize:30,color:"#C8B8A8",marginBottom:4}}>{step.week}</div>
                <div style={{fontWeight:800,fontSize:30,color:i===0?"#FF6534":i===1?"#FFB800":"#00D9AA",marginBottom:6}}>{step.patch}</div>
                <div style={{fontSize:30,color:"#786858",lineHeight:1.6}}>{step.desc}</div>
              </div>
            ))}
            <div style={{background:"rgba(139,92,246,0.1)",border:"1px solid #8B5CF633",borderRadius:14,padding:"16px",marginTop:4}}>
              <div style={{fontSize:19,fontWeight:700,color:"#8B5CF6",marginBottom:6}}>Saksham note</div>
              <div style={{fontSize:30,color:"#786858",lineHeight:1.7}}>The patch does the physical work. Your real job is breaking the habit loops. Saksham went cold turkey from Day 8 - but this is optional. If you feel strong, skip the patch and go cold turkey from Day 1.</div>
            </div>
          </div>
        </div>
      )}

      {/* Founder story overlay */}
      {showFounderStory&&(
        <div style={{position:"fixed",inset:0,zIndex:997,background:"#F5F0E8",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{paddingTop:"max(48px, env(safe-area-inset-top, 48px))",paddingBottom:14,paddingLeft:16,paddingRight:16,borderBottom:"1px solid #E8DDD0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div><div style={{fontWeight:800,fontSize:30,color:"#1A1208"}}>Saksham Story</div><div style={{fontSize:30,color:"#786858"}}>@ssakshamchauhan</div></div>
            <button onClick={()=>setShowFounderStory(false)} style={{background:"#FAF7F2",border:"1px solid #E8DDD0",borderRadius:20,padding:"6px 14px",color:"#786858",fontSize:19,fontWeight:700,cursor:"pointer"}}>Close</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"20px 16px"}}>
            <div style={{background:"linear-gradient(135deg,rgba(255,101,52,0.08),rgba(0,217,170,0.08))",border:"1px solid rgba(0,217,170,0.2)",borderRadius:16,padding:"20px 16px",marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{width:48,height:48,borderRadius:"50%",background:"linear-gradient(135deg,#FF6534,#00D9AA)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,flexShrink:0}}>🧑</div>
                <div><div style={{fontWeight:800,fontSize:30,color:"#1A1208"}}>Saksham Singh Chauhan</div><div style={{color:"#786858",fontSize:19,marginTop:2}}>Founder - Delhi</div></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[{v:String(founderDays),l:"days quit"},{v:"40",l:"cigs/day before"},{v:"12 yrs",l:"he smoked"}].map(({v,l})=>(
                  <div key={l} style={{textAlign:"center",background:"#FFFFFF",borderRadius:10,padding:"10px 6px"}}>
                    <div style={{fontSize:19,fontWeight:900,color:"#00D9AA"}}>{v}</div>
                    <div style={{fontSize:19,color:"#786858",marginTop:2}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:12,padding:"10px 12px",background:"rgba(255,184,0,0.08)",borderRadius:10,borderLeft:"3px solid #FFB800"}}>
                <div style={{fontSize:19,color:"#FFB800",fontWeight:700}}>Oct 31, 2024 - Last cigarette</div>
                <div style={{fontSize:30,color:"#786858",marginTop:2}}>219K views - 4,381 likes - 1,807 shares</div>
              </div>
            </div>
            {FOUNDER_STORY.map((ch,i)=>(
              <div key={i} style={{background:"#FFFFFF",border:"1px solid #E8DDD0",borderRadius:14,padding:"16px 14px",marginBottom:14,borderColor:ch.color+"33"}}>
                <div style={{fontSize:19,fontWeight:800,letterSpacing:"0.1em",color:ch.color,textTransform:"uppercase",marginBottom:8}}>{ch.label}</div>
                <div style={{fontSize:19,fontWeight:800,color:"#1A1208",marginBottom:10,lineHeight:1.4}}>{ch.heading}</div>
                <div style={{fontSize:30,color:"#786858",lineHeight:1.75,whiteSpace:"pre-line"}}>{ch.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}


      {showHomePrompt&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:2000,background:"rgba(0,0,0,0.5)"}} onClick={()=>setShowHomePrompt(false)}>
          <div style={{background:C.surface,borderRadius:"24px 24px 0 0",padding:"24px 20px 40px",border:"1px solid "+C.border}} onClick={e=>e.stopPropagation()}>
            <div style={{width:40,height:4,background:C.muted,borderRadius:2,margin:"0 auto 20px"}}/>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:32,marginBottom:8}}>📲</div>
              <div style={{fontSize:30,fontWeight:900,color:C.text,marginBottom:8}}>Add to Your Home Screen</div>
              <div style={{fontSize:30,color:C.sub,lineHeight:1.7}}>For the best experience, install Unsmoke as an app on your phone. It works exactly like a real app.</div>
            </div>
            <div style={{background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:14,padding:"14px 16px",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:28,height:28,background:C.goldFade,border:"1px solid "+C.gold+"44",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>1</div>
                <div style={{fontSize:30,color:C.text}}>Tap the <strong>Share button</strong> at the bottom of Safari</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:28,height:28,background:C.goldFade,border:"1px solid "+C.gold+"44",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>2</div>
                <div style={{fontSize:30,color:C.text}}>Scroll down and tap <strong>Add to Home Screen</strong></div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:28,height:28,background:C.goldFade,border:"1px solid "+C.gold+"44",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0}}>3</div>
                <div style={{fontSize:30,color:C.text}}>Tap <strong>Add</strong> — done. Unsmoke is now on your home screen.</div>
              </div>
            </div>
            <button onClick={()=>{setShowHomePrompt(false);localStorage.setItem('prompted','1');}} style={{width:"100%",background:"linear-gradient(135deg,"+C.gold+","+C.amber+")",border:"none",borderRadius:14,padding:14,color:"#fff",fontWeight:800,fontSize:30,cursor:"pointer",marginBottom:8}}>Got it!</button>
            <button onClick={()=>setShowHomePrompt(false)} style={{width:"100%",background:"none",border:"none",color:C.muted,fontSize:30,cursor:"pointer"}}>Continue in browser</button>
          </div>
        </div>
      )}


      {/* 7-Day Preparation Program Overlay */}
      {prepOpen!==null&&(
        <div style={{position:"fixed",inset:0,zIndex:997,background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{paddingTop:"max(48px, env(safe-area-inset-top, 48px))",paddingBottom:14,paddingLeft:16,paddingRight:16,borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:C.surfaceHi}}>
            <div>
              <div style={{fontSize:19,color:C.emerald,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>Day {(prepOpen||0)+1} of 7</div>
              <div style={{fontWeight:900,fontSize:19,color:C.text}}>{PREP_DAYS[prepOpen||0].title}</div>
            </div>
            <button onClick={()=>setPrepOpen(null)} style={{background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:20,padding:"6px 14px",color:C.sub,fontSize:19,fontWeight:600,cursor:"pointer"}}>Close</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"20px 18px"}}>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              <div style={{background:C.emeraldFade,border:"1px solid "+C.emerald+"44",borderRadius:20,padding:"4px 12px",fontSize:30,color:C.emerald,fontWeight:700}}>{PREP_DAYS[prepOpen||0].duration}</div>
              <div style={{background:C.goldFade,border:"1px solid "+C.gold+"44",borderRadius:20,padding:"4px 12px",fontSize:30,color:C.gold,fontWeight:700}}>{PREP_DAYS[prepOpen||0].type==="ceremony"?"Quit Day Ritual":"Reading"}</div>
            </div>
            <div style={{fontSize:19,color:C.text,lineHeight:1.85,marginBottom:20}}>{PREP_DAYS[prepOpen||0].content}</div>
            <div style={{background:C.goldFade,border:"1px solid "+C.gold+"33",borderRadius:14,padding:"16px",marginBottom:16}}>
              <div style={{fontSize:30,color:C.gold,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Today Exercise</div>
              <div style={{fontSize:30,color:C.text,lineHeight:1.75}}>{PREP_DAYS[prepOpen||0].exercise}</div>
            </div>
            <div style={{background:C.emeraldFade,border:"1px solid "+C.emerald+"33",borderRadius:14,padding:"14px",marginBottom:24,borderLeft:"3px solid "+C.emerald}}>
              <div style={{fontSize:30,color:C.emerald,fontWeight:800,textTransform:"uppercase",marginBottom:6}}>Key Insight</div>
              <div style={{fontSize:19,color:C.text,fontWeight:700,lineHeight:1.5}}>{PREP_DAYS[prepOpen||0].key}</div>
            </div>
            {!prepRead.includes(prepOpen||0)&&(
              <button onClick={()=>{const u=[...prepRead,prepOpen||0];setPrepRead(u);localStorage.setItem("prep_read",JSON.stringify(u));if((prepOpen||0)<6)setPrepOpen((prepOpen||0)+1);else setPrepOpen(null);}} style={{width:"100%",background:"linear-gradient(135deg,"+C.gold+","+C.amber+")",border:"none",borderRadius:14,padding:14,color:"#fff",fontWeight:800,fontSize:30,cursor:"pointer",boxShadow:"0 4px 16px rgba(160,114,10,0.25)"}}>
                {(prepOpen||0)<6?"Mark complete and continue":"Complete the program"}
              </button>
            )}
            {prepRead.includes(prepOpen||0)&&(
              <div style={{textAlign:"center",padding:"12px",color:C.emerald,fontWeight:700,fontSize:19}}>Day {(prepOpen||0)+1} completed ✓</div>
            )}
          </div>
        </div>
      )}

      {/* Journal Overlay */}
      {showJournal&&(
        <div style={{position:"fixed",inset:0,zIndex:997,background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{paddingTop:"max(48px, env(safe-area-inset-top, 48px))",paddingBottom:14,paddingLeft:16,paddingRight:16,borderBottom:"1px solid "+C.border,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:C.surfaceHi}}>
            <div><div style={{fontWeight:900,fontSize:19,color:C.text}}>Quit Journal</div><div style={{fontSize:30,color:C.sub,marginTop:2}}>Your private space</div></div>
            <button onClick={()=>setShowJournal(false)} style={{background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:20,padding:"6px 14px",color:C.sub,fontSize:19,fontWeight:600,cursor:"pointer"}}>Close</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>
            <div style={{marginBottom:16}}>
              <textarea value={journalText} onChange={e=>setJournalText(e.target.value)} placeholder={"How are you feeling today? What was hard? What surprised you? This is private."+String.fromCharCode(10)+String.fromCharCode(10)+"Write anything."} style={{width:"100%",minHeight:140,background:C.surface,border:"1px solid "+C.border,borderRadius:14,padding:"14px",color:C.text,fontSize:19,outline:"none",resize:"vertical",lineHeight:1.7,boxSizing:"border-box"}}/>
              <button onClick={async()=>{
                if(!journalText.trim())return;
                const entry={id:Date.now(),text:sanitize(journalText.trim()),ts:Date.now(),day:d};
                const updated=[entry,...journalEntries];
                setJournalEntries(updated);setJournalText("");
                const phone=authUser?authUser.phone:authPhone;
                if(phone)await FB.merge("users/"+phone,{journalFull:updated});
              }} style={{width:"100%",marginTop:10,background:"linear-gradient(135deg,"+C.gold+","+C.amber+")",border:"none",borderRadius:12,padding:13,color:"#fff",fontWeight:700,fontSize:19,cursor:"pointer"}}>Save Entry</button>
            </div>
            {journalEntries.length===0&&<div style={{textAlign:"center",padding:"32px 20px",color:C.muted,fontSize:24}}>No entries yet. Start writing.</div>}
            {journalEntries.map(e=>(
              <div key={e.id} style={{background:C.surface,border:"1px solid "+C.border,borderRadius:14,padding:"14px 16px",marginBottom:10}}>
                <div style={{fontSize:30,color:C.sub,marginBottom:8}}>{new Date(e.ts).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})} · Day {e.day} smoke-free</div>
                <div style={{fontSize:30,color:C.text,lineHeight:1.7,whiteSpace:"pre-line"}}>{e.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Peer Chat Overlay */}
      {peerChat&&(
        <div style={{position:"fixed",inset:0,zIndex:1001,background:C.bg,display:"flex",flexDirection:"column"}}>
          <div style={{paddingTop:"max(48px,env(safe-area-inset-top,48px))",paddingBottom:14,paddingLeft:16,paddingRight:16,borderBottom:"1px solid "+C.border,display:"flex",alignItems:"center",gap:12,flexShrink:0,background:C.surfaceHi}}>
            <button onClick={()=>setPeerChat(null)} style={{background:"none",border:"none",color:C.gold,fontSize:34,cursor:"pointer",padding:"0 8px 0 0"}}>←</button>
            <div style={{width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,"+C.orchid+","+C.gold+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,fontWeight:900,color:"#fff",flexShrink:0}}>{(peerChat.name||"?")[0].toUpperCase()}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:30,color:C.text}}>{peerChat.name}</div>
              <div style={{fontSize:30,color:C.sub}}>ID: {peerChat.publicId}</div>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
            {peerMsgs.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:C.muted,fontSize:24}}>Start the conversation. You are both on the same journey.</div>}
            {peerMsgs.map(msg=>{
              const myPhone=authUser?authUser.phone:authPhone;
              const isMe=msg.senderPhone===myPhone;
              return (
                <div key={msg.id} style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start"}}>
                  <div style={{maxWidth:"78%"}}>
                    <div style={{padding:"12px 16px",borderRadius:isMe?"18px 18px 4px 18px":"18px 18px 18px 4px",background:isMe?"linear-gradient(135deg,"+C.gold+","+C.amber+")":C.surface,color:isMe?"#fff":C.text,fontSize:30,lineHeight:1.65,border:isMe?"none":"1px solid "+C.border,boxShadow:isMe?"0 4px 12px rgba(160,114,10,0.2)":"0 1px 4px rgba(0,0,0,0.05)"}}>{msg.text}</div>
                    <div style={{fontSize:19,color:C.muted,marginTop:3,textAlign:isMe?"right":"left"}}>{new Date(msg.ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{padding:"12px 16px",paddingBottom:"calc(env(safe-area-inset-bottom,0px)+12px)",borderTop:"1px solid "+C.border,background:C.surface,display:"flex",gap:10,flexShrink:0}}>
            <input value={peerInput} onChange={e=>setPeerInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendPeerMsg()} placeholder={"Message "+peerChat.name+"..."} style={{flex:1,minWidth:0,background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:24,padding:"11px 16px",color:C.text,fontSize:19,outline:"none"}}/>
            <button onClick={sendPeerMsg} disabled={peerSending||!peerInput.trim()} style={{background:"linear-gradient(135deg,"+C.gold+","+C.amber+")",border:"none",borderRadius:"50%",width:46,height:46,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,opacity:peerSending||!peerInput.trim()?0.4:1}}>
              <span style={{color:"#fff",fontSize:34,fontWeight:900}}>↑</span>
            </button>
          </div>
        </div>
      )}

      {/* Profile overlay */}
      {showProfile&&(
        <div style={{position:"fixed",inset:0,zIndex:1005,background:"rgba(0,0,0,0.85)",display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div style={{background:C.surface,borderRadius:"20px 20px 0 0",padding:"28px 20px 40px",border:"1px solid "+C.border}}>
            <div style={{width:40,height:4,background:C.muted,borderRadius:2,margin:"0 auto 24px"}}/>
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
              <div style={{width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,"+C.accent+","+C.purple+")",border:"3px solid "+C.teal,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                {authUser&&authUser.photo?<img src={authUser.photo} alt="p" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:28}}>🧑</span>}
              </div>
              <div>
                <div style={{fontWeight:900,fontSize:22}}>{authUser?authUser.name||authName:"User"}</div>
                <div style={{fontSize:19,color:C.sub,marginTop:2}}>+91 {authUser?authUser.phone:authPhone}</div>
                <div style={{fontSize:30,color:C.teal,marginTop:3,fontWeight:700}}>{streak} day streak - {d} days quit</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
              {[{v:d,l:"days quit",c:C.accent},{v:healthScore,l:"health score",c:C.teal},{v:"Rs "+money.toLocaleString("en-IN"),l:"saved",c:C.teal}].map(({v,l,c})=>(
                <div key={l} style={{textAlign:"center",background:C.surfaceHi,borderRadius:12,padding:"12px 6px",border:"1px solid "+C.border}}>
                  <div style={{fontSize:30,fontWeight:900,color:c}}>{v}</div>
                  <div style={{fontSize:19,color:C.sub,marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>{setShowProfile(false);setShowPremium(true);}} style={{width:"100%",background:C.amberFade,border:"1px solid "+C.amber+"44",borderRadius:12,padding:13,color:C.amber,fontWeight:700,fontSize:19,cursor:"pointer",marginBottom:10}}>
              {isPremium?"Manage Premium":"Upgrade to Premium"}
            </button>
            <button onClick={logout} style={{width:"100%",background:C.accentFade,border:"1px solid "+C.accent+"44",borderRadius:12,padding:13,color:C.accent,fontWeight:700,fontSize:19,cursor:"pointer",marginBottom:10}}>
              Log out
            </button>
            <button onClick={()=>setShowProfile(false)} style={{width:"100%",background:"none",border:"none",color:C.muted,fontSize:19,cursor:"pointer",padding:8}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Snap viewer */}
      {viewingSnap&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,background:"#000",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:"linear-gradient(160deg,#F5F0E8,#EDE5D8)",border:"1px solid "+C.purple+"44",borderRadius:20,width:"100%",maxWidth:360,overflow:"hidden"}}>
            {viewingSnap.photo&&<div style={{position:"relative",width:"100%",paddingBottom:"60%",overflow:"hidden"}}><img src={viewingSnap.photo} alt="snap" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/><div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 50%,#F5F0E8 100%)"}}/><div style={{position:"absolute",bottom:12,left:0,right:0,textAlign:"center",color:"#fff",fontWeight:800,fontSize:22}}>{viewingSnap.senderName}</div></div>}
            <div style={{padding:"20px 20px 24px",textAlign:"center"}}>
              {!viewingSnap.photo&&<div style={{fontWeight:800,fontSize:34,marginBottom:16}}>{viewingSnap.senderName}</div>}
              <div style={{fontSize:60,fontWeight:900,color:C.accent,lineHeight:1}}>{viewingSnap.quitDays}</div>
              <div style={{fontSize:30,color:C.sub,marginTop:4,marginBottom:16}}>days smoke-free</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
                {[{v:viewingSnap.healthScore,l:"score",c:C.teal},{v:viewingSnap.cigsAvoided,l:"avoided",c:C.teal},{v:"Rs "+(viewingSnap.moneySaved||0).toLocaleString("en-IN"),l:"saved",c:C.teal}].map(({v,l,c})=>(
                  <div key={l} style={{background:"rgba(255,255,255,0.05)",borderRadius:10,padding:"8px 4px"}}>
                    <div style={{fontSize:19,fontWeight:900,color:c}}>{v}</div>
                    <div style={{fontSize:8,color:C.sub,marginTop:2}}>{l}</div>
                  </div>
                ))}
              </div>
              {viewingSnap.message&&<div style={{fontSize:30,color:C.text,fontStyle:"italic",background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"12px 16px",marginBottom:12}}>{viewingSnap.message}</div>}
              <button onClick={()=>{handleSnapViewed();setViewingSnap(null);}} style={{background:C.teal,border:"none",borderRadius:11,padding:"12px 32px",fontWeight:700,fontSize:19,cursor:"pointer",color:"#F5F0E8"}}>Done</button>
            </div>
          </div>
        </div>
      )}

      {celebMS&&!viewingSnap&&(
        <div style={{position:"fixed",top:60,left:"50%",transform:"translateX(-50%)",zIndex:995,background:"linear-gradient(135deg,"+C.teal+","+C.purple+")",borderRadius:14,padding:"12px 20px",textAlign:"center",boxShadow:"0 8px 32px rgba(0,0,0,0.5)",maxWidth:280,pointerEvents:"none"}}>
          <div style={{fontWeight:800,fontSize:30,color:"#fff"}}>Milestone reached!</div>
          <div style={{fontSize:19,color:"rgba(255,255,255,0.8)",marginTop:2}}>{celebMS.label}</div>
        </div>
      )}

      {showSlipped&&(
        <div style={{position:"fixed",inset:0,zIndex:996,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={crd({maxWidth:340,width:"100%",padding:24})}>
            <div style={{fontSize:34,textAlign:"center",marginBottom:8}}>💙</div>
            <div style={{fontSize:30,fontWeight:800,textAlign:"center",marginBottom:8}}>It is okay. One slip does not define you.</div>
            <div style={{color:C.sub,fontSize:30,lineHeight:1.7,marginBottom:16}}>You have been smoke-free for <span style={{color:C.teal,fontWeight:700}}>{d}d {h}h</span>. That is real. One cigarette does not erase that.</div>
            <Btn onClick={()=>setShowSlipped(false)} style={{marginBottom:10,background:C.teal}}>I am still quit - it was one moment</Btn>
            <Btn ghost onClick={confirmSlipped}>Restart my timer from now</Btn>
            <button onClick={()=>setShowSlipped(false)} style={{background:"none",border:"none",color:C.muted,fontSize:19,cursor:"pointer",width:"100%",marginTop:8}}>Close</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{padding:"12px 16px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid "+C.border,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>setShowProfile(true)} style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,"+C.accent+","+C.purple+")",border:"2px solid "+C.teal+"44",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",cursor:"pointer",padding:0,flexShrink:0}}>
            {authUser&&authUser.photo?<img src={authUser.photo} alt="p" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:19}}>🧑</span>}
          </button>
          <div>
            <div style={{fontWeight:900,fontSize:19,background:"linear-gradient(135deg,"+C.accent+","+C.teal+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>Unsmoke</div>
            <div style={{color:"rgba(201,168,76,0.55)",fontSize:19,lineHeight:1,letterSpacing:"0.04em"}}>{authUser?authUser.name||authName:"with Saksham"}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{fontSize:30,fontWeight:700,color:C.teal}}>🔥 {streak}d</div>
          <button onClick={()=>setShowPremium(true)} style={{background:isPremium?"linear-gradient(135deg,"+C.gold+","+C.amber+")":C.amberFade,border:"1px solid "+C.gold+"44",borderRadius:20,padding:"5px 10px",color:isPremium?"#F5F0E8":C.gold,fontSize:30,fontWeight:800,cursor:"pointer"}}>
            {isPremium?"👑 PRO":"👑"}
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div style={{flex:1,overflowY:"auto"}}>

        {tab==="home"&&(
          <div style={{padding:"16px 14px"}}>
            <div style={crd({marginBottom:12,background:"linear-gradient(160deg,#F5F0E8,#FAF7F2)"})}>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <ScoreRing score={healthScore}/>
                <div style={{flex:1}}>
                  <div style={{color:C.sub,fontSize:30,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Smoke-free</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {[{v:d,l:"d"},{v:h,l:"h"},{v:m,l:"m"},{v:s,l:"s"}].map(({v,l})=>(
                      <div key={l}><span style={{fontSize:34,fontWeight:900,color:C.accent,fontVariantNumeric:"tabular-nums"}}>{pad(v)}</span><span style={{fontSize:30,color:C.sub,marginLeft:1}}>{l}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[{v:cigs,l:"not smoked",c:C.teal},{v:"Rs "+money.toLocaleString("en-IN"),l:"saved",c:C.teal},{v:streak+"d",l:"streak",c:C.purple}].map(({v,l,c})=>(
                <div key={l} style={crd({textAlign:"center",padding:"12px 8px"})}><div style={{fontSize:19,fontWeight:900,color:c}}>{v}</div><div style={{color:C.sub,fontSize:19,marginTop:2}}>{l}</div></div>
              ))}
            </div>

            {/* Sponsored Banner - image ads */}
            <div style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <div style={{fontSize:19,color:C.muted,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:700}}>{curBanner.tag}</div>
                <div style={{fontSize:19,color:C.muted}}>Ad</div>
              </div>
              <div onClick={()=>window.open(curBanner.url,"_blank")} style={{background:C.surface,border:"1px solid "+C.border,borderRadius:16,overflow:"hidden",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
                {curBanner.image?(
                  <img src={curBanner.image} alt={curBanner.brand} style={{width:"100%",height:140,objectFit:"cover",display:"block"}}/>
                ):(
                  <div style={{height:140,background:"linear-gradient(135deg,"+curBanner.color+"22,"+curBanner.color+"08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <div style={{fontSize:64}}>{curBanner.emoji}</div>
                  </div>
                )}
                <div style={{padding:"12px 14px",borderTop:"1px solid "+C.border}}>
                  <div style={{fontSize:30,color:curBanner.color,fontWeight:700,marginBottom:3}}>{curBanner.brand}</div>
                  <div style={{fontWeight:700,fontSize:30,color:C.text,marginBottom:8,lineHeight:1.35}}>{curBanner.headline}</div>
                  <div style={{display:"inline-block",background:curBanner.color,color:"#fff",borderRadius:20,padding:"4px 14px",fontSize:30,fontWeight:700}}>{curBanner.cta} →</div>
                </div>
                <div style={{display:"flex",justifyContent:"center",gap:5,padding:"8px 0"}}>
                  {BANNERS.map((_,bi)=>(
                    <div key={bi} onClick={e=>{e.stopPropagation();setBannerIdx(bi);}} style={{height:4,borderRadius:2,background:bi===bannerIdx?curBanner.color:C.muted,width:bi===bannerIdx?20:5,transition:"all 0.3s",cursor:"pointer"}}/>
                  ))}
                </div>
              </div>
              <div style={{textAlign:"center",marginTop:5,fontSize:19,color:C.muted}}>Advertise here → DM @ssakshamchauhan</div>
            </div>

            {/* AI Coach quick access */}
            <div onClick={()=>{setShowPremium(true);}} style={{...glassCard(C.emerald+"44",{marginBottom:12,cursor:"pointer",background:"linear-gradient(135deg,rgba(10,138,106,0.05),rgba(10,138,106,0.02))"})}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:46,height:46,borderRadius:"50%",background:"linear-gradient(135deg,"+C.emerald+",rgba(10,138,106,0.7))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,flexShrink:0,boxShadow:"0 4px 12px rgba(10,138,106,0.25)"}}>🤖</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:900,fontSize:30,color:C.text,marginBottom:2}}>AI Quit Coach</div>
                  <div style={{fontSize:19,color:C.sub}}>24/7 — knows your exact journey. Ask anything.</div>
                </div>
                <span style={{color:C.emerald,fontSize:24}}>›</span>
              </div>
            </div>

            {/* Chat with Saksham */}
            <div onClick={()=>setTab("messages")} style={{...glassCard(C.gold+"44",{marginBottom:12,cursor:"pointer",background:"linear-gradient(135deg,rgba(160,114,10,0.05),rgba(184,112,0,0.02))",boxShadow:"0 4px 16px rgba(160,114,10,0.10)"})}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{position:"relative",flexShrink:0}}>
                  <div style={{width:50,height:50,borderRadius:"50%",background:"linear-gradient(135deg,"+C.gold+","+C.amber+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,fontWeight:900,color:"#fff",boxShadow:"0 4px 12px rgba(160,114,10,0.25)"}}>S</div>
                  <div style={{position:"absolute",bottom:1,right:1,width:12,height:12,borderRadius:"50%",background:C.emerald,border:"2px solid "+C.surface}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:900,fontSize:30,color:C.text,marginBottom:2}}>Chat with Saksham</div>
                  <div style={{fontSize:19,color:C.sub,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{msgThread.length>0?(msgThread[msgThread.length-1].role==="saksham"?"Saksham: ":"You: ")+msgThread[msgThread.length-1].text:"He reads every message — ask him anything"}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                  {msgUnread>0&&<div style={{background:C.ruby,color:"#fff",borderRadius:20,padding:"2px 8px",fontSize:30,fontWeight:800}}>{msgUnread}</div>}
                  <span style={{color:C.gold,fontSize:24}}>›</span>
                </div>
              </div>
            </div>

            {!isPremium&&(
              <div onClick={()=>setShowPremium(true)} style={crd({marginBottom:10,cursor:"pointer",background:C.amberFade,borderColor:C.gold+"44"})}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{fontSize:24}}>👑</div>
                  <div style={{flex:1}}><div style={{fontWeight:800,fontSize:30,color:C.gold}}>AI Coach - Chat - NRT Plan</div><div style={{fontSize:19,color:C.sub,marginTop:2}}>Unlock Premium features</div></div>
                  <span style={{color:C.gold,fontSize:19}}>›</span>
                </div>
              </div>
            )}
            <div style={crd({marginBottom:10,background:C.amberFade,borderColor:C.amber+"33"})}>
              <div style={{fontSize:30,color:C.amber,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>Today challenge</div>
              <div style={{fontSize:30,color:C.text,lineHeight:1.65}}>{challenge}</div>
            </div>
            <div style={crd({marginBottom:10})}>
              <div style={{fontSize:30,color:C.sub,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>Milestones</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                {ACHIEVEMENTS.map(a=>{
                  const u=elMin>=a.min;
                  return <div key={a.id} style={{padding:"5px 11px",borderRadius:20,background:u?C.tealFade:C.surfaceHi,color:u?C.teal:C.muted,fontSize:30,border:"1px solid "+(u?C.teal+"44":C.border),fontWeight:u?700:400}}>{a.icon} {a.label}</div>;
                })}
              </div>
            </div>
            <button onClick={()=>setShowSlipped(true)} style={{background:"none",border:"none",color:C.muted,fontSize:19,cursor:"pointer",width:"100%",padding:"8px 0",textDecoration:"underline"}}>I slipped today</button>
            {/* Founder story card */}
            <div onClick={()=>setShowFounderStory(true)} style={crd({marginTop:8,cursor:"pointer",background:"linear-gradient(135deg,rgba(255,101,52,0.07),rgba(139,92,246,0.07))",borderColor:C.accent+"33"})}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,"+C.accent+","+C.purple+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,flexShrink:0}}>🧑</div>
                <div style={{flex:1}}><div style={{fontWeight:800,fontSize:19,color:C.text}}>Saksham Story</div><div style={{color:C.sub,fontSize:19,marginTop:2}}>2 packs a day. 12 years. Then Oct 31, 2024.</div></div>
                <div style={{color:C.muted,fontSize:22}}>›</div>
              </div>
            </div>
            {/* Premium quick access */}
            {isPremium&&(
              <div style={crd({marginTop:8})}>
                <div style={{fontSize:30,color:C.gold,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>👑 Premium</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[{label:"💬 Chat Coach",screen:"coach",c:C.teal},{label:"💊 NRT Plan",screen:"nrt",c:C.amber}].map(({label,screen,c})=>(
                    <button key={screen} onClick={()=>setPremiumScreen(screen)} style={{background:c+"22",border:"1px solid "+c+"44",borderRadius:10,padding:"10px 8px",color:c,fontWeight:700,fontSize:30,cursor:"pointer"}}>{label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}


        {tab==="messages"&&(
          <div style={{display:"flex",flexDirection:"column",height:"100%"}}>

            {/* Header */}
            <div style={{padding:"16px 18px 12px",borderBottom:"1px solid "+C.border,background:C.surface,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:46,height:46,borderRadius:"50%",background:"linear-gradient(135deg,"+C.gold+","+C.amber+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,fontWeight:900,color:"#fff",flexShrink:0,boxShadow:"0 4px 14px rgba(160,114,10,0.25)"}}>S</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:900,fontSize:19,color:C.text}}>Saksham</div>
                  <div style={{fontSize:30,color:C.emerald,marginTop:2,fontWeight:600}}>Founder · Unsmoke with Saksham</div>
                </div>
                <div style={{fontSize:30,color:C.sub,background:C.surfaceHi,padding:"4px 10px",borderRadius:20,border:"1px solid "+C.border}}>Responds same day</div>
              </div>
              <div style={{marginTop:12,padding:"10px 12px",background:C.goldFade,borderRadius:10,border:"1px solid "+C.gold+"33",fontSize:19,color:C.sub,lineHeight:1.6}}>
                {d+" days smoke-free. Health score "+healthScore+"/100. Saksham reads every message personally."}
              </div>
            </div>

            {/* Messages */}
            <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
              {msgThread.length===0&&(
                <div style={{textAlign:"center",padding:"32px 20px",color:C.muted}}>
                  <div style={{fontSize:36,marginBottom:12}}>💬</div>
                  <div style={{fontWeight:700,fontSize:19,color:C.text,marginBottom:6}}>Start a conversation with Saksham</div>
                  <div style={{fontSize:30,color:C.sub,lineHeight:1.65}}>He quit after 12 years of 2 packs a day. Ask him anything about quitting. He reads every message.</div>
                </div>
              )}
              {msgThread.map(msg=>(
                <div key={msg.id||msg.ts} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start",alignItems:"flex-end",gap:8}}>
                  {msg.role==="saksham"&&(
                    <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,"+C.gold+","+C.amber+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,fontWeight:900,color:"#fff",flexShrink:0}}>S</div>
                  )}
                  <div style={{maxWidth:"78%"}}>
                    <div style={{padding:"11px 15px",borderRadius:msg.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:msg.role==="user"?"linear-gradient(135deg,"+C.gold+","+C.amber+")":C.surface,color:msg.role==="user"?"#fff":C.text,fontSize:30,lineHeight:1.7,border:msg.role==="user"?"none":"1px solid "+C.border,boxShadow:msg.role==="user"?"0 4px 14px rgba(160,114,10,0.2)":"0 1px 4px rgba(0,0,0,0.06)"}}>
                      {msg.text}
                    </div>
                    <div style={{fontSize:19,color:C.muted,marginTop:3,textAlign:msg.role==="user"?"right":"left",paddingLeft:msg.role==="saksham"?4:0,paddingRight:msg.role==="user"?4:0}}>
                      {new Date(msg.ts).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
                    </div>
                  </div>
                </div>
              ))}
              {msgSending&&(
                <div style={{display:"flex",justifyContent:"flex-end"}}>
                  <div style={{padding:"10px 15px",borderRadius:"18px 18px 4px 18px",background:C.goldFade,border:"1px solid "+C.gold+"44",fontSize:30,color:C.sub}}>Sending...</div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{padding:"12px 16px",paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 12px)",borderTop:"1px solid "+C.border,background:C.surface,display:"flex",gap:10,flexShrink:0}}>
              <input value={msgInput} onChange={e=>setMsgInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMsg()} placeholder="Message Saksham..." style={{flex:1,minWidth:0,background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:24,padding:"11px 16px",color:C.text,fontSize:19,outline:"none"}}/>
              <button onClick={sendMsg} disabled={msgSending||!msgInput.trim()} style={{background:"linear-gradient(135deg,"+C.gold+","+C.amber+")",border:"none",borderRadius:"50%",width:46,height:46,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,opacity:msgSending||!msgInput.trim()?0.4:1,boxShadow:"0 4px 12px rgba(160,114,10,0.3)"}}>
                <span style={{color:"#fff",fontSize:34,fontWeight:900}}>↑</span>
              </button>
            </div>
          </div>
        )}


        {tab==="community"&&(
          <div style={{padding:"20px 18px"}}>

            {/* Your ID card */}
            <div style={{...glassCard(C.gold+"44",{marginBottom:14,background:"linear-gradient(135deg,rgba(160,114,10,0.05),rgba(160,114,10,0.02))"})}}>
              <div style={{fontSize:19,color:C.gold,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Your Unsmoke ID</div>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{fontSize:34,fontWeight:900,color:C.gold,letterSpacing:"0.15em",fontVariantNumeric:"tabular-nums"}}>{myPublicId||"Loading..."}</div>
                <button onClick={()=>{navigator.clipboard&&navigator.clipboard.writeText(myPublicId).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),2000);}} style={{background:copied?C.emeraldFade:C.goldFade,border:"1px solid "+(copied?C.emerald:C.gold)+"44",borderRadius:20,padding:"6px 14px",color:copied?C.emerald:C.gold,fontSize:19,fontWeight:700,cursor:"pointer"}}>
                  {copied?"Copied!":"Copy ID"}
                </button>
              </div>
              <div style={{fontSize:30,color:C.sub,marginTop:6}}>Share this ID so others can find and add you</div>
            </div>

            {/* Add friend */}
            <div style={{...glassCard(null,{marginBottom:14})}}>
              <div style={{fontSize:19,fontWeight:800,color:C.text,marginBottom:10}}>Add a Friend by ID</div>
              <div style={{display:"flex",gap:8}}>
                <input value={friendInput} onChange={e=>setFriendInput(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&addFriend(friendInput)} placeholder="Enter their ID e.g. A3B7C2" style={{flex:1,minWidth:0,background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:12,padding:"12px 16px",color:C.text,fontSize:19,outline:"none",letterSpacing:"0.1em",fontWeight:700}} maxLength={8}/>
                <button onClick={()=>addFriend(friendInput)} style={{background:"linear-gradient(135deg,"+C.gold+","+C.amber+")",border:"none",borderRadius:12,padding:"10px 18px",color:"#fff",fontWeight:700,fontSize:30,cursor:"pointer",flexShrink:0}}>Add</button>
              </div>
              {friendStatus&&<div style={{fontSize:19,color:friendStatus.includes("not found")||friendStatus.includes("own")?C.ruby:C.emerald,marginTop:8,fontWeight:600}}>{friendStatus}</div>}
            </div>

            {/* Friends list */}
            {friends.length>0&&(
              <div style={{...glassCard(null,{marginBottom:14})}}>
                <div style={{fontSize:30,color:C.sub,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>{friends.length} {friends.length===1?"Friend":"Friends"}</div>
                {friends.map((friend,i)=>(
                  <div key={friend.publicId} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<friends.length-1?"1px solid "+C.border:"none"}}>
                    <div style={{width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,"+C.orchid+"44,"+C.gold+"44)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,fontWeight:900,color:C.orchid,flexShrink:0}}>{(friend.name||"?")[0].toUpperCase()}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:19,color:C.text}}>{friend.name}</div>
                      <div style={{fontSize:30,color:C.sub,marginTop:1}}>ID: {friend.publicId}</div>
                    </div>
                    <button onClick={()=>openPeerChat(friend)} style={{background:C.orchidFade,border:"1px solid "+C.orchid+"44",borderRadius:20,padding:"6px 14px",color:C.orchid,fontSize:19,fontWeight:700,cursor:"pointer"}}>Chat</button>
                  </div>
                ))}
              </div>
            )}

            {/* Community feed */}
            <div style={{fontSize:19,fontWeight:900,color:C.text,marginBottom:4}}>Community Feed</div>
            <div style={{color:C.sub,fontSize:19,marginBottom:12}}>Share your progress. Cheer others on.</div>

            {/* Post box */}
            <div style={{...glassCard(null,{marginBottom:14})}}>
              <textarea value={communityInput} onChange={e=>setCommunityInput(e.target.value)} placeholder={"How are you doing today?"+String.fromCharCode(10)+"Share a win, a struggle, or a milestone."} style={{width:"100%",background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px",color:C.text,fontSize:30,outline:"none",resize:"none",minHeight:72,lineHeight:1.65,boxSizing:"border-box",marginBottom:10}} maxLength={280}/>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["Day "+d+" smoke-free! 🎉","Had a tough craving but resisted 💪","Just reached "+d+"d milestone 🏆"].map(quick=>(
                  <button key={quick} onClick={()=>setCommunityInput(quick)} style={{background:C.goldFade,border:"1px solid "+C.gold+"44",borderRadius:20,padding:"5px 12px",color:C.gold,fontSize:30,cursor:"pointer",fontWeight:600}}>{quick}</button>
                ))}
              </div>
              <button onClick={()=>postToCommunity(communityInput)} disabled={communityPosting||!communityInput.trim()} style={{width:"100%",marginTop:10,background:"linear-gradient(135deg,"+C.gold+","+C.amber+")",border:"none",borderRadius:12,padding:12,color:"#fff",fontWeight:700,fontSize:19,cursor:"pointer",opacity:communityPosting||!communityInput.trim()?0.4:1}}>
                {communityPosting?"Posting...":"Post to Community"}
              </button>
            </div>

            {/* Feed */}
            {communityPosts.length===0&&(
              <div style={{textAlign:"center",padding:"32px 20px",color:C.muted}}>
                <div style={{fontSize:36,marginBottom:10}}>🌱</div>
                <div style={{fontSize:19,fontWeight:700,color:C.text,marginBottom:6}}>Be the first to post</div>
                <div style={{fontSize:19,color:C.sub}}>This community is just getting started. Share your journey.</div>
              </div>
            )}
            {communityPosts.map(post=>(
              <div key={post.id} style={{...glassCard(null,{marginBottom:10})}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:10}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,"+C.gold+"44,"+C.orchid+"44)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,fontWeight:900,color:C.gold,flexShrink:0}}>{(post.name||"?")[0].toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{fontWeight:700,fontSize:30,color:C.text}}>{post.name||"Anonymous"}</div>
                      {post.days>0&&<div style={{background:C.goldFade,border:"1px solid "+C.gold+"44",borderRadius:20,padding:"1px 8px",fontSize:19,color:C.gold,fontWeight:700}}>{post.days}d smoke-free</div>}
                    </div>
                    <div style={{fontSize:30,color:C.muted,marginTop:2}}>{post.ts?new Date(post.ts).toLocaleDateString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):""}</div>
                  </div>
                </div>
                <div style={{fontSize:30,color:C.text,lineHeight:1.7,marginBottom:10}}>{post.text}</div>
                <button onClick={()=>likePost(post.id,post.likes)} style={{background:"transparent",border:"none",color:C.sub,fontSize:30,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                  <span>👏</span><span>{post.likes||0}</span><span style={{fontSize:24}}>Cheer</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {tab==="sos"&&(
          <div style={{padding:"16px 14px"}}>
            <div style={{fontSize:34,fontWeight:800,marginBottom:3}}>Craving Toolkit</div>
            <div style={{color:C.sub,fontSize:30,marginBottom:16}}>Every craving passes in under 5 minutes.</div>
            <div style={crd({marginBottom:10})}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div><div style={{fontWeight:700,fontSize:30,marginBottom:2}}>5-Minute Timer</div><div style={{color:C.sub,fontSize:19}}>Ride it out. It will pass.</div></div>
                {cSec<300&&<div style={{fontSize:34,fontWeight:900,color:C.accent,fontVariantNumeric:"tabular-nums"}}>{pad(Math.floor(cSec/60))}:{pad(cSec%60)}</div>}
              </div>
              {cSec<300&&<div style={{marginTop:10,height:4,background:C.border,borderRadius:4}}><div style={{height:4,background:cSec===0?C.teal:C.accent,borderRadius:4,width:((300-cSec)/300*100)+"%",transition:"width 1s linear"}}/></div>}
              <div style={{marginTop:10,display:"flex",gap:8}}>
                {cSec===0?<Btn ghost onClick={()=>{setCSec(300);setCRun(false);}}>Reset</Btn>:<Btn onClick={()=>setCRun(r=>!r)}>{cRun?"Pause":cSec===300?"Start Timer":"Resume"}</Btn>}
              </div>
            </div>
            <div style={crd({marginBottom:10})}>
              <div style={{fontWeight:700,fontSize:30,marginBottom:2}}>4-7-8 Breathing</div>
              <div style={{color:C.sub,fontSize:19,marginBottom:14}}>Activates your parasympathetic system. Dissolves anxiety.</div>
              {breathOn?(
                <div style={{textAlign:"center",padding:"8px 0"}}>
                  <div style={{width:100,height:100,borderRadius:"50%",margin:"0 auto 14px",background:"radial-gradient(circle,"+curB.color+"20,transparent)",border:"3px solid "+curB.color,display:"flex",alignItems:"center",justifyContent:"center",transition:bPhase==="inhale"?"transform 4s ease-in-out":"none",transform:bPhase==="exhale"?"scale(0.82)":"scale(1.28)"}}>
                    <span style={{color:curB.color,fontSize:30,fontWeight:700}}>{curB.label}</span>
                  </div>
                  <div style={{color:C.sub,fontSize:24}}>4s inhale - 7s hold - 8s exhale</div>
                  <button onClick={()=>{setBreathOn(false);setBStep(0);setBPhase("inhale");}} style={{background:"transparent",color:C.accent,border:"1.5px solid "+C.accent,borderRadius:11,padding:"9px 22px",fontWeight:600,fontSize:30,cursor:"pointer",marginTop:12}}>Stop</button>
                </div>
              ):(
                <Btn onClick={()=>{setBreathOn(true);setBStep(0);}}>Begin Breathing</Btn>
              )}
            </div>
            <div style={crd()}>
              <div style={{fontWeight:700,fontSize:30,marginBottom:2}}>Flip the Script</div>
              <div style={{color:C.sub,fontSize:19,marginBottom:12}}>CBT in 10 seconds. Tap what you are thinking right now.</div>
              {REFRAMES.map((r,i)=>(
                <div key={i} onClick={()=>setRfOpen(rfOpen===i?null:i)} style={{background:rfOpen===i?C.accentFade:C.surfaceHi,border:"1px solid "+(rfOpen===i?C.accent+"55":C.border),borderRadius:10,padding:"11px 13px",cursor:"pointer",marginBottom:8}}>
                  <div style={{fontWeight:600,fontSize:30,color:rfOpen===i?C.text:C.sub}}>{r.trigger}</div>
                  {rfOpen===i&&<div style={{marginTop:7,color:C.teal,fontSize:30,lineHeight:1.6}}>{r.reframe}</div>}
                </div>
              ))}
            </div>
          </div>
        )}


        {tab==="wellness"&&(
          <div style={{padding:"20px 18px"}}>
            <div style={{fontSize:32,fontWeight:900,marginBottom:4,letterSpacing:"-0.02em",color:C.text}}>Wellness</div>
            <div style={{color:C.sub,fontSize:30,marginBottom:16}}>Exercise and food — your daily quit toolkit.</div>

            {/* Exercise section */}
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {["today","week"].map(t=>(
                <button key={t} onClick={()=>setExTab(t)} style={{flex:1,padding:"9px",borderRadius:12,border:"1px solid "+(exTab===t?C.gold+"55":C.border),background:exTab===t?C.goldFade:"transparent",color:exTab===t?C.gold:C.sub,fontWeight:700,fontSize:19,cursor:"pointer",textTransform:"capitalize"}}>{t==="today"?"Today Workout":"Weekly Plan"}</button>
              ))}
            </div>

            {exTab==="today"&&(
              <div style={{...glassCard(null,{marginBottom:14})}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <div>
                    <div style={{fontSize:19,color:C.emerald,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>{todayExercise.day} — {todayExercise.duration}</div>
                    <div style={{fontWeight:900,fontSize:34,color:C.text,letterSpacing:"-0.01em"}}>{todayExercise.theme}</div>
                  </div>
                  {exDone.length===todayExercise.moves.length&&<span style={{fontSize:22}}>🏆</span>}
                </div>
                {todayExercise.moves.map((move,i)=>(
                  <div key={i} onClick={()=>setExDone(d=>d.includes(i)?d.filter(x=>x!==i):[...d,i])} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 0",borderBottom:i<todayExercise.moves.length-1?"1px solid "+C.border:"none",cursor:"pointer"}}>
                    <div style={{width:26,height:26,borderRadius:"50%",background:exDone.includes(i)?"linear-gradient(135deg,"+C.gold+","+C.amber+")":C.surfaceHi,border:"1.5px solid "+(exDone.includes(i)?C.gold:C.border),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:30,fontWeight:900,color:exDone.includes(i)?"#fff":C.muted,marginTop:2}}>{exDone.includes(i)?"✓":i+1}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:19,color:C.text,marginBottom:2,textDecoration:exDone.includes(i)?"line-through":"none",opacity:exDone.includes(i)?0.5:1}}>{move.name}</div>
                      <div style={{fontSize:30,color:C.gold,fontWeight:600,marginBottom:3}}>{move.reps}</div>
                      <div style={{fontSize:30,color:C.sub,lineHeight:1.5}}>{move.why}</div>
                    </div>
                  </div>
                ))}
                <div style={{marginTop:14,padding:"12px 16px",background:C.emeraldFade,borderRadius:12,border:"1px solid "+C.emerald+"33",fontSize:19,color:C.emerald,fontWeight:600}}>
                  Tip: Any craving that hits during exercise — do 10 more jumping jacks. By the time you finish, it will have passed.
                </div>
              </div>
            )}

            {exTab==="week"&&(
              <div>
                {EXERCISES.map((day,i)=>(
                  <div key={i} style={{...glassCard(null,{marginBottom:10,borderColor:i===new Date().getDay()-1?C.gold+"44":C.border,background:i===new Date().getDay()-1?C.goldFade:"linear-gradient(135deg,"+C.surfaceHi+","+C.surface+")"})}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:30,color:C.sub,marginBottom:2}}>{day.day}</div>
                        <div style={{fontWeight:800,fontSize:19,color:C.text}}>{day.theme}</div>
                      </div>
                      <div style={{fontSize:30,color:C.gold,background:C.goldFade,padding:"4px 10px",borderRadius:20,fontWeight:700}}>{day.duration}</div>
                    </div>
                    <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:5}}>
                      {day.moves.slice(0,3).map((m,j)=>(
                        <span key={j} style={{fontSize:30,color:C.sub,background:C.surfaceHi,padding:"2px 8px",borderRadius:20,border:"1px solid "+C.border}}>{m.name}</span>
                      ))}
                      {day.moves.length>3&&<span style={{fontSize:30,color:C.muted}}>+{day.moves.length-3} more</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Diet section */}
            <div style={{fontSize:30,fontWeight:800,color:C.text,marginBottom:4,marginTop:8}}>Eat This When Craving Hits</div>
            <div style={{color:C.sub,fontSize:19,marginBottom:12}}>These foods actively disrupt craving signals.</div>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {["veg","nonveg"].map(t=>(
                <button key={t} onClick={()=>setDietTab(t)} style={{flex:1,padding:"9px",borderRadius:12,border:"1px solid "+(dietTab===t?C.emerald+"55":C.border),background:dietTab===t?C.emeraldFade:"transparent",color:dietTab===t?C.emerald:C.sub,fontWeight:700,fontSize:19,cursor:"pointer"}}>{t==="veg"?"🥦 Vegetarian":"🍗 Non-Veg"}</button>
              ))}
            </div>
            {(dietTab==="veg"?VEG_FOODS:NONVEG_FOODS).map((food,i)=>(
              <div key={i} style={{...glassCard(null,{marginBottom:10,padding:"14px"})}}>
                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{fontSize:34,flexShrink:0,marginTop:2}}>{food.emoji}</div>
                  <div>
                    <div style={{fontWeight:800,fontSize:19,color:C.text,marginBottom:5}}>{food.name}</div>
                    <div style={{fontSize:19,color:C.sub,lineHeight:1.65}}>{food.reason}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==="journey"&&(
          <div style={{padding:"16px 14px"}}>
            <div style={{fontSize:34,fontWeight:800,marginBottom:3}}>Your Journey</div>
            <div style={{color:C.sub,fontSize:30,marginBottom:14}}>Every smoke-free day, tracked.</div>
            <div style={{position:"relative"}}>
              <div style={{position:"absolute",left:19,top:0,bottom:0,width:2,background:C.border,zIndex:0}}/>
              {MILESTONES.map((ms,i)=>{
                const isDone=elMin>=ms.min,isNext=nextMS===ms;
                return (
                  <div key={i} style={{display:"flex",gap:12,marginBottom:12,position:"relative"}}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:isDone?C.teal:C.surface,border:"2px solid "+(isDone?C.teal:C.border),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,zIndex:1,fontSize:30,color:isDone?"#F5F0E8":"inherit",fontWeight:900}}>{isDone?"v":"o"}</div>
                    <div style={crd({flex:1,padding:"11px 13px",borderColor:isNext?C.teal+"55":isDone?C.teal+"22":C.border,background:isNext?"rgba(0,217,170,0.05)":C.surface})}>
                      <div style={{fontWeight:700,fontSize:30,color:isDone?C.text:C.sub}}>{ms.label}</div>
                      <div style={{color:C.muted,fontSize:30,marginTop:2}}>{msLabel(ms.min)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab==="mindset"&&(
          <div style={{padding:"16px 14px"}}>
            <div style={{fontSize:34,fontWeight:800,marginBottom:3}}>Mindset</div>
            <div style={{color:C.sub,fontSize:30,marginBottom:14}}>CBT lessons and daily mood.</div>
            <div style={crd({marginBottom:12})}>
              <div style={{fontSize:19,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>How are you feeling today?</div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                {MOODS.map(mo=>(
                  <button key={mo.v} onClick={()=>setMood(mo.v)} style={{flex:1,padding:"10px 4px",background:todayMood===mo.v?C.tealFade:"transparent",border:"1px solid "+(todayMood===mo.v?C.teal:C.border),borderRadius:10,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <span style={{fontSize:22}}>{mo.e}</span><span style={{fontSize:19,color:todayMood===mo.v?C.teal:C.muted,fontWeight:700}}>{mo.l}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={crd({marginBottom:12,background:C.purpleFade,borderColor:C.purple+"33"})}>
              <div style={{fontSize:30,color:C.purple,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>Today mindset</div>
              <div style={{color:C.text,fontSize:30,lineHeight:1.7,fontStyle:"italic"}}>{quote}</div>
            </div>
            <div style={{fontSize:30,color:C.sub,marginBottom:6}}>{read.length}/{LESSONS.length} lessons read</div>
            <div style={{height:3,background:C.border,borderRadius:4,marginBottom:12}}><div style={{height:3,background:C.purple,borderRadius:4,width:(read.length/LESSONS.length*100)+"%"}}/></div>
            {LESSONS.map((l,i)=>{
              const isRead=read.includes(i),isOpen=lsnOpen===i;
              return (
                <div key={i} onClick={()=>{setLsnOpen(isOpen?null:i);markRead(i);}} style={crd({cursor:"pointer",marginBottom:10,borderColor:isOpen?l.color+"55":C.border})}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                        <span style={{fontSize:19,fontWeight:800,letterSpacing:"0.08em",color:l.color,background:l.color+"22",padding:"2px 8px",borderRadius:20}}>{l.tag}</span>
                        {isRead&&<span style={{fontSize:19,color:C.teal,fontWeight:700}}>READ</span>}
                      </div>
                      <div style={{fontWeight:700,fontSize:19}}>{l.title}</div>
                    </div>
                    <div style={{color:C.muted,fontSize:34,marginLeft:8}}>{isOpen?"-":"+"}</div>
                  </div>
                  {isOpen&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px solid "+C.border}}>
                    <div style={{color:C.sub,fontSize:30,lineHeight:1.75}}>{l.body}</div>
                    <div style={{marginTop:12,padding:"11px 13px",background:l.color+"14",borderRadius:10,borderLeft:"3px solid "+l.color}}>
                      <div style={{fontSize:30,color:l.color,fontWeight:800,textTransform:"uppercase",marginBottom:4}}>Key Insight</div>
                      <div style={{fontSize:30,color:C.text,fontWeight:600}}>{l.key}</div>
                    </div>
                  </div>}
                </div>
              );
            })}
          </div>
        )}

        {tab==="log"&&(
          <div style={{padding:"16px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:34,fontWeight:800}}>Insights</div>
              <button onClick={()=>setShowForm(f=>!f)} style={{background:"transparent",color:C.accent,border:"1.5px solid "+C.accent,borderRadius:11,padding:"7px 13px",fontWeight:600,fontSize:19,cursor:"pointer"}}>{showForm?"Cancel":"+ Log craving"}</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div style={crd({textAlign:"center"})}><div style={{fontSize:34,fontWeight:900,color:C.teal}}>{entries.length>0?Math.round(resRate*100):"-"}%</div><div style={{color:C.sub,fontSize:30,marginTop:2}}>cravings resisted</div></div>
              <div style={crd({textAlign:"center"})}><div style={{fontSize:34,fontWeight:900,color:C.purple}}>{streak}</div><div style={{color:C.sub,fontSize:30,marginTop:2}}>day streak</div></div>
            </div>
            {showForm&&(
              <div style={crd({marginBottom:12})}>
                <div style={{fontWeight:700,fontSize:19,marginBottom:12}}>What triggered this craving?</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
                  {TRIGGERS.map(t=><button key={t} onClick={()=>setLTags(tags=>tags.includes(t)?tags.filter(x=>x!==t):[...tags,t])} style={{padding:"5px 12px",borderRadius:20,border:"1px solid "+(lTags.includes(t)?C.accent:C.border),background:lTags.includes(t)?C.accentFade:"transparent",color:lTags.includes(t)?C.accent:C.sub,cursor:"pointer",fontSize:19}}>{t}</button>)}
                </div>
                <div style={{fontSize:30,color:C.sub,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>Intensity: {lInt}/10</div>
                <input type="range" min="1" max="10" value={lInt} onChange={e=>setLInt(+e.target.value)} style={{width:"100%",marginBottom:12,accentColor:C.accent}}/>
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  <button onClick={()=>setLRes(true)} style={{flex:1,padding:10,borderRadius:9,border:"1px solid "+(lRes?C.teal:C.border),background:lRes?C.tealFade:"transparent",color:lRes?C.teal:C.sub,cursor:"pointer",fontWeight:700,fontSize:19}}>Resisted</button>
                  <button onClick={()=>setLRes(false)} style={{flex:1,padding:10,borderRadius:9,border:"1px solid "+(!lRes?C.accent:C.border),background:!lRes?C.accentFade:"transparent",color:!lRes?C.accent:C.sub,cursor:"pointer",fontWeight:700,fontSize:19}}>Gave in</button>
                </div>
                <textarea placeholder="Notes (optional)" value={lNote} onChange={e=>setLNote(e.target.value)} style={{background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:9,padding:"11px 13px",color:C.text,fontSize:30,width:"100%",boxSizing:"border-box",outline:"none",minHeight:50,resize:"vertical",marginBottom:10}}/>
                <Btn onClick={saveEntry} disabled={lTags.length===0}>Save Entry</Btn>
              </div>
            )}
            {entries.length===0&&!showForm&&<div style={{textAlign:"center",padding:"32px 20px",color:C.muted}}><div style={{fontSize:32,marginBottom:8}}>📊</div><div style={{fontSize:24}}>No craving logs yet. Tap + Log craving when one hits.</div></div>}
            {entries.map(e=>(
              <div key={e.id} style={crd({marginBottom:8})}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,flex:1}}>{e.tags.map(t=><span key={t} style={{fontSize:30,padding:"2px 9px",borderRadius:20,background:C.surfaceHi,color:C.sub}}>{t}</span>)}</div>
                  <span style={{fontSize:30,fontWeight:800,color:e.resisted?C.teal:C.accent,marginLeft:8}}>{e.resisted?"Resisted":"Gave in"}</span>
                </div>
                <span style={{fontSize:30,color:C.sub}}>Intensity: {e.intensity}/10</span>
              </div>
            ))}
          </div>
        )}

}

      </div>

      {/* Tab bar */}
      <div style={{display:"flex",borderTop:"1px solid "+C.border,background:C.surface,flexShrink:0,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setBreathOn(false);}} style={{flex:1,padding:"10px 4px 14px",border:"none",background:"transparent",color:tab===t.id?C.gold:C.sub,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,fontWeight:700}}>
            <div style={{position:"relative",display:"inline-block"}}>
              <span style={{fontSize:24}}>{t.icon}</span>
              {t.id==="messages"&&msgUnread>0&&<div style={{position:"absolute",top:-3,right:-4,width:7,height:7,borderRadius:"50%",background:C.ruby}}/>}
            </div>
            <span style={{fontSize:30,letterSpacing:"0.02em",textTransform:"uppercase",marginTop:1}}>{t.label}</span>
          </button>
        ))}
      </div>

      {showPremium&&(
        <div style={{position:"fixed",inset:0,zIndex:998,background:"#F5F0E8",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{paddingTop:"max(48px, env(safe-area-inset-top, 48px))",paddingBottom:14,paddingLeft:16,paddingRight:16,borderBottom:"1px solid #E8DDD0",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div><div style={{fontWeight:900,fontSize:19,color:"#FFD700"}}>👑 Unsmoke Premium</div><div style={{fontSize:30,color:"#786858",marginTop:1}}>Rs 299/month</div></div>
            <button onClick={()=>setShowPremium(false)} style={{background:"#FAF7F2",border:"1px solid #E8DDD0",borderRadius:20,padding:"6px 14px",color:"#786858",fontSize:19,fontWeight:700,cursor:"pointer"}}>Close</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"20px 16px"}}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:40,marginBottom:8}}>👑</div>
              <div style={{fontSize:30,fontWeight:900,color:"#FFD700",marginBottom:4}}>Unlock everything.</div>
              <div style={{fontSize:30,color:"#786858",lineHeight:1.6}}>Features no other quit-smoking app offers.</div>
            </div>
            <a href="tel:+918950695379" style={{display:"flex",alignItems:"center",gap:14,background:"#FFFFFF",border:"1px solid #E8DDD0",borderRadius:16,padding:"16px",marginBottom:14,textDecoration:"none",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              <div style={{width:46,height:46,borderRadius:"50%",background:"linear-gradient(135deg,#A0720A,#B87000)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,flexShrink:0}}>📞</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:900,fontSize:30,color:"#1A1208",marginBottom:2}}>Call Saksham</div>
                <div style={{fontSize:19,color:"#786858"}}>+91 89506 95379 — Tap to call</div>
              </div>
              <span style={{color:"#A0720A",fontSize:24}}>›</span>
            </a>
            <div style={{fontSize:30,color:"#00D9AA",fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10,marginTop:6}}>Chat</div>
            {[{icon:"🤖",color:"#00D9AA",title:"AI Quit Coach",desc:"24/7 chat that knows your journey. "+d+" days, score "+healthScore+".",screen:"coach"},{icon:"S",color:"#C9A84C",title:"Chat with Saksham",desc:"Message the founder directly. He reads and responds personally.",screen:"saksham"},{icon:"💊",color:"#FFB800",title:"NRT Step-Down Calculator",desc:"Personalized nicotine patch plan based on Saksham own protocol.",screen:"nrt"}].map(({icon,color,title,desc,screen})=>(
              <div key={title} onClick={()=>{if(isPremium){setShowPremium(false);setPremiumScreen(screen);}}} style={{background:"#FFFFFF",border:"1px solid #E8DDD0",borderRadius:14,padding:"16px 14px",marginBottom:10,cursor:isPremium?"pointer":"default"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:44,height:44,borderRadius:12,background:color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,flexShrink:0}}>{icon}</div>
                  <div style={{flex:1}}><div style={{fontWeight:800,fontSize:19,color:"#1A1208"}}>{title}</div><div style={{color:"#786858",fontSize:19,marginTop:2}}>{desc}</div></div>
                  {isPremium&&<span style={{color,fontSize:22}}>go</span>}
                </div>
              </div>
            ))}
            <div style={{fontSize:30,color:"#C8B8A8",fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10,marginTop:6}}>Coming soon</div>
            {[{icon:"🔮",title:"Craving Prediction Engine",desc:"AI warns you 30 min before your next high-risk window."},{icon:"🤝",title:"Accountability Partner",desc:"Get paired with a quitter at your exact day count."},{icon:"📜",title:"Milestone Certificates",desc:"Download real smoke-free certificates at 1 week, 1 month, 1 year."},{icon:"🧬",title:"Personalized DNA Recovery",desc:"Maps exactly what your body is repairing, based on how long you smoked."}].map(({icon,title,desc})=>(
              <div key={title} style={{background:"#FFFFFF",border:"1px solid #E8DDD0",borderRadius:14,padding:"14px",marginBottom:8,opacity:0.6,display:"flex",gap:12,alignItems:"flex-start"}}>
                <span style={{fontSize:30,flexShrink:0}}>{icon}</span>
                <div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}><div style={{fontWeight:700,fontSize:30,color:"#1A1208"}}>{title}</div><span style={{fontSize:19,color:"#C8B8A8",background:"#FAF7F2",padding:"2px 7px",borderRadius:20}}>SOON</span></div><div style={{color:"#786858",fontSize:19}}>{desc}</div></div>
              </div>
            ))}
            <div style={{marginTop:12,marginBottom:20}}>
              {!isPremium?(
                <div>
                  <div style={{background:"rgba(255,184,0,0.1)",border:"1px solid rgba(255,215,0,0.3)",borderRadius:14,padding:"20px 16px",marginBottom:12,textAlign:"center"}}>
                    <div style={{fontSize:34,fontWeight:900,color:"#FFD700",marginBottom:4}}>Rs 299<span style={{fontSize:19,fontWeight:400,color:"#786858"}}>/month</span></div>
                    <div style={{fontSize:19,color:"#786858"}}>or Rs 1,999/year — save 44%</div>
                  </div>
                  <button onClick={unlockPremium} style={{background:"linear-gradient(135deg,#FFD700,#FFB800)",color:"#F5F0E8",border:"none",borderRadius:12,padding:14,fontWeight:900,fontSize:30,cursor:"pointer",width:"100%",marginBottom:8}}>👑 Unlock Premium</button>
                  <div style={{textAlign:"center",fontSize:30,color:"#C8B8A8"}}>Demo mode: tap to unlock all features</div>
                </div>
              ):(
                <div style={{background:"rgba(0,217,170,0.1)",border:"1px solid rgba(0,217,170,0.3)",borderRadius:14,padding:16,textAlign:"center"}}>
                  <div style={{fontWeight:800,color:"#00D9AA",fontSize:19}}>Premium active — tap any feature above</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
