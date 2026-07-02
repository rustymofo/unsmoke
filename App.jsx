import { useState, useEffect, useRef } from "react";

const C = {
  bg:"#07080F", surface:"#0D1018", surfaceHi:"#131825",
  border:"#1A2035", gold:"#C9A84C", goldHi:"#E8C96A",
  goldFade:"rgba(201,168,76,0.10)",
  emerald:"#10C9A0", emeraldFade:"rgba(16,201,160,0.08)",
  ruby:"#E85D75", rubyFade:"rgba(232,93,117,0.08)",
  orchid:"#9B72CF", orchidFade:"rgba(155,114,207,0.08)",
  amber:"#E8A020", amberFade:"rgba(232,160,32,0.08)",
  text:"#EDF1FF", sub:"#68788A", muted:"#1E2840",
  accent:"#C9A84C", accentFade:"rgba(201,168,76,0.10)",
  teal:"#10C9A0", tealFade:"rgba(16,201,160,0.08)",
  purple:"#9B72CF", purpleFade:"rgba(155,114,207,0.08)",
};

const pad = n => String(n).padStart(2,"0");
function parseDur(ms){const s=Math.floor(ms/1000);return{d:Math.floor(s/86400),h:Math.floor((s%86400)/3600),m:Math.floor((s%3600)/60),s:s%60};}
function msLabel(min){if(min<60)return Math.ceil(min)+"m";if(min<1440)return Math.ceil(min/60)+"h";if(min<43800)return Math.ceil(min/1440)+"d";if(min<525600)return Math.round(min/43800)+" months";return Math.round(min/525600)+" years";}
function dateKey(ts){const d=new Date(ts);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());}
function todayKey(){return dateKey(Date.now());}
function genId(len=8){return Math.random().toString(36).substr(2,len).toUpperCase();}

