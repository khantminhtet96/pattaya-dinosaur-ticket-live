import "./style.css";
import {createClient} from "@supabase/supabase-js";

const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const db=url&&key&&!url.includes("YOUR_")?createClient(url,key):null;
const state={tickets:JSON.parse(localStorage.getItem("ticket-counter-v2")||"[]"),editing:null};
let realtimeChannel=null;
const save=()=>localStorage.setItem("ticket-counter-v2",JSON.stringify(state.tickets));
const money=n=>new Intl.NumberFormat("th-TH",{style:"currency",currency:"THB",maximumFractionDigits:0}).format(Number(n)||0);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function toast(x){let e=document.querySelector(".toast");e.textContent=x;e.style.display="block";setTimeout(()=>e.style.display="none",1600)}
async function load(){
 if(db){
  const {data,error}=await db.from("tickets").select("*").order("created_at",{ascending:false});
  if(error){console.error(error);toast("Live database connection error");}
  if(data)state.tickets=data.map(x=>({id:x.id,name:x.name,price:Number(x.price),qty:x.total_quantity,image:x.image_url}));
  if(!realtimeChannel){
   realtimeChannel=db.channel("pattaya-dinosaur-kingdom-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"tickets"},payload=>{
      const row=payload.new||payload.old;
      if(payload.eventType==="INSERT"){
       const t={id:row.id,name:row.name,price:Number(row.price),qty:Number(row.total_quantity),image:row.image_url};
       if(!state.tickets.some(x=>x.id===t.id))state.tickets.unshift(t);
      }else if(payload.eventType==="UPDATE"){
       const i=state.tickets.findIndex(x=>x.id===row.id);
       const t={id:row.id,name:row.name,price:Number(row.price),qty:Number(row.total_quantity),image:row.image_url};
       if(i>=0)state.tickets[i]=t;else state.tickets.unshift(t);
      }else if(payload.eventType==="DELETE") state.tickets=state.tickets.filter(x=>x.id!==row.id);
      save(); render();
    }).subscribe();
  }
 }
 render();
}
async function remote(t,mode){
 if(!db){save();return true}
 const row={name:t.name,price:t.price,total_quantity:t.qty,image_url:t.image};
 let result;
 if(mode==="insert")result=await db.from("tickets").insert(row).select().single();
 if(mode==="update")result=await db.from("tickets").update(row).eq("id",t.id);
 if(mode==="delete")result=await db.from("tickets").delete().eq("id",t.id);
 if(result?.error){console.error(result.error);toast("Database save failed");return false}
 return true;
}
function shell(content,active="tickets"){
 document.querySelector("#app").innerHTML=`<main class="app"><aside class="sidebar">
 <div class="logo"><div class="dino">🦖</div><h1>PATTAYA<br>DINOSAUR KINGDOM</h1><small>TICKET MANAGEMENT</small></div>
 <nav class="nav">
 <button class="${active==="dashboard"?"active":""}" onclick="nav('dashboard')"><span>⌂</span>Dashboard</button>
 <button class="${active==="tickets"?"active":""}" onclick="nav('tickets')"><span>🎟️</span>Tickets</button>
 <button class="${active==="settings"?"active":""}" onclick="nav('settings')"><span>⚙️</span>Settings</button>
 <button class="${active==="backup"?"active":""}" onclick="nav('backup')"><span>💾</span>Backup</button>
</nav>
 <div class="sidequote">“More Than A Park<br>A Prehistoric Experience”</div></aside><section class="main">${content}</section><div class="toast"></div></main>`;
}
function render(){
 const types=state.tickets.length,qty=state.tickets.reduce((a,t)=>a+Number(t.qty||0),0),value=state.tickets.reduce((a,t)=>a+Number(t.qty||0)*Number(t.price||0),0);
 const now=new Date(),time=now.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}),date=now.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric"});
 shell(`<div class="top"><div></div><div class="clock"><div class="date">${date}</div><div class="time">${time}</div><div class="place">☀️ Pattaya, Thailand</div></div></div>
 <section class="hero"><div class="eyebrow">Pattaya Dinosaur Kingdom</div><h2>Ticket Management</h2><p>Manage your ticket types, quantities and prices</p></section>
 <div class="stats"><div class="stat glass" style="--glow:#ff4fa3"><div class="label">Total Ticket Types</div><div class="value">${types}</div></div><div class="stat glass" style="--glow:#6d55ff"><div class="label">Total Quantity</div><div class="value">${qty.toLocaleString()}</div></div><div class="stat glass" style="--glow:#ffc83d"><div class="label">Total Value</div><div class="value">${money(value)}</div></div></div>
 <div class="actionsTop"><button class="btn primary" onclick="add()">＋ Add Ticket</button></div>
 ${state.tickets.length?`<div class="grid">${state.tickets.map(card).join("")}</div>`:`<div class="glass empty">No tickets yet. Add your first ticket.</div>`}`);
}
function card(t){return `<article class="ticket glass">${t.image?`<img src="${esc(t.image)}" alt="">`:`<div class="placeholder">🎟️</div>`}<h3>${esc(t.name)}</h3><div class="price">${money(t.price)}</div><div class="qtylabel">QUANTITY</div><div class="qtybox"><button onclick="changeQty('${t.id}',-1)">−</button><input class="qtyinput" value="${t.qty}" type="number" min="0" onchange="setQty('${t.id}',this.value)"><button onclick="changeQty('${t.id}',1)">＋</button></div><div class="addrow"><input id="add-${t.id}" type="number" min="1" placeholder="Add quantity"><button onclick="addQty('${t.id}')">＋ Add</button></div><div class="cardactions"><button class="btn" onclick="edit('${t.id}')">✏️ Edit</button><button class="btn danger" onclick="del('${t.id}')">🗑️ Delete</button></div></article>`}
function form(){
 const t=state.editing?state.tickets.find(x=>x.id===state.editing):null;
 shell(`<section class="form glass"><h2>${t?"✏️ Edit Ticket":"＋ Add Ticket"}</h2><label>Ticket Name</label><input id="name" value="${esc(t?.name||"")}" placeholder="Entry Ticket"><label>Price (THB)</label><input id="price" type="number" min="0" value="${t?.price??""}" placeholder="500"><label>Quantity</label><input id="qty" type="number" min="0" value="${t?.qty??0}" placeholder="5"><label>Ticket Image</label><input id="file" type="file" accept="image/*">${t?.image?`<img class="preview" src="${esc(t.image)}">`:""}<div class="actionsTop" style="margin-top:16px"><button class="btn primary" onclick="saveTicket()">💾 Save</button></div></section>`);
}
function settingsView(){
 shell(`<section class="form glass"><div class="eyebrow">SYSTEM SETTINGS</div><h2>⚙️ Settings</h2>
 <label>Application Name</label><input id="appname" value="Pattaya Dinosaur Kingdom">
 <label>Currency</label><input value="THB" disabled>
 <div class="actionsTop" style="margin-top:16px"><button class="btn primary" onclick="saveSettings()">💾 Save Settings</button></div>
 <div class="note" style="margin-top:14px">ဒီနေရာကနေ Application Name ကို ပြင်ပြီး သိမ်းနိုင်ပါတယ်။</div></section>`,"settings");
}
function backupView(){
 const data=JSON.stringify(state.tickets,null,2);
 shell(`<section class="form glass"><div class="eyebrow">DATA MANAGEMENT</div><h2>💾 Backup</h2>
 <p class="sub">လက်ရှိ Ticket အချက်အလက်တွေကို Backup ဖိုင်အဖြစ် သိမ်းနိုင်ပါတယ်။</p>
 <div class="actions"><button class="btn primary" onclick="downloadBackup()">⬇️ Download Backup</button><button class="btn light" onclick="restoreBackup()">⬆️ Restore Backup</button></div>
 <div class="note">Backup ထဲမှာ Ticket အမည်၊ ပုံ၊ ဈေးနှုန်းနဲ့ အစောင်ရေ ပါဝင်ပါတယ်။</div></section>`,"backup");
}
window.nav=x=>{state.editing=null;if(x==="settings")settingsView();else if(x==="backup")backupView();else render()};
window.add=()=>{state.editing=null;form()};window.edit=id=>{state.editing=id;form()};
window.changeQty=async(id,d)=>{let t=state.tickets.find(x=>x.id===id);if(!t)return;t.qty=Math.max(0,Number(t.qty)+d);await remote(t,"update");render()};
window.setQty=async(id,v)=>{let t=state.tickets.find(x=>x.id===id);if(!t)return;t.qty=Math.max(0,Math.floor(Number(v)||0));await remote(t,"update");render()};
window.addQty=async id=>{let t=state.tickets.find(x=>x.id===id),e=document.querySelector("#add-"+id),n=Math.max(0,Math.floor(Number(e?.value)||0));if(!n)return toast("Enter quantity");t.qty+=n;await remote(t,"update");render();toast(`+${n} → ${t.qty}`)};
window.del=async id=>{let t=state.tickets.find(x=>x.id===id);if(!confirm(`${t.name} ကို ဖျက်မလား?`))return;await remote(t,"delete");state.tickets=state.tickets.filter(x=>x.id!==id);save();render();toast("Deleted")};
window.saveTicket=async()=>{const name=document.querySelector("#name").value.trim(),price=Number(document.querySelector("#price").value),qty=Math.max(0,Math.floor(Number(document.querySelector("#qty").value)||0)),file=document.querySelector("#file").files[0];if(!name||price<0)return toast("အချက်အလက်ပြည့်စုံစွာထည့်ပါ");let image=state.editing?state.tickets.find(x=>x.id===state.editing)?.image:"";if(file)image=await new Promise((res,rej)=>{let r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)});if(state.editing){let t=state.tickets.find(x=>x.id===state.editing);Object.assign(t,{name,price,qty,image});await remote(t,"update")}else{let t={id:crypto.randomUUID(),name,price,qty,image};if(db){await remote(t,"insert");await load()}else{state.tickets.unshift(t);save()}}state.editing=null;render();toast("Saved")};
window.saveSettings=()=>{const n=document.querySelector("#appname")?.value.trim();if(n){localStorage.setItem("ticket-app-name",n);toast("Settings saved")}};
window.downloadBackup=()=>{const blob=new Blob([JSON.stringify({version:"6.0",createdAt:new Date().toISOString(),tickets:state.tickets},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`ticket-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast("Backup downloaded")};
window.restoreBackup=()=>{const input=document.createElement("input");input.type="file";input.accept=".json,application/json";input.onchange=async()=>{const f=input.files?.[0];if(!f)return;try{const d=JSON.parse(await f.text());if(!Array.isArray(d.tickets))throw Error("invalid");state.tickets=d.tickets;save();if(db){for(const t of state.tickets)await remote(t,"update")}render();toast("Backup restored")}catch(e){toast("Backup file မမှန်ပါ")}};input.click()};
load();