// Session (browser local - just login token)
const session={
  async get(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch{return null;}},
  async set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}},
  async del(k){try{localStorage.removeItem(k);}catch{}},
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
    <button onClick={onClick} disabled={disabled} style={{background:ghost?"transparent":C.accent,color:ghost?C.accent:"#fff",border:ghost?"1.5px solid "+C.accent:"none",borderRadius:11,padding:"13px 18px",fontWeight:700,fontSize:14,cursor:disabled?"not-allowed":"pointer",width:"100%",opacity:disabled?0.5:1,...style}}>
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
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,system:systemPrompt,messages:updated})});
      const data=await res.json();
      setMessages(m=>[...m,{role:"assistant",content:(data.content&&data.content[0]&&data.content[0].text)||"I am here. Keep going."}]);
    }catch{setMessages(m=>[...m,{role:"assistant",content:"Something went wrong. But you are still here, still quit. That counts."}]);}
    setLoading(false);
  }
  return (
    <div style={{position:"absolute",inset:0,zIndex:999,background:"#07081A",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"14px 16px",borderBottom:"1px solid #1C2040",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#FF6534,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{avatar}</div>
        <div style={{flex:1}}><div style={{fontWeight:800,fontSize:15,color:"#F0EDF8"}}>{name}</div><div style={{fontSize:11,color:"#00D9AA",marginTop:1}}>{subtitle}</div></div>
        <button onClick={onClose} style={{background:"#141730",border:"1px solid #1C2040",borderRadius:20,padding:"6px 14px",color:"#8090B0",fontSize:12,fontWeight:700,cursor:"pointer"}}>Close</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:16}}>
        {messages.map((msg,i)=>(
          <div key={i} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start",marginBottom:12}}>
            {msg.role==="assistant"&&<div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#FF6534,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,marginRight:8,flexShrink:0,alignSelf:"flex-end"}}>{avatar}</div>}
            <div style={{maxWidth:"78%",padding:"11px 14px",borderRadius:msg.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:msg.role==="user"?"#FF6534":"#0E1128",color:"#F0EDF8",fontSize:13,lineHeight:1.65,border:msg.role==="user"?"none":"1px solid #1C2040"}}>{msg.content}</div>
          </div>
        ))}
        {loading&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#FF6534,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>🤖</div>
          <div style={{padding:"11px 14px",borderRadius:"14px 14px 14px 4px",background:"#0E1128",border:"1px solid #1C2040"}}>
            <div style={{display:"flex",gap:4}}>
              {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#8090B0",animation:"bounce 1s "+i*0.2+"s infinite"}}/>)}
            </div>
          </div>
        </div>}
        <div ref={endRef}/>
      </div>
      <div style={{padding:"12px 16px",borderTop:"1px solid #1C2040",display:"flex",gap:8,flexShrink:0}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Type a message..." style={{flex:1,background:"#141730",border:"1px solid #1C2040",borderRadius:22,padding:"11px 16px",color:"#F0EDF8",fontSize:14,outline:"none"}}/>
        <button onClick={send} disabled={loading||!input.trim()} style={{background:"#FF6534",border:"none",borderRadius:"50%",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",opacity:loading||!input.trim()?0.5:1,flexShrink:0,color:"#fff",fontSize:18}}>up</button>
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
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:120,system:systemPrompt+" VOICE CALL: Max 1-2 short sentences. Sound human and natural. "+(lang==="hi-IN"?"Reply in Hinglish.":"Indian English."),messages:[...histRef.current,{role:"user",content:userText}]})});
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
    <div style={{position:"absolute",inset:0,zIndex:1002,background:"#030408",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{width:"100%",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",gap:6}}>
          {[["en-IN","EN-IN"],["hi-IN","हिंदी"]].map(([l,label])=>(
            <button key={l} onClick={()=>setLang(l)} style={{background:lang===l?"rgba(0,217,170,0.15)":"transparent",border:"1px solid "+(lang===l?"#00D9AA":"#8090B0"),borderRadius:20,padding:"4px 10px",color:lang===l?"#00D9AA":"#8090B0",fontSize:10,fontWeight:700,cursor:"pointer"}}>{label}</button>
          ))}
        </div>
        <div style={{fontSize:12,color:"#8090B0",fontVariantNumeric:"tabular-nums"}}>{pad2(mins)}:{pad2(secs)}</div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,width:"100%"}}>
        <div style={{position:"relative",width:140,height:140,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {pulsing&&[1,2,3].map(i=>(
            <div key={i} style={{position:"absolute",width:140+i*36,height:140+i*36,borderRadius:"50%",border:"2px solid #00D9AA",opacity:0.3/i,animation:"callpulse "+(1+i*0.3)+"s ease-out "+(i*0.2)+"s infinite"}}/>
          ))}
          <div style={{width:140,height:140,borderRadius:"50%",background:"linear-gradient(135deg,#FF6534,#8B5CF6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:56,zIndex:1}}>{avatar}</div>
        </div>
        <div style={{textAlign:"center"}}>
          <div style={{fontWeight:900,fontSize:22,color:"#F0EDF8",marginBottom:4}}>{person==="saksham"?"Saksham":"AI Coach"}</div>
          <div style={{fontSize:13,fontWeight:600,color:ended?"#8090B0":callState==="connecting"?"#FFB800":aiState==="listening"?"#FF6534":aiState==="thinking"?"#FFB800":aiState==="speaking"?"#00D9AA":"rgba(0,217,170,0.4)"}}>
            {ended?"Call ended":callState==="connecting"?"Connecting...":aiState==="listening"?"Listening...":aiState==="thinking"?"Thinking...":aiState==="speaking"?"Speaking...":"Ready"}
          </div>
        </div>
        {transcript.length>0&&(
          <div style={{width:"100%",maxWidth:320,maxHeight:100,overflowY:"auto",padding:"0 20px"}}>
            {transcript.slice(-2).map((msg,i)=>(
              <div key={i} style={{marginBottom:6,textAlign:msg.role==="user"?"right":"left"}}>
                <span style={{display:"inline-block",background:msg.role==="user"?"#FF6534":"#0E1128",border:msg.role==="assistant"?"1px solid #1C2040":"none",borderRadius:10,padding:"6px 12px",fontSize:12,color:"#F0EDF8",maxWidth:"85%",lineHeight:1.4}}>{msg.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{width:"100%",padding:"0 24px 40px"}}>
        {ended?(
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:13,color:"#8090B0",marginBottom:16}}>{pad2(mins)}:{pad2(secs)} - {transcript.filter(t=>t.role==="user").length} exchanges</div>
            <button onClick={onClose} style={{background:"#FF6534",border:"none",borderRadius:12,padding:"14px 40px",color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer"}}>Done</button>
          </div>
        ):(
          <>
            {!useText?(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
                {speechOK?(
                  <button onMouseDown={startRec} onTouchStart={startRec} onMouseUp={stopRec} onTouchEnd={stopRec}
                    disabled={aiState==="speaking"||aiState==="thinking"||callState==="connecting"}
                    style={{width:72,height:72,borderRadius:"50%",background:isRecording?"#FF6534":"rgba(255,101,52,0.2)",border:"2px solid "+(isRecording?"#FF6534":"#8090B0"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,cursor:"pointer",opacity:aiState==="speaking"||aiState==="thinking"?0.4:1}}>
                    🎤
                  </button>
                ):(
                  <button onClick={()=>setUseText(true)} style={{background:"rgba(0,217,170,0.15)",border:"1px solid #00D9AA",borderRadius:12,padding:"12px 24px",color:"#00D9AA",fontWeight:700,fontSize:13,cursor:"pointer"}}>Use text input</button>
                )}
                <div style={{fontSize:11,color:"#363D5C"}}>{isRecording?"Release to send":"Hold mic to speak"}</div>
                <button onClick={()=>setUseText(true)} style={{background:"none",border:"none",color:"#363D5C",fontSize:11,cursor:"pointer",textDecoration:"underline"}}>Type instead</button>
              </div>
            ):(
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <input value={inputText} onChange={e=>setInputText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendText()} placeholder="Type your message..." disabled={aiState==="speaking"||aiState==="thinking"} style={{flex:1,background:"#141730",border:"1px solid #1C2040",borderRadius:22,padding:"11px 16px",color:"#F0EDF8",fontSize:13,outline:"none"}}/>
                  <button onClick={sendText} disabled={!inputText.trim()||aiState==="speaking"||aiState==="thinking"} style={{background:"#FF6534",border:"none",borderRadius:"50%",width:44,height:44,color:"#fff",fontSize:18,cursor:"pointer",flexShrink:0,opacity:!inputText.trim()?0.5:1}}>up</button>
                </div>
                {speechOK&&<button onClick={()=>setUseText(false)} style={{background:"none",border:"none",color:"#363D5C",fontSize:11,cursor:"pointer",textDecoration:"underline"}}>Use voice instead</button>}
              </div>
            )}
            <button onClick={endCall} style={{width:"100%",background:"#FF3B30",border:"none",borderRadius:12,padding:14,color:"#fff",fontWeight:700,fontSize:15,cursor:"pointer",marginTop:8}}>End Call</button>
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
          <div style={{fontSize:26,fontWeight:900,color,lineHeight:1}}>{score}</div>
          <div style={{fontSize:9,color:C.sub,marginTop:1}}>/ 100</div>
        </div>
      </div>
      <div style={{fontSize:11,fontWeight:700,color,letterSpacing:"0.06em",textTransform:"uppercase"}}>{label}</div>
      <div style={{fontSize:10,color:C.sub}}>Recovery score</div>
    </div>
  );
}

export default function App(){
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
  const [myStreaks,setMyStreaks]=useState([]);
  const [showPremium,setShowPremium]=useState(false);
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
  const [copied,setCopied]=useState(false);
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

  const FOUNDER_QUIT_TS=new Date("2024-10-31T00:00:00").getTime();
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
  const founderDays=Math.floor((now-FOUNDER_QUIT_TS)/86400000);

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
    const entered=authOtpInput.join("");
    if(entered!==authOtpCode){setAuthError("Wrong code. Check and try again.");return;}
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
      setAuthStep("done");setReady(true);setAuthLoading(false);
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
    if(!authName.trim()){setAuthError("Please enter your name.");return;}
    setAuthLoading(true);
    const uid=genId(8);
    const sessionData={userId:uid,phone:authPhone,name:authName.trim(),loggedIn:true};
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
    const e={id:Date.now(),ts:Date.now(),tags:lTags,intensity:lInt,resisted:lRes,note:lNote};
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
  const wrap={fontFamily:"-apple-system,BlinkMacSystemFont,sans-serif",background:C.bg,color:C.text,height:"100dvh",display:"flex",flexDirection:"column",overflow:"hidden",maxWidth:480,margin:"0 auto",width:"100%"};
  const inputStyle={background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:9,padding:"12px 13px",color:C.text,fontSize:14,width:"100%",boxSizing:"border-box",outline:"none"};
  const lblStyle={color:C.sub,fontSize:10,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:5,display:"block"};
  const curB=PHASES.find(p=>p.phase===bPhase)||PHASES[0];

  if(!ready||authStep===null){
    return (
      <div style={Object.assign({},wrap,{alignItems:"center",justifyContent:"center",gap:12})}>
        <div style={{fontSize:36}}>🚭</div>
        <div style={{color:C.sub,fontSize:13}}>Loading...</div>
      </div>
    );
  }

  // AUTH SCREENS
  if(authStep&&authStep!=="done"){
    const authWrap=Object.assign({},wrap,{alignItems:"center",justifyContent:"center",overflowY:"auto"});
    const field={background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:11,padding:"13px 15px",color:C.text,fontSize:15,width:"100%",boxSizing:"border-box",outline:"none"};
    const brandHeader=(
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontSize:44,marginBottom:8}}>🚭</div>
        <div style={{fontSize:26,fontWeight:900,background:"linear-gradient(135deg,"+C.accent+","+C.teal+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Unsmoke</div>
        <div style={{color:C.muted,fontSize:12,marginTop:3}}>with Saksham</div>
      </div>
    );

    if(authStep==="welcome"){
      return (
        <div style={authWrap}>
          <div style={{width:"100%",maxWidth:420,padding:"28px 22px"}}>
            {brandHeader}
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{fontSize:18,fontWeight:800,marginBottom:8}}>Start your smoke-free journey</div>
              <div style={{color:C.sub,fontSize:13,lineHeight:1.7}}>Join thousands quitting with Saksham proven method. Track every second. Every rupee saved. Every milestone earned.</div>
            </div>
            <button onClick={()=>{setIsSignIn(false);setAuthStep("phone");}} style={{width:"100%",background:"linear-gradient(135deg,"+C.gold+","+C.amber+")",border:"none",borderRadius:13,padding:15,color:"#07080F",fontWeight:800,fontSize:16,cursor:"pointer",marginBottom:10,marginTop:12,boxShadow:"0 4px 20px rgba(201,168,76,0.25)"}}>
              Create Account
            </button>
            <button onClick={()=>{setIsSignIn(true);setAuthStep("phone");}} style={{width:"100%",background:"transparent",border:"1.5px solid "+C.gold+"55",borderRadius:13,padding:14,color:C.gold,fontWeight:700,fontSize:15,cursor:"pointer",marginBottom:14}}>
              Sign In — I have an account
            </button>
            <div style={{textAlign:"center",fontSize:11,color:C.muted}}>By continuing you agree to our Terms. We never share your data.</div>
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
              <div style={{fontSize:20,fontWeight:800,marginBottom:5}}>{isSignIn?"Welcome back":"Enter your number"}</div>
              <div style={{color:C.sub,fontSize:13}}>{isSignIn?"Enter your registered number to sign in.":"We will send a one-time code to verify."}</div>
              <div style={{color:C.sub,fontSize:13}}>We will send a one-time code to verify.</div>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              <div style={{background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:11,padding:"13px 14px",fontSize:15,fontWeight:700,color:C.sub,flexShrink:0}}>
                🇮🇳 +91
              </div>
              <input type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit number"
                value={authPhone} onChange={e=>setAuthPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
                onKeyDown={e=>e.key==="Enter"&&sendOTP()} style={Object.assign({},field,{flex:1})} autoFocus/>
            </div>
            {authError&&<div style={{color:C.accent,fontSize:12,marginBottom:10,fontWeight:600}}>{authError}</div>}
            <button onClick={sendOTP} disabled={authPhone.length<10} style={{width:"100%",background:C.accent,border:"none",borderRadius:13,padding:14,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",marginBottom:12,opacity:authPhone.length<10?0.5:1}}>
              Send OTP
            </button>
            <button onClick={()=>setAuthStep("welcome")} style={{background:"none",border:"none",color:C.muted,fontSize:13,cursor:"pointer",width:"100%"}}>Back</button>
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
              <div style={{fontSize:20,fontWeight:800,marginBottom:5}}>Verify your number</div>
              <div style={{color:C.sub,fontSize:13}}>Code sent to +91 {authPhone}</div>
            </div>
            <div style={{background:C.amberFade,border:"1px solid "+C.amber+"44",borderRadius:12,padding:"12px 14px",marginBottom:20,display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:20}}>📱</span>
              <div>
                <div style={{fontSize:11,color:C.amber,fontWeight:700,marginBottom:2}}>Demo Mode</div>
                <div style={{fontSize:13,color:C.text}}>Your code: <span style={{fontWeight:900,fontSize:18,letterSpacing:"0.12em",color:C.amber}}>{authOtpCode}</span></div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:16}}>
              {authOtpInput.map((val,idx)=>(
                <input key={idx} ref={otpRefs[idx]} type="text" inputMode="numeric" maxLength={1} value={val}
                  onChange={e=>handleOtpKey(idx,e.target.value)}
                  onKeyDown={e=>{if(e.key==="Backspace"&&!val&&idx>0)otpRefs[idx-1]&&otpRefs[idx-1].current&&otpRefs[idx-1].current.focus();}}
                  style={{width:44,height:52,textAlign:"center",fontSize:22,fontWeight:900,background:val?C.tealFade:C.surfaceHi,border:"2px solid "+(val?C.teal:C.border),borderRadius:10,color:C.text,outline:"none"}}/>
              ))}
            </div>
            {authError&&<div style={{color:C.accent,fontSize:12,marginBottom:10,fontWeight:600,textAlign:"center"}}>{authError}</div>}
            <button onClick={verifyOTP} disabled={!allFilled} style={{width:"100%",background:C.teal,border:"none",borderRadius:13,padding:14,color:"#07081A",fontWeight:800,fontSize:15,cursor:"pointer",marginBottom:12,opacity:allFilled?1:0.5}}>
              Verify and Continue
            </button>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <button onClick={()=>{setAuthStep("phone");setAuthOtpInput(["","","","","",""]);setAuthError("");}} style={{background:"none",border:"none",color:C.muted,fontSize:13,cursor:"pointer"}}>Change number</button>
              <button onClick={sendOTP} style={{background:"none",border:"none",color:C.sub,fontSize:13,cursor:"pointer"}}>Resend code</button>
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
              <div style={{fontSize:20,fontWeight:800,marginBottom:5}}>Set up your profile</div>
              <div style={{color:C.sub,fontSize:13}}>This is how friends will see you in streak snaps.</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:20}}>
              {!profileCam ? (
                <div style={{position:"relative",marginBottom:12}}>
                  <div onClick={startProfileCam} style={{width:100,height:100,borderRadius:"50%",background:"linear-gradient(135deg,"+C.accent+"44,"+C.purple+"44)",border:"3px solid "+(authPhoto?C.teal:C.border),display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",cursor:"pointer"}}>
                    {authPhoto?<img src={authPhoto} alt="Profile" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:36}}>🧑</span>}
                  </div>
                  <button onClick={startProfileCam} style={{position:"absolute",bottom:2,right:2,width:30,height:30,borderRadius:"50%",background:C.accent,border:"2px solid "+C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,cursor:"pointer",color:"#fff"}}>📸</button>
                </div>
              ) : (
                <div style={{width:"100%",marginBottom:12}}>
                  <div style={{position:"relative",width:"100%",paddingBottom:"100%",borderRadius:16,overflow:"hidden",background:"#000",border:"2px solid "+C.purple+"55"}}>
                    <video ref={profileVideoRef} autoPlay playsInline muted style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",transform:"scaleX(-1)"}}/>
                  </div>
                  <button onClick={captureProfilePhoto} style={{width:"100%",marginTop:10,background:"linear-gradient(135deg,"+C.accent+","+C.purple+")",border:"none",borderRadius:12,padding:13,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer"}}>Take Photo</button>
                  <button onClick={()=>{profileStreamRef.current&&profileStreamRef.current.getTracks().forEach(t=>t.stop());setProfileCam(false);}} style={{width:"100%",marginTop:8,background:"none",border:"none",color:C.muted,fontSize:13,cursor:"pointer"}}>Skip for now</button>
                </div>
              )}
              {!profileCam&&<div style={{fontSize:12,color:C.muted}}>{authPhoto?"Tap photo to retake":"Tap to add a profile photo"}</div>}
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
                {authError&&<div style={{color:C.accent,fontSize:12,marginBottom:10,fontWeight:600}}>{authError}</div>}
                <button onClick={saveAuthProfile} disabled={authLoading||!authName.trim()} style={{width:"100%",background:"linear-gradient(135deg,"+C.accent+","+C.teal+")",border:"none",borderRadius:13,padding:14,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer",marginBottom:10,opacity:!authName.trim()?0.5:1}}>
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
      const pBg={background:C.surface,border:"1px solid "+C.border,borderRadius:16,padding:"18px 16px",marginBottom:12};
      return (
        <div style={Object.assign({},wrap,{alignItems:"center",justifyContent:"center",overflowY:"auto"})}>
          <div style={{width:"100%",maxWidth:420,padding:"24px 20px"}}>
            <div style={{textAlign:"center",marginBottom:32}}>
              <div style={{fontSize:48,marginBottom:10}}>🚭</div>
              <div style={{fontSize:22,fontWeight:900,background:"linear-gradient(135deg,"+C.accent+","+C.teal+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>One last step</div>
              <div style={{color:C.sub,fontSize:13,marginTop:6,lineHeight:1.6}}>Allow these permissions so Unsmoke can work properly. We never share your data.</div>
            </div>
            <div style={pBg}>
              <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                <div style={{width:52,height:52,borderRadius:14,background:camPerm==="granted"?C.tealFade:camPerm==="denied"?C.accentFade:C.purpleFade,border:"1px solid "+(camPerm==="granted"?C.teal:camPerm==="denied"?C.accent:C.purple)+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                  {camPerm==="granted"?"✅":camPerm==="denied"?"📵":"📸"}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:15,marginBottom:3}}>Camera</div>
                  <div style={{color:C.sub,fontSize:12,lineHeight:1.6,marginBottom:12}}>
                    {camPerm==="granted"?"Camera access granted. You can take selfies with your streak snaps.":camPerm==="denied"?"Camera blocked. You can still use the app, but cannot take snap photos.":"Take selfies to include with your streak snaps. Your photos never leave your device."}
                  </div>
                  {camPerm===null&&<button onClick={askCamera} disabled={permLoading==="cam"} style={{background:"linear-gradient(135deg,"+C.purple+","+C.accent+")",border:"none",borderRadius:10,padding:"10px 20px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",opacity:permLoading==="cam"?0.6:1}}>{permLoading==="cam"?"Asking...":"Allow Camera"}</button>}
                  {camPerm==="granted"&&<div style={{fontSize:12,color:C.teal,fontWeight:700}}>Allowed</div>}
                  {camPerm==="denied"&&<button onClick={askCamera} style={{background:"none",border:"1px solid "+C.muted,borderRadius:10,padding:"8px 16px",color:C.muted,fontWeight:600,fontSize:12,cursor:"pointer"}}>Try again</button>}
                </div>
              </div>
            </div>
            <div style={pBg}>
              <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                <div style={{width:52,height:52,borderRadius:14,background:locPerm==="granted"?C.tealFade:locPerm==="denied"?C.accentFade:C.tealFade,border:"1px solid "+(locPerm==="granted"?C.teal:locPerm==="denied"?C.accent:C.teal)+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                  {locPerm==="granted"?"✅":locPerm==="denied"?"📍":"🗺️"}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:15,marginBottom:3}}>Location</div>
                  <div style={{color:C.sub,fontSize:12,lineHeight:1.6,marginBottom:12}}>
                    {locPerm==="granted"?"Location access granted. We will find support groups and resources near you.":locPerm==="denied"?"Location blocked. Support group finder will not work, but everything else will.":"Find Saksham quit support groups near you and local NRT stores. Optional."}
                  </div>
                  {locPerm===null&&<button onClick={askLocation} disabled={permLoading==="loc"} style={{background:"linear-gradient(135deg,"+C.teal+","+C.purple+")",border:"none",borderRadius:10,padding:"10px 20px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",opacity:permLoading==="loc"?0.6:1}}>{permLoading==="loc"?"Asking...":"Allow Location"}</button>}
                  {locPerm==="granted"&&<div style={{fontSize:12,color:C.teal,fontWeight:700}}>Allowed</div>}
                  {locPerm==="denied"&&<button onClick={askLocation} style={{background:"none",border:"1px solid "+C.muted,borderRadius:10,padding:"8px 16px",color:C.muted,fontWeight:600,fontSize:12,cursor:"pointer"}}>Try again</button>}
                </div>
              </div>
            </div>
            <div style={{background:C.tealFade,border:"1px solid "+C.teal+"22",borderRadius:12,padding:"12px 14px",marginBottom:20,display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:16,flexShrink:0}}>🔒</span>
              <div style={{fontSize:11,color:C.sub,lineHeight:1.6}}>Your data stays on your device. We do not store photos, location, or any personal information on our servers.</div>
            </div>
            <button onClick={()=>setStep(4)} style={{width:"100%",background:C.accent,border:"none",borderRadius:13,padding:15,color:"#fff",fontWeight:800,fontSize:16,cursor:"pointer",marginBottom:10}}>
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
            <div style={{fontSize:24,fontWeight:900,background:"linear-gradient(135deg,"+C.accent+","+C.teal+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Unsmoke</div>
            <div style={{color:C.sub,fontSize:12,marginTop:2}}>with Saksham</div>
          </div>
          {step===1&&(
            <>
              <div style={{fontSize:20,fontWeight:800,marginBottom:5}}>When did you quit?</div>
              <div style={{color:C.sub,fontSize:13,marginBottom:22,lineHeight:1.6}}>Set your quit date and we will track every second of your progress.</div>
              <div style={{marginBottom:14}}><label style={lblStyle}>Quit date</label><input type="date" style={inputStyle} value={sDate} onChange={e=>setSDate(e.target.value)}/></div>
              <div style={{marginBottom:22}}><label style={lblStyle}>Quit time</label><input type="time" style={inputStyle} value={sTime} onChange={e=>setSTime(e.target.value)}/></div>
              <Btn onClick={()=>setStep(2)} disabled={!sDate}>Next</Btn>
              <Btn ghost style={{marginTop:10}} onClick={()=>{setNowTime();setStep(2);}}>I am quitting right now</Btn>
            </>
          )}
          {step===2&&(
            <>
              <div style={{fontSize:20,fontWeight:800,marginBottom:5}}>Your smoking habit</div>
              <div style={{color:C.sub,fontSize:13,marginBottom:22,lineHeight:1.6}}>We will calculate exactly what you are saving.</div>
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
  const TABS=[{id:"home",icon:"🏠",label:"Home"},{id:"sos",icon:"🆘",label:"SOS"},{id:"journey",icon:"🗓",label:"Journey"},{id:"mindset",icon:"🧠",label:"Mindset"},{id:"log",icon:"📊",label:"Insights"},];

  return (
    <div style={wrap}>
      {/* AI Chat screens */}
      {premiumScreen==="coach"&&<AIChat systemPrompt={coachSystem} welcomeMsg={"Hey! "+d+" days smoke-free with a score of "+healthScore+"/100. Solid. What is on your mind today?"} avatar="🤖" name="AI Quit Coach" subtitle="Powered by Claude - Online" onClose={()=>setPremiumScreen(null)}/>}
      {premiumScreen==="saksham"&&<AIChat systemPrompt={sakshamSystem} welcomeMsg={"Hey! "+d+" days. That is solid. What is going on?"} avatar="🧑" name="Saksham" subtitle="Founder - Responding now" onClose={()=>setPremiumScreen(null)}/>}
      {premiumScreen==="coach_call"&&<VoiceCall person="coach" systemPrompt={coachSystem} avatar="🤖" onClose={()=>setPremiumScreen(null)}/>}
      {premiumScreen==="saksham_call"&&<VoiceCall person="saksham" systemPrompt={sakshamSystem} avatar="🧑" onClose={()=>setPremiumScreen(null)}/>}

      {/* NRT overlay */}
      {premiumScreen==="nrt"&&(
        <div style={{position:"absolute",inset:0,zIndex:999,background:"#07081A",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #1C2040",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div><div style={{fontWeight:800,fontSize:15,color:"#F0EDF8"}}>NRT Step-Down Plan</div><div style={{fontSize:11,color:"#8090B0"}}>Saksham own protocol</div></div>
            <button onClick={()=>setPremiumScreen(null)} style={{background:"#141730",border:"1px solid #1C2040",borderRadius:20,padding:"6px 14px",color:"#8090B0",fontSize:12,fontWeight:700,cursor:"pointer"}}>Close</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"20px 16px"}}>
            <div style={{background:"rgba(255,184,0,0.1)",border:"1px solid #FFB80033",borderRadius:14,padding:"16px",marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:"#FFB800",marginBottom:12}}>Your smoking details</div>
              <label style={{color:"#8090B0",fontSize:10,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",marginBottom:5,display:"block"}}>Cigarettes per day</label>
              <input type="number" value={nrtCigsLocal} onChange={e=>setNrtCigsLocal(e.target.value)} min="1" max="80" style={{background:"#141730",border:"1px solid #1C2040",borderRadius:9,padding:"12px 13px",color:"#F0EDF8",fontSize:14,width:"100%",boxSizing:"border-box",outline:"none"}}/>
            </div>
            <div style={{fontSize:11,color:"#8090B0",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:12}}>Your personalized plan</div>
            {nrtPlan.map((step,i)=>(
              <div key={i} style={{background:"#0E1128",border:"1px solid #1C2040",borderRadius:14,padding:"16px 14px",marginBottom:10,borderLeft:"3px solid "+(i===0?"#FF6534":i===1?"#FFB800":"#00D9AA")}}>
                <div style={{fontSize:10,color:"#363D5C",marginBottom:4}}>{step.week}</div>
                <div style={{fontWeight:800,fontSize:15,color:i===0?"#FF6534":i===1?"#FFB800":"#00D9AA",marginBottom:6}}>{step.patch}</div>
                <div style={{fontSize:13,color:"#8090B0",lineHeight:1.6}}>{step.desc}</div>
              </div>
            ))}
            <div style={{background:"rgba(139,92,246,0.1)",border:"1px solid #8B5CF633",borderRadius:14,padding:"16px",marginTop:4}}>
              <div style={{fontSize:12,fontWeight:700,color:"#8B5CF6",marginBottom:6}}>Saksham note</div>
              <div style={{fontSize:13,color:"#8090B0",lineHeight:1.7}}>The patch does the physical work. Your real job is breaking the habit loops. By Day 8, go cold turkey. That is when the real test starts.</div>
            </div>
          </div>
        </div>
      )}

      {/* Founder story overlay */}
      {showFounderStory&&(
        <div style={{position:"absolute",inset:0,zIndex:997,background:"#07081A",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #1C2040",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div><div style={{fontWeight:800,fontSize:15,color:"#F0EDF8"}}>Saksham Story</div><div style={{fontSize:11,color:"#8090B0"}}>@ssakshamchauhan</div></div>
            <button onClick={()=>setShowFounderStory(false)} style={{background:"#141730",border:"1px solid #1C2040",borderRadius:20,padding:"6px 14px",color:"#8090B0",fontSize:12,fontWeight:700,cursor:"pointer"}}>Close</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"20px 16px"}}>
            <div style={{background:"linear-gradient(135deg,rgba(255,101,52,0.08),rgba(0,217,170,0.08))",border:"1px solid rgba(0,217,170,0.2)",borderRadius:16,padding:"20px 16px",marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{width:48,height:48,borderRadius:"50%",background:"linear-gradient(135deg,#FF6534,#00D9AA)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🧑</div>
                <div><div style={{fontWeight:800,fontSize:15,color:"#F0EDF8"}}>Saksham Singh Chauhan</div><div style={{color:"#8090B0",fontSize:12,marginTop:2}}>Founder - Delhi</div></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[{v:String(founderDays),l:"days quit"},{v:"40",l:"cigs/day before"},{v:"12 yrs",l:"he smoked"}].map(({v,l})=>(
                  <div key={l} style={{textAlign:"center",background:"#0E1128",borderRadius:10,padding:"10px 6px"}}>
                    <div style={{fontSize:16,fontWeight:900,color:"#00D9AA"}}>{v}</div>
                    <div style={{fontSize:9,color:"#8090B0",marginTop:2}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:12,padding:"10px 12px",background:"rgba(255,184,0,0.08)",borderRadius:10,borderLeft:"3px solid #FFB800"}}>
                <div style={{fontSize:12,color:"#FFB800",fontWeight:700}}>Oct 31, 2024 - Last cigarette</div>
                <div style={{fontSize:11,color:"#8090B0",marginTop:2}}>219K views - 4,381 likes - 1,807 shares</div>
              </div>
            </div>
            {FOUNDER_STORY.map((ch,i)=>(
              <div key={i} style={{background:"#0E1128",border:"1px solid #1C2040",borderRadius:14,padding:"16px 14px",marginBottom:14,borderColor:ch.color+"33"}}>
                <div style={{fontSize:9,fontWeight:800,letterSpacing:"0.1em",color:ch.color,textTransform:"uppercase",marginBottom:8}}>{ch.label}</div>
                <div style={{fontSize:16,fontWeight:800,color:"#F0EDF8",marginBottom:10,lineHeight:1.4}}>{ch.heading}</div>
                <div style={{fontSize:13,color:"#8090B0",lineHeight:1.75,whiteSpace:"pre-line"}}>{ch.body}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile overlay */}
      {showProfile&&(
        <div style={{position:"absolute",inset:0,zIndex:1005,background:"rgba(0,0,0,0.85)",display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div style={{background:C.surface,borderRadius:"20px 20px 0 0",padding:"28px 20px 40px",border:"1px solid "+C.border}}>
            <div style={{width:40,height:4,background:C.muted,borderRadius:2,margin:"0 auto 24px"}}/>
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24}}>
              <div style={{width:64,height:64,borderRadius:"50%",background:"linear-gradient(135deg,"+C.accent+","+C.purple+")",border:"3px solid "+C.teal,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                {authUser&&authUser.photo?<img src={authUser.photo} alt="p" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:28}}>🧑</span>}
              </div>
              <div>
                <div style={{fontWeight:900,fontSize:18}}>{authUser?authUser.name||authName:"User"}</div>
                <div style={{fontSize:12,color:C.sub,marginTop:2}}>+91 {authUser?authUser.phone:authPhone}</div>
                <div style={{fontSize:11,color:C.teal,marginTop:3,fontWeight:700}}>{streak} day streak - {d} days quit</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
              {[{v:d,l:"days quit",c:C.accent},{v:healthScore,l:"health score",c:C.teal},{v:"Rs "+money.toLocaleString("en-IN"),l:"saved",c:C.teal}].map(({v,l,c})=>(
                <div key={l} style={{textAlign:"center",background:C.surfaceHi,borderRadius:12,padding:"12px 6px",border:"1px solid "+C.border}}>
                  <div style={{fontSize:17,fontWeight:900,color:c}}>{v}</div>
                  <div style={{fontSize:9,color:C.sub,marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>
            <button onClick={()=>{setShowProfile(false);setShowPremium(true);}} style={{width:"100%",background:C.amberFade,border:"1px solid "+C.amber+"44",borderRadius:12,padding:13,color:C.amber,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:10}}>
              {isPremium?"Manage Premium":"Upgrade to Premium"}
            </button>
            <button onClick={logout} style={{width:"100%",background:C.accentFade,border:"1px solid "+C.accent+"44",borderRadius:12,padding:13,color:C.accent,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:10}}>
              Log out
            </button>
            <button onClick={()=>setShowProfile(false)} style={{width:"100%",background:"none",border:"none",color:C.muted,fontSize:14,cursor:"pointer",padding:8}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Snap viewer */}
      {viewingSnap&&(
        <div style={{position:"absolute",inset:0,zIndex:1000,background:"#000",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:"linear-gradient(160deg,#0E1128,#1A0E28)",border:"1px solid "+C.purple+"44",borderRadius:20,width:"100%",maxWidth:360,overflow:"hidden"}}>
            {viewingSnap.photo&&<div style={{position:"relative",width:"100%",paddingBottom:"60%",overflow:"hidden"}}><img src={viewingSnap.photo} alt="snap" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/><div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 50%,#0E1128 100%)"}}/><div style={{position:"absolute",bottom:12,left:0,right:0,textAlign:"center",color:"#fff",fontWeight:800,fontSize:18}}>{viewingSnap.senderName}</div></div>}
            <div style={{padding:"20px 20px 24px",textAlign:"center"}}>
              {!viewingSnap.photo&&<div style={{fontWeight:800,fontSize:18,marginBottom:16}}>{viewingSnap.senderName}</div>}
              <div style={{fontSize:60,fontWeight:900,color:C.accent,lineHeight:1}}>{viewingSnap.quitDays}</div>
              <div style={{fontSize:13,color:C.sub,marginTop:4,marginBottom:16}}>days smoke-free</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
                {[{v:viewingSnap.healthScore,l:"score",c:C.teal},{v:viewingSnap.cigsAvoided,l:"avoided",c:C.teal},{v:"Rs "+(viewingSnap.moneySaved||0).toLocaleString("en-IN"),l:"saved",c:C.teal}].map(({v,l,c})=>(
                  <div key={l} style={{background:"rgba(255,255,255,0.05)",borderRadius:10,padding:"8px 4px"}}>
                    <div style={{fontSize:14,fontWeight:900,color:c}}>{v}</div>
                    <div style={{fontSize:8,color:C.sub,marginTop:2}}>{l}</div>
                  </div>
                ))}
              </div>
              {viewingSnap.message&&<div style={{fontSize:13,color:C.text,fontStyle:"italic",background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"10px 14px",marginBottom:12}}>{viewingSnap.message}</div>}
              <button onClick={()=>{handleSnapViewed();setViewingSnap(null);}} style={{background:C.teal,border:"none",borderRadius:11,padding:"12px 32px",fontWeight:700,fontSize:14,cursor:"pointer",color:"#07081A"}}>Done</button>
            </div>
          </div>
        </div>
      )}

      {celebMS&&!viewingSnap&&(
        <div style={{position:"absolute",top:60,left:"50%",transform:"translateX(-50%)",zIndex:995,background:"linear-gradient(135deg,"+C.teal+","+C.purple+")",borderRadius:14,padding:"12px 20px",textAlign:"center",boxShadow:"0 8px 32px rgba(0,0,0,0.5)",maxWidth:280,pointerEvents:"none"}}>
          <div style={{fontWeight:800,fontSize:13,color:"#fff"}}>Milestone reached!</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.8)",marginTop:2}}>{celebMS.label}</div>
        </div>
      )}

      {showSlipped&&(
        <div style={{position:"absolute",inset:0,zIndex:996,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={crd({maxWidth:340,width:"100%",padding:24})}>
            <div style={{fontSize:28,textAlign:"center",marginBottom:8}}>💙</div>
            <div style={{fontSize:17,fontWeight:800,textAlign:"center",marginBottom:8}}>It is okay. One slip does not define you.</div>
            <div style={{color:C.sub,fontSize:13,lineHeight:1.7,marginBottom:16}}>You have been smoke-free for <span style={{color:C.teal,fontWeight:700}}>{d}d {h}h</span>. That is real. One cigarette does not erase that.</div>
            <Btn onClick={()=>setShowSlipped(false)} style={{marginBottom:10,background:C.teal}}>I am still quit - it was one moment</Btn>
            <Btn ghost onClick={confirmSlipped}>Restart my timer from now</Btn>
            <button onClick={()=>setShowSlipped(false)} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",width:"100%",marginTop:8}}>Close</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{padding:"12px 16px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid "+C.border,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>setShowProfile(true)} style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,"+C.accent+","+C.purple+")",border:"2px solid "+C.teal+"44",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",cursor:"pointer",padding:0,flexShrink:0}}>
            {authUser&&authUser.photo?<img src={authUser.photo} alt="p" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:16}}>🧑</span>}
          </button>
          <div>
            <div style={{fontWeight:900,fontSize:14,background:"linear-gradient(135deg,"+C.accent+","+C.teal+")",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>Unsmoke</div>
            <div style={{color:C.muted,fontSize:9,lineHeight:1}}>{authUser?authUser.name||authName:"with Saksham"}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <div style={{fontSize:11,fontWeight:700,color:C.teal}}>🔥 {streak}d</div>
          <button onClick={()=>setShowPremium(true)} style={{background:isPremium?"linear-gradient(135deg,"+C.gold+","+C.amber+")":C.amberFade,border:"1px solid "+C.gold+"44",borderRadius:20,padding:"5px 10px",color:isPremium?"#07081A":C.gold,fontSize:11,fontWeight:800,cursor:"pointer"}}>
            {isPremium?"👑 PRO":"👑"}
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div style={{flex:1,overflowY:"auto"}}>

        {tab==="home"&&(
          <div style={{padding:"16px 14px"}}>
            <div style={crd({marginBottom:12,background:"linear-gradient(160deg,#0E1128,#141830)"})}>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <ScoreRing score={healthScore}/>
                <div style={{flex:1}}>
                  <div style={{color:C.sub,fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Smoke-free</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {[{v:d,l:"d"},{v:h,l:"h"},{v:m,l:"m"},{v:s,l:"s"}].map(({v,l})=>(
                      <div key={l}><span style={{fontSize:28,fontWeight:900,color:C.accent,fontVariantNumeric:"tabular-nums"}}>{pad(v)}</span><span style={{fontSize:11,color:C.sub,marginLeft:1}}>{l}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
              {[{v:cigs,l:"not smoked",c:C.teal},{v:"Rs "+money.toLocaleString("en-IN"),l:"saved",c:C.teal},{v:streak+"d",l:"streak",c:C.purple}].map(({v,l,c})=>(
                <div key={l} style={crd({textAlign:"center",padding:"12px 8px"})}><div style={{fontSize:16,fontWeight:900,color:c}}>{v}</div><div style={{color:C.sub,fontSize:9,marginTop:2}}>{l}</div></div>
              ))}
            </div>
            {!isPremium&&(
              <div onClick={()=>setShowPremium(true)} style={crd({marginBottom:10,cursor:"pointer",background:C.amberFade,borderColor:C.gold+"44"})}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{fontSize:24}}>👑</div>
                  <div style={{flex:1}}><div style={{fontWeight:800,fontSize:13,color:C.gold}}>AI Coach - Voice Calls - NRT Plan</div><div style={{fontSize:12,color:C.sub,marginTop:2}}>Unlock Premium features</div></div>
                  <span style={{color:C.gold,fontSize:16}}>›</span>
                </div>
              </div>
            )}
            <div style={crd({marginBottom:10,background:C.amberFade,borderColor:C.amber+"33"})}>
              <div style={{fontSize:10,color:C.amber,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>Today challenge</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.65}}>{challenge}</div>
            </div>
            <div style={crd({marginBottom:10})}>
              <div style={{fontSize:10,color:C.sub,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>Milestones</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                {ACHIEVEMENTS.map(a=>{
                  const u=elMin>=a.min;
                  return <div key={a.id} style={{padding:"5px 11px",borderRadius:20,background:u?C.tealFade:C.surfaceHi,color:u?C.teal:C.muted,fontSize:11,border:"1px solid "+(u?C.teal+"44":C.border),fontWeight:u?700:400}}>{a.icon} {a.label}</div>;
                })}
              </div>
            </div>
            <button onClick={()=>setShowSlipped(true)} style={{background:"none",border:"none",color:C.muted,fontSize:12,cursor:"pointer",width:"100%",padding:"8px 0",textDecoration:"underline"}}>I slipped today</button>
            {/* Founder story card */}
            <div onClick={()=>setShowFounderStory(true)} style={crd({marginTop:8,cursor:"pointer",background:"linear-gradient(135deg,rgba(255,101,52,0.07),rgba(139,92,246,0.07))",borderColor:C.accent+"33"})}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:"50%",background:"linear-gradient(135deg,"+C.accent+","+C.purple+")",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🧑</div>
                <div style={{flex:1}}><div style={{fontWeight:800,fontSize:14,color:C.text}}>Saksham Story</div><div style={{color:C.sub,fontSize:12,marginTop:2}}>2 packs a day. 12 years. Then Oct 31, 2024.</div></div>
                <div style={{color:C.muted,fontSize:18}}>›</div>
              </div>
            </div>
            {/* Premium quick access */}
            {isPremium&&(
              <div style={crd({marginTop:8})}>
                <div style={{fontSize:10,color:C.gold,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>👑 Premium</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[{label:"📞 Call Coach",screen:"coach_call",c:C.teal},{label:"📞 Call Saksham",screen:"saksham_call",c:C.accent},{label:"💬 Chat Coach",screen:"coach",c:C.teal},{label:"💊 NRT Plan",screen:"nrt",c:C.amber}].map(({label,screen,c})=>(
                    <button key={screen} onClick={()=>setPremiumScreen(screen)} style={{background:c+"22",border:"1px solid "+c+"44",borderRadius:10,padding:"10px 8px",color:c,fontWeight:700,fontSize:11,cursor:"pointer"}}>{label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab==="sos"&&(
          <div style={{padding:"16px 14px"}}>
            <div style={{fontSize:18,fontWeight:800,marginBottom:3}}>Craving Toolkit</div>
            <div style={{color:C.sub,fontSize:13,marginBottom:16}}>Every craving passes in under 5 minutes.</div>
            <div style={crd({marginBottom:10})}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div><div style={{fontWeight:700,fontSize:15,marginBottom:2}}>5-Minute Timer</div><div style={{color:C.sub,fontSize:12}}>Ride it out. It will pass.</div></div>
                {cSec<300&&<div style={{fontSize:22,fontWeight:900,color:C.accent,fontVariantNumeric:"tabular-nums"}}>{pad(Math.floor(cSec/60))}:{pad(cSec%60)}</div>}
              </div>
              {cSec<300&&<div style={{marginTop:10,height:4,background:C.border,borderRadius:4}}><div style={{height:4,background:cSec===0?C.teal:C.accent,borderRadius:4,width:((300-cSec)/300*100)+"%",transition:"width 1s linear"}}/></div>}
              <div style={{marginTop:10,display:"flex",gap:8}}>
                {cSec===0?<Btn ghost onClick={()=>{setCSec(300);setCRun(false);}}>Reset</Btn>:<Btn onClick={()=>setCRun(r=>!r)}>{cRun?"Pause":cSec===300?"Start Timer":"Resume"}</Btn>}
              </div>
            </div>
            <div style={crd({marginBottom:10})}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>4-7-8 Breathing</div>
              <div style={{color:C.sub,fontSize:12,marginBottom:14}}>Activates your parasympathetic system. Dissolves anxiety.</div>
              {breathOn?(
                <div style={{textAlign:"center",padding:"8px 0"}}>
                  <div style={{width:100,height:100,borderRadius:"50%",margin:"0 auto 14px",background:"radial-gradient(circle,"+curB.color+"20,transparent)",border:"3px solid "+curB.color,display:"flex",alignItems:"center",justifyContent:"center",transition:bPhase==="inhale"?"transform 4s ease-in-out":"none",transform:bPhase==="exhale"?"scale(0.82)":"scale(1.28)"}}>
                    <span style={{color:curB.color,fontSize:11,fontWeight:700}}>{curB.label}</span>
                  </div>
                  <div style={{color:C.sub,fontSize:11}}>4s inhale - 7s hold - 8s exhale</div>
                  <button onClick={()=>{setBreathOn(false);setBStep(0);setBPhase("inhale");}} style={{background:"transparent",color:C.accent,border:"1.5px solid "+C.accent,borderRadius:11,padding:"9px 22px",fontWeight:600,fontSize:13,cursor:"pointer",marginTop:12}}>Stop</button>
                </div>
              ):(
                <Btn onClick={()=>{setBreathOn(true);setBStep(0);}}>Begin Breathing</Btn>
              )}
            </div>
            <div style={crd()}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>Flip the Script</div>
              <div style={{color:C.sub,fontSize:12,marginBottom:12}}>CBT in 10 seconds. Tap what you are thinking right now.</div>
              {REFRAMES.map((r,i)=>(
                <div key={i} onClick={()=>setRfOpen(rfOpen===i?null:i)} style={{background:rfOpen===i?C.accentFade:C.surfaceHi,border:"1px solid "+(rfOpen===i?C.accent+"55":C.border),borderRadius:10,padding:"11px 13px",cursor:"pointer",marginBottom:8}}>
                  <div style={{fontWeight:600,fontSize:13,color:rfOpen===i?C.text:C.sub}}>{r.trigger}</div>
                  {rfOpen===i&&<div style={{marginTop:7,color:C.teal,fontSize:13,lineHeight:1.6}}>{r.reframe}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="journey"&&(
          <div style={{padding:"16px 14px"}}>
            <div style={{fontSize:18,fontWeight:800,marginBottom:3}}>Your Journey</div>
            <div style={{color:C.sub,fontSize:13,marginBottom:14}}>Every smoke-free day, tracked.</div>
            <div style={{position:"relative"}}>
              <div style={{position:"absolute",left:19,top:0,bottom:0,width:2,background:C.border,zIndex:0}}/>
              {MILESTONES.map((ms,i)=>{
                const isDone=elMin>=ms.min,isNext=nextMS===ms;
                return (
                  <div key={i} style={{display:"flex",gap:12,marginBottom:12,position:"relative"}}>
                    <div style={{width:40,height:40,borderRadius:"50%",background:isDone?C.teal:C.surface,border:"2px solid "+(isDone?C.teal:C.border),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,zIndex:1,fontSize:13,color:isDone?"#07081A":"inherit",fontWeight:900}}>{isDone?"v":"o"}</div>
                    <div style={crd({flex:1,padding:"11px 13px",borderColor:isNext?C.teal+"55":isDone?C.teal+"22":C.border,background:isNext?"rgba(0,217,170,0.05)":C.surface})}>
                      <div style={{fontWeight:700,fontSize:13,color:isDone?C.text:C.sub}}>{ms.label}</div>
                      <div style={{color:C.muted,fontSize:10,marginTop:2}}>{msLabel(ms.min)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab==="mindset"&&(
          <div style={{padding:"16px 14px"}}>
            <div style={{fontSize:18,fontWeight:800,marginBottom:3}}>Mindset</div>
            <div style={{color:C.sub,fontSize:13,marginBottom:14}}>CBT lessons and daily mood.</div>
            <div style={crd({marginBottom:12})}>
              <div style={{fontSize:12,fontWeight:700,color:C.sub,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10}}>How are you feeling today?</div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                {MOODS.map(mo=>(
                  <button key={mo.v} onClick={()=>setMood(mo.v)} style={{flex:1,padding:"10px 4px",background:todayMood===mo.v?C.tealFade:"transparent",border:"1px solid "+(todayMood===mo.v?C.teal:C.border),borderRadius:10,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <span style={{fontSize:22}}>{mo.e}</span><span style={{fontSize:9,color:todayMood===mo.v?C.teal:C.muted,fontWeight:700}}>{mo.l}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={crd({marginBottom:12,background:C.purpleFade,borderColor:C.purple+"33"})}>
              <div style={{fontSize:10,color:C.purple,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>Today mindset</div>
              <div style={{color:C.text,fontSize:13,lineHeight:1.7,fontStyle:"italic"}}>{quote}</div>
            </div>
            <div style={{fontSize:10,color:C.sub,marginBottom:6}}>{read.length}/{LESSONS.length} lessons read</div>
            <div style={{height:3,background:C.border,borderRadius:4,marginBottom:12}}><div style={{height:3,background:C.purple,borderRadius:4,width:(read.length/LESSONS.length*100)+"%"}}/></div>
            {LESSONS.map((l,i)=>{
              const isRead=read.includes(i),isOpen=lsnOpen===i;
              return (
                <div key={i} onClick={()=>{setLsnOpen(isOpen?null:i);markRead(i);}} style={crd({cursor:"pointer",marginBottom:10,borderColor:isOpen?l.color+"55":C.border})}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                        <span style={{fontSize:9,fontWeight:800,letterSpacing:"0.08em",color:l.color,background:l.color+"22",padding:"2px 8px",borderRadius:20}}>{l.tag}</span>
                        {isRead&&<span style={{fontSize:9,color:C.teal,fontWeight:700}}>READ</span>}
                      </div>
                      <div style={{fontWeight:700,fontSize:14}}>{l.title}</div>
                    </div>
                    <div style={{color:C.muted,fontSize:18,marginLeft:8}}>{isOpen?"-":"+"}</div>
                  </div>
                  {isOpen&&<div style={{marginTop:12,paddingTop:12,borderTop:"1px solid "+C.border}}>
                    <div style={{color:C.sub,fontSize:13,lineHeight:1.75}}>{l.body}</div>
                    <div style={{marginTop:12,padding:"11px 13px",background:l.color+"14",borderRadius:10,borderLeft:"3px solid "+l.color}}>
                      <div style={{fontSize:10,color:l.color,fontWeight:800,textTransform:"uppercase",marginBottom:4}}>Key Insight</div>
                      <div style={{fontSize:13,color:C.text,fontWeight:600}}>{l.key}</div>
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
              <div style={{fontSize:18,fontWeight:800}}>Insights</div>
              <button onClick={()=>setShowForm(f=>!f)} style={{background:"transparent",color:C.accent,border:"1.5px solid "+C.accent,borderRadius:11,padding:"7px 13px",fontWeight:600,fontSize:12,cursor:"pointer"}}>{showForm?"Cancel":"+ Log craving"}</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div style={crd({textAlign:"center"})}><div style={{fontSize:22,fontWeight:900,color:C.teal}}>{entries.length>0?Math.round(resRate*100):"-"}%</div><div style={{color:C.sub,fontSize:10,marginTop:2}}>cravings resisted</div></div>
              <div style={crd({textAlign:"center"})}><div style={{fontSize:22,fontWeight:900,color:C.purple}}>{streak}</div><div style={{color:C.sub,fontSize:10,marginTop:2}}>day streak</div></div>
            </div>
            {showForm&&(
              <div style={crd({marginBottom:12})}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>What triggered this craving?</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
                  {TRIGGERS.map(t=><button key={t} onClick={()=>setLTags(tags=>tags.includes(t)?tags.filter(x=>x!==t):[...tags,t])} style={{padding:"5px 12px",borderRadius:20,border:"1px solid "+(lTags.includes(t)?C.accent:C.border),background:lTags.includes(t)?C.accentFade:"transparent",color:lTags.includes(t)?C.accent:C.sub,cursor:"pointer",fontSize:12}}>{t}</button>)}
                </div>
                <div style={{fontSize:10,color:C.sub,fontWeight:700,textTransform:"uppercase",marginBottom:5}}>Intensity: {lInt}/10</div>
                <input type="range" min="1" max="10" value={lInt} onChange={e=>setLInt(+e.target.value)} style={{width:"100%",marginBottom:12,accentColor:C.accent}}/>
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  <button onClick={()=>setLRes(true)} style={{flex:1,padding:10,borderRadius:9,border:"1px solid "+(lRes?C.teal:C.border),background:lRes?C.tealFade:"transparent",color:lRes?C.teal:C.sub,cursor:"pointer",fontWeight:700,fontSize:12}}>Resisted</button>
                  <button onClick={()=>setLRes(false)} style={{flex:1,padding:10,borderRadius:9,border:"1px solid "+(!lRes?C.accent:C.border),background:!lRes?C.accentFade:"transparent",color:!lRes?C.accent:C.sub,cursor:"pointer",fontWeight:700,fontSize:12}}>Gave in</button>
                </div>
                <textarea placeholder="Notes (optional)" value={lNote} onChange={e=>setLNote(e.target.value)} style={{background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:9,padding:"11px 13px",color:C.text,fontSize:13,width:"100%",boxSizing:"border-box",outline:"none",minHeight:50,resize:"vertical",marginBottom:10}}/>
                <Btn onClick={saveEntry} disabled={lTags.length===0}>Save Entry</Btn>
              </div>
            )}
            {entries.length===0&&!showForm&&<div style={{textAlign:"center",padding:"32px 20px",color:C.muted}}><div style={{fontSize:32,marginBottom:8}}>📊</div><div style={{fontSize:13}}>No craving logs yet. Tap + Log craving when one hits.</div></div>}
            {entries.map(e=>(
              <div key={e.id} style={crd({marginBottom:8})}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,flex:1}}>{e.tags.map(t=><span key={t} style={{fontSize:10,padding:"2px 9px",borderRadius:20,background:C.surfaceHi,color:C.sub}}>{t}</span>)}</div>
                  <span style={{fontSize:11,fontWeight:800,color:e.resisted?C.teal:C.accent,marginLeft:8}}>{e.resisted?"Resisted":"Gave in"}</span>
                </div>
                <span style={{fontSize:11,color:C.sub}}>Intensity: {e.intensity}/10</span>
              </div>
            ))}
          </div>
        )}

        {tab==="friends"&&(
          <div style={{padding:"16px 14px"}}>
            <div style={{fontSize:18,fontWeight:800,marginBottom:3}}>Streak Snaps</div>
            <div style={{color:C.sub,fontSize:13,marginBottom:16}}>Send your smoke-free streak to friends. One-time view. Build a streak together.</div>
            <div style={crd({marginBottom:12})}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Send a Streak Snap</div>
              <div style={{color:C.sub,fontSize:12,marginBottom:12}}>Create a one-time snap. Friend opens it once, then it is gone.</div>
              {mySentSnap&&!mySentSnap.viewed?(
                <div>
                  <div style={{background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:12,padding:16,textAlign:"center",marginBottom:10}}>
                    <div style={{fontSize:11,color:C.sub,marginBottom:6}}>Share this code with a friend</div>
                    <div style={{fontSize:32,fontWeight:900,color:C.accent,letterSpacing:"0.15em"}}>{mySentSnap.code}</div>
                  </div>
                  <button onClick={copyCode} style={{background:copied?C.tealFade:C.accentFade,border:"1px solid "+(copied?C.teal:C.accent),borderRadius:10,padding:12,width:"100%",color:copied?C.teal:C.accent,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:8}}>
                    {copied?"Copied! Send it to them":"Copy code and message"}
                  </button>
                  <button onClick={async()=>{await FB.del("snaps/"+mySentSnap.code);setMySentSnap(null);saveUD({mySnapCode:null});}} style={{background:"none",border:"none",color:C.muted,fontSize:11,cursor:"pointer",width:"100%"}}>Create new snap instead</button>
                </div>
              ):mySentSnap&&mySentSnap.viewed?(
                <div>
                  <div style={{background:C.tealFade,border:"1px solid "+C.teal+"44",borderRadius:12,padding:14,textAlign:"center",marginBottom:10}}>
                    <div style={{fontWeight:700,fontSize:13,color:C.teal}}>{mySentSnap.viewerName||"Your friend"} opened your snap!</div>
                  </div>
                  <Btn onClick={()=>{setMySentSnap(null);saveUD({mySnapCode:null});}}>Send another snap</Btn>
                </div>
              ):(
                <div>
                  {!showCamera&&!snapPhoto&&(
                    <div style={{marginBottom:12}}>
                      <button onClick={startCamera} style={{width:"100%",background:C.purpleFade,border:"1px dashed "+C.purple+"55",borderRadius:12,padding:16,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                        <span style={{fontSize:28}}>📸</span>
                        <span style={{color:C.text,fontWeight:700,fontSize:13}}>Take a selfie with your snap</span>
                        <span style={{color:C.muted,fontSize:11}}>Optional</span>
                      </button>
                      {cameraErr&&<div style={{fontSize:12,color:C.accent,marginTop:6,textAlign:"center"}}>{cameraErr}</div>}
                    </div>
                  )}
                  {showCamera&&(
                    <div style={{marginBottom:12}}>
                      <div style={{position:"relative",width:"100%",paddingBottom:"100%",borderRadius:16,overflow:"hidden",background:"#000"}}>
                        <video ref={videoRef} autoPlay playsInline muted style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",transform:cameraFacing==="user"?"scaleX(-1)":"none"}}/>
                        <button onClick={()=>{setCameraFacing(f=>f==="user"?"environment":"user");stopCamera();setTimeout(startCamera,100);}} style={{position:"absolute",top:10,right:50,background:"rgba(0,0,0,0.5)",border:"none",borderRadius:20,padding:"6px 10px",color:"#fff",fontSize:14,cursor:"pointer"}}>flip</button>
                        <button onClick={stopCamera} style={{position:"absolute",top:10,right:10,background:"rgba(0,0,0,0.5)",border:"none",borderRadius:20,padding:"6px 10px",color:"#fff",fontSize:12,cursor:"pointer"}}>x</button>
                      </div>
                      <div style={{display:"flex",gap:8,marginTop:10}}>
                        <button onClick={capturePhoto} style={{flex:2,background:"linear-gradient(135deg,"+C.accent+","+C.purple+")",border:"none",borderRadius:12,padding:14,color:"#fff",fontWeight:800,fontSize:15,cursor:"pointer"}}>Capture</button>
                        <button onClick={stopCamera} style={{flex:1,background:C.surfaceHi,border:"1px solid "+C.border,borderRadius:12,padding:14,color:C.sub,fontWeight:700,fontSize:13,cursor:"pointer"}}>Skip</button>
                      </div>
                    </div>
                  )}
                  {snapPhoto&&(
                    <div style={{marginBottom:12,position:"relative"}}>
                      <img src={snapPhoto} alt="snap" style={{width:"100%",borderRadius:12,display:"block"}}/>
                      <button onClick={()=>setSnapPhoto(null)} style={{position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:20,padding:"5px 12px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Retake</button>
                    </div>
                  )}
                  <textarea placeholder="Add a message (optional)" value={snapMsg} onChange={e=>setSnapMsg(e.target.value)} style={Object.assign({},inputStyle,{minHeight:48,resize:"none",marginBottom:10})} maxLength={80}/>
                  <Btn onClick={sendSnap} disabled={sendingSnap||showCamera}>{sendingSnap?"Creating snap...":"Create Snap"}</Btn>
                </div>
              )}
            </div>
            <div style={crd({marginBottom:12})}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Open a Snap</div>
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <input style={Object.assign({},inputStyle,{flex:1,textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:700,fontSize:16})} placeholder="ABC123" value={codeInput} onChange={e=>setCodeInput(e.target.value.toUpperCase())} maxLength={8}/>
                <button onClick={openCode} style={{background:C.accent,color:"#fff",border:"none",borderRadius:11,padding:"12px 18px",fontWeight:700,fontSize:14,cursor:"pointer",flexShrink:0}}>Open</button>
              </div>
              {snapStatus&&<div style={{fontSize:12,color:C.teal,fontWeight:600,padding:"8px 0"}}>{snapStatus}</div>}
            </div>
            {myStreaks.length>0&&(
              <div style={crd()}>
                <div style={{fontSize:11,color:C.sub,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:12}}>Your streaks</div>
                {myStreaks.sort((a,b)=>b.count-a.count).map((s,i)=>(
                  <div key={s.friendPhone||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<myStreaks.length-1?"1px solid "+C.border:"none"}}>
                    <div style={{fontWeight:700,fontSize:14}}>{s.friendName}</div>
                    <div style={{display:"flex",alignItems:"center",gap:6,background:C.amberFade,border:"1px solid "+C.amber+"44",borderRadius:20,padding:"5px 12px"}}>
                      <span style={{fontSize:16}}>🔥</span><span style={{fontWeight:900,fontSize:16,color:C.amber}}>{s.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Tab bar */}
      <div style={{display:"flex",borderTop:"1px solid "+C.border,background:C.surface,flexShrink:0}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setBreathOn(false);}} style={{flex:1,padding:"9px 2px 11px",border:"none",background:"transparent",color:tab===t.id?C.accent:C.muted,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,fontSize:8,fontWeight:700,letterSpacing:"0.03em",textTransform:"uppercase"}}>
            <span style={{fontSize:16}}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {showPremium&&(
        <div style={{position:"absolute",inset:0,zIndex:998,background:"#07081A",display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #1C2040",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
            <div><div style={{fontWeight:900,fontSize:16,color:"#FFD700"}}>👑 Unsmoke Premium</div><div style={{fontSize:11,color:"#8090B0",marginTop:1}}>Rs 299/month</div></div>
            <button onClick={()=>setShowPremium(false)} style={{background:"#141730",border:"1px solid #1C2040",borderRadius:20,padding:"6px 14px",color:"#8090B0",fontSize:12,fontWeight:700,cursor:"pointer"}}>Close</button>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"20px 16px"}}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:40,marginBottom:8}}>👑</div>
              <div style={{fontSize:20,fontWeight:900,color:"#FFD700",marginBottom:4}}>Unlock everything.</div>
              <div style={{fontSize:13,color:"#8090B0",lineHeight:1.6}}>Features no other quit-smoking app offers.</div>
            </div>
            <div style={{fontSize:10,color:"#00D9AA",fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Voice Calls</div>
            <div style={{background:"linear-gradient(135deg,rgba(0,217,170,0.08),rgba(139,92,246,0.08))",border:"1px solid rgba(0,217,170,0.25)",borderRadius:14,padding:"16px 14px",marginBottom:10}}>
              <div style={{fontWeight:800,fontSize:14,color:"#F0EDF8",marginBottom:4}}>📞 AI Voice Calls</div>
              <div style={{color:"#8090B0",fontSize:12,marginBottom:12}}>Real phone call UI. Speaks Indian English or Hindi. Powered by Claude. No other quit app offers this.</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <button onClick={()=>{if(isPremium){setShowPremium(false);setPremiumScreen("coach_call");}}} style={{background:"rgba(0,217,170,0.15)",border:"1px solid rgba(0,217,170,0.3)",borderRadius:10,padding:"10px 8px",color:"#00D9AA",fontWeight:700,fontSize:12,cursor:"pointer",opacity:isPremium?1:0.5}}>🤖 Call AI Coach</button>
                <button onClick={()=>{if(isPremium){setShowPremium(false);setPremiumScreen("saksham_call");}}} style={{background:"rgba(255,101,52,0.15)",border:"1px solid rgba(255,101,52,0.3)",borderRadius:10,padding:"10px 8px",color:"#FF6534",fontWeight:700,fontSize:12,cursor:"pointer",opacity:isPremium?1:0.5}}>🧑 Call Saksham</button>
              </div>
            </div>
            <div style={{fontSize:10,color:"#00D9AA",fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10,marginTop:6}}>Chat</div>
            {[{icon:"🤖",color:"#00D9AA",title:"AI Quit Coach",desc:"24/7 chat that knows your journey. "+d+" days, score "+healthScore+", triggers.",screen:"coach"},{icon:"🧑",color:"#FF6534",title:"Chat with Saksham",desc:"DM the founder. "+founderDays+" days clean. 12 years. 2 packs/day. He responds.",screen:"saksham"},{icon:"💊",color:"#FFB800",title:"NRT Step-Down Calculator",desc:"Personalized nicotine patch plan based on Saksham own protocol.",screen:"nrt"}].map(({icon,color,title,desc,screen})=>(
              <div key={title} onClick={()=>{if(isPremium){setShowPremium(false);setPremiumScreen(screen);}}} style={{background:"#0E1128",border:"1px solid #1C2040",borderRadius:14,padding:"16px 14px",marginBottom:10,cursor:isPremium?"pointer":"default"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:44,height:44,borderRadius:12,background:color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{icon}</div>
                  <div style={{flex:1}}><div style={{fontWeight:800,fontSize:14,color:"#F0EDF8"}}>{title}</div><div style={{color:"#8090B0",fontSize:12,marginTop:2}}>{desc}</div></div>
                  {isPremium&&<span style={{color,fontSize:18}}>go</span>}
                </div>
              </div>
            ))}
            <div style={{fontSize:10,color:"#363D5C",fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10,marginTop:6}}>Coming soon</div>
            {[{icon:"🔮",title:"Craving Prediction Engine",desc:"AI warns you 30 min before your next high-risk window."},{icon:"🤝",title:"Accountability Partner",desc:"Get paired with a quitter at your exact day count."},{icon:"📜",title:"Milestone Certificates",desc:"Download real smoke-free certificates at 1 week, 1 month, 1 year."},{icon:"🧬",title:"Personalized DNA Recovery",desc:"Maps exactly what your body is repairing, based on how long you smoked."}].map(({icon,title,desc})=>(
              <div key={title} style={{background:"#0E1128",border:"1px solid #1C2040",borderRadius:14,padding:"14px",marginBottom:8,opacity:0.6,display:"flex",gap:12,alignItems:"flex-start"}}>
                <span style={{fontSize:20,flexShrink:0}}>{icon}</span>
                <div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}><div style={{fontWeight:700,fontSize:13,color:"#F0EDF8"}}>{title}</div><span style={{fontSize:9,color:"#363D5C",background:"#141730",padding:"2px 7px",borderRadius:20}}>SOON</span></div><div style={{color:"#8090B0",fontSize:12}}>{desc}</div></div>
              </div>
            ))}
            <div style={{marginTop:12,marginBottom:20}}>
              {!isPremium?(
                <div>
                  <div style={{background:"rgba(255,184,0,0.1)",border:"1px solid rgba(255,215,0,0.3)",borderRadius:14,padding:"20px 16px",marginBottom:12,textAlign:"center"}}>
                    <div style={{fontSize:28,fontWeight:900,color:"#FFD700",marginBottom:4}}>Rs 299<span style={{fontSize:14,fontWeight:400,color:"#8090B0"}}>/month</span></div>
                    <div style={{fontSize:12,color:"#8090B0"}}>or Rs 1,999/year — save 44%</div>
                  </div>
                  <button onClick={unlockPremium} style={{background:"linear-gradient(135deg,#FFD700,#FFB800)",color:"#07081A",border:"none",borderRadius:12,padding:14,fontWeight:900,fontSize:15,cursor:"pointer",width:"100%",marginBottom:8}}>👑 Unlock Premium</button>
                  <div style={{textAlign:"center",fontSize:11,color:"#363D5C"}}>Demo mode: tap to unlock all features</div>
                </div>
              ):(
                <div style={{background:"rgba(0,217,170,0.1)",border:"1px solid rgba(0,217,170,0.3)",borderRadius:14,padding:16,textAlign:"center"}}>
                  <div style={{fontWeight:800,color:"#00D9AA",fontSize:14}}>Premium active — tap any feature above</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
