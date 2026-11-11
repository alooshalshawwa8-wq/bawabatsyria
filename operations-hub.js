/* OFOQ Operations Hub v1: local-only projects, tasks, ledger and backup. */
(function(){
"use strict";
if(window.__OFOQ_OPERATIONS_HUB_V1__)return;
const prior=window.openSection;
if(typeof prior!=="function"||prior.__ofoqOperationsWrapped)return;
window.__OFOQ_OPERATIONS_HUB_V1__=true;
const KEY="ofoq_operations_hub_v1";
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
const btn=(txt,fn,cls="oph-btn")=>{const b=el("button",cls,txt);b.type="button";b.addEventListener("click",fn);return b;};
const empty=()=>({version:1,projects:[],tasks:[],transactions:[]});
const clean=x=>({version:1,projects:x.projects.slice(-100),tasks:x.tasks.slice(-300),transactions:x.transactions.slice(-500)});
const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||"null");return x&&x.version===1&&Array.isArray(x.projects)&&Array.isArray(x.tasks)&&Array.isArray(x.transactions)?clean(x):empty();}catch(_){return empty();}};
const money=n=>Number(n).toLocaleString("en-US",{maximumFractionDigits:2});
const uid=()=>Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8);
function mount(){
const host=document.getElementById("specialTool");if(!host||host.querySelector(".oph-hub"))return;
let data=read();
const root=el("section","oph-hub"),style=el("style");
style.textContent=[
".oph-hub{margin:22px 0;padding:clamp(13px,2.5vw,22px);border:1px solid #347b83;border-radius:23px;background:radial-gradient(ellipse at 90% 0%,#16475b 0,transparent 43%),linear-gradient(145deg,#0b1d30,#101629);color:#eaf7fb;box-shadow:0 20px 55px #0006}",
".oph-head{padding:8px 4px 17px;border-bottom:1px solid #31566a}.oph-kicker{font-size:10px;letter-spacing:.16em;color:#83efdc;font-weight:900}.oph-head h2{font-size:clamp(22px,4vw,32px);margin:8px 0;color:#effffb}.oph-note{font-size:12px;line-height:1.9;color:#b4cad7}",
".oph-tabs,.oph-actions{display:flex;gap:8px;flex-wrap:wrap;margin:15px 0}.oph-btn,.oph-tab{border:1px solid #41677b;border-radius:11px;background:#102b40;color:#e5f8ff;padding:10px 13px;font:inherit;font-size:12px;cursor:pointer}.oph-tab[aria-selected=true]{background:linear-gradient(120deg,#087f86,#37bba8);color:#06272b;border-color:#8ef3df;font-weight:900}",
".oph-btn:focus-visible,.oph-tab:focus-visible,.oph-hub input:focus-visible,.oph-hub select:focus-visible{outline:2px solid #91f3df;outline-offset:2px}.oph-pane[hidden]{display:none}",
".oph-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.oph-field{display:grid;gap:6px;color:#c8dce6;font-size:12px}.oph-field input,.oph-field select{box-sizing:border-box;width:100%;min-width:0;border:1px solid #35586c;border-radius:10px;background:#071927;color:#fff;padding:11px;font:inherit}",
".oph-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:9px;margin:14px 0}.oph-metric{padding:13px;border:1px solid #2c5265;border-radius:13px;background:#0c2030;min-width:0}.oph-metric small{display:block;color:#9dbbc8;font-size:10px;margin-bottom:7px}.oph-metric strong{font-size:20px;color:#8ff0dd;overflow-wrap:anywhere}",
".oph-list{display:grid;gap:8px;margin:12px 0}.oph-item{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;padding:12px;border:1px solid #2b5062;border-radius:12px;background:#0b1e2c}.oph-item strong{display:block;font-size:13px}.oph-item small{display:block;color:#a9c3d0;font-size:11px;line-height:1.7;margin-top:4px}.oph-empty{padding:15px;border:1px dashed #426579;border-radius:12px;color:#a9c3d0;font-size:12px;text-align:center}.oph-status{min-height:22px;color:#8fead9;font-size:12px;line-height:1.8}.oph-danger{border-color:#8d5057;color:#ffd4d8}",
"@media(max-width:560px){.oph-hub{padding:13px}.oph-tabs .oph-tab{flex:1 1 42%}.oph-grid{grid-template-columns:1fr 1fr}.oph-item{display:grid}}",
"@media(prefers-reduced-motion:reduce){.oph-hub *{scroll-behavior:auto!important;transition:none!important}}"
].join("");
const head=el("header","oph-head");head.append(el("div","oph-kicker","OFOQ · BUSINESS OPERATIONS COMMAND"),el("h2","","مركز القيادة وإدارة الأعمال"),el("p","oph-note","لوحة واحدة للمشاريع والمهام والحركة المالية، مع روابط مباشرة إلى أدوات أُفُق. تُحفظ سجلاتك محلياً على هذا الجهاز ولا تُرسل إلى خادم."));
const metrics=el("div","oph-metrics"),tabs=el("div","oph-tabs"),panes=el("div",""),status=el("p","oph-status","");
tabs.setAttribute("role","tablist");tabs.setAttribute("aria-label","مساحات مركز القيادة");
const pane=id=>{const p=el("section","oph-pane");p.id="oph-pane-"+id;p.setAttribute("role","tabpanel");p.hidden=true;panes.append(p);return p;};
const activate=id=>{tabs.querySelectorAll('[role="tab"]').forEach(t=>{const on=t.dataset.pane===id;t.setAttribute("aria-selected",String(on));t.tabIndex=on?0:-1;});panes.querySelectorAll('[role="tabpanel"]').forEach(p=>p.hidden=p.id!=="oph-pane-"+id);};
const tab=(id,label)=>{const t=btn(label,()=>activate(id),"oph-tab");t.dataset.pane=id;t.setAttribute("role","tab");t.setAttribute("aria-controls","oph-pane-"+id);t.setAttribute("aria-selected","false");t.tabIndex=-1;t.addEventListener("keydown",e=>{const all=[...tabs.querySelectorAll('[role="tab"]')],i=all.indexOf(t);let n;if(e.key==="ArrowLeft")n=all[(i+1)%all.length];else if(e.key==="ArrowRight")n=all[(i-1+all.length)%all.length];else if(e.key==="Home")n=all[0];else if(e.key==="End")n=all[all.length-1];if(n){e.preventDefault();activate(n.dataset.pane);n.focus();}});tabs.append(t);};
const field=(p,label,name,type="text",opts=[])=>{const w=el("label","oph-field",label);let x;if(type==="select"){x=el("select");opts.forEach(([v,l])=>{const o=el("option","",l);o.value=v;x.append(o);});}else{x=el("input");x.type=type;if(type==="number"){x.min="0";x.step="any";}}x.name=name;w.append(x);p.append(w);return x;};
const actions=(p,...nodes)=>{const r=el("div","oph-actions");nodes.forEach(n=>r.append(n));p.append(r);};
const showEmpty=(p,msg)=>p.append(el("div","oph-empty",msg));
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(data));render();status.textContent="تم الحفظ محلياً.";return true;}catch(_){status.textContent="تعذر الحفظ؛ صدّر نسخة احتياطية.";return false;}};
const record=(title,detail,buttons)=>{const r=el("article","oph-item"),left=el("div","");left.append(el("strong","",title),el("small","",detail));r.append(left,buttons);return r;};
const metric=(label,value)=>{const m=el("div","oph-metric");m.append(el("small","",label),el("strong","",value));metrics.append(m);};
const projectList=el("div","oph-list"),taskList=el("div","oph-list"),txList=el("div","oph-list");
function render(){
metrics.replaceChildren();
const open=data.tasks.filter(x=>x.status!=="done").length,done=data.tasks.length-open;
const income=data.transactions.filter(x=>x.kind==="income").reduce((a,x)=>a+x.amount,0),expense=data.transactions.filter(x=>x.kind==="expense").reduce((a,x)=>a+x.amount,0);
metric("المشاريع النشطة",String(data.projects.filter(x=>x.status!=="done").length));metric("المهام المفتوحة",String(open));metric("المهام المنجزة",String(done));metric("الإيرادات المسجلة",money(income));metric("المصروفات المسجلة",money(expense));metric("صافي الحركة",money(income-expense));
projectList.replaceChildren();if(!data.projects.length)showEmpty(projectList,"لا توجد مشاريع بعد.");
data.projects.slice().reverse().forEach(x=>{const a=el("div","oph-actions");a.append(btn(x.status==="done"?"إعادة فتح":"إنجاز",()=>{x.status=x.status==="done"?"active":"done";persist();}),btn("حذف",()=>{if(confirm("حذف المشروع؟")){data.projects=data.projects.filter(y=>y.id!==x.id);persist();}},"oph-btn oph-danger"));projectList.append(record(x.name,(x.owner||"دون مسؤول")+" · "+x.status+" · "+new Date(x.createdAt).toLocaleDateString(),a));});
taskList.replaceChildren();if(!data.tasks.length)showEmpty(taskList,"لا توجد مهام مسجلة.");
data.tasks.slice().reverse().forEach(x=>{const a=el("div","oph-actions");a.append(btn(x.status==="done"?"إعادة فتح":"تمت",()=>{x.status=x.status==="done"?"open":"done";persist();}),btn("حذف",()=>{data.tasks=data.tasks.filter(y=>y.id!==x.id);persist();},"oph-btn oph-danger"));taskList.append(record(x.title,x.project+" · "+x.priority+" · "+(x.due||"بلا موعد"),a));});
txList.replaceChildren();if(!data.transactions.length)showEmpty(txList,"دفتر الحركة المالية فارغ.");
data.transactions.slice().reverse().forEach(x=>{const a=el("div","oph-actions");a.append(btn("حذف",()=>{data.transactions=data.transactions.filter(y=>y.id!==x.id);persist();},"oph-btn oph-danger"));txList.append(record((x.kind==="income"?"إيراد + ":"مصروف − ")+money(x.amount),x.category+" · "+x.note+" · "+x.date,a));});
}
tab("overview","◈ الملخص");tab("projects","▣ المشاريع");tab("tasks","✓ المهام");tab("ledger","＄ الدفتر المالي");tab("backup","⇧ النسخ الاحتياطي");
const overview=pane("overview");overview.append(el("h3","","نبض الأعمال"),el("p","oph-note","المؤشرات مبنية على السجلات التي تدخلها هنا، ولا تُستورد تلقائياً من الأقسام الأخرى."));
const quick=el("div","oph-grid");overview.append(quick);
[["ecommerce_studio","استوديو المتجر"],["accounting_vip","المحاسبة والمخزون"],["jobs","الوظائف والسيرة الذاتية"],["freelance_vip","العمل الحر"],["trading_academy","أكاديمية التداول"],["personal_finance","التخطيط المالي"]].forEach(([id,label])=>quick.append(btn("فتح "+label,()=>{const s=(window.BAWABA_SECTIONS||[]).find(x=>x.id===id);if(s&&window.openSection)window.openSection(s);})));
const projects=pane("projects");projects.append(el("h3","","إدارة المشاريع"));const pg=el("div","oph-grid");projects.append(pg);
const pf={name:field(pg,"اسم المشروع","pname"),owner:field(pg,"المسؤول / الجهة","powner"),state:field(pg,"الحالة","pstate","select",[["active","نشط"],["paused","متوقف مؤقتاً"],["done","مكتمل"]])};
projects.append(projectList);actions(projects,btn("إضافة مشروع",()=>{const name=pf.name.value.trim();if(!name){status.textContent="اكتب اسم المشروع أولاً.";return;}if(data.projects.length>=100){status.textContent="الحد الأقصى 100 مشروع.";return;}data.projects.push({id:uid(),name:name.slice(0,100),owner:pf.owner.value.trim().slice(0,80),status:pf.state.value,createdAt:new Date().toISOString()});pf.name.value="";persist();}));
const tasks=pane("tasks");tasks.append(el("h3","","إدارة المهام والمتابعة"));const tg=el("div","oph-grid");tasks.append(tg);
const tf={title:field(tg,"وصف المهمة","ttitle"),project:field(tg,"المشروع / المجال","tproject"),due:field(tg,"تاريخ الاستحقاق","tdue","date"),priority:field(tg,"الأولوية","tpriority","select",[["عادية","عادية"],["مهمة","مهمة"],["عاجلة","عاجلة"]])};
tasks.append(taskList);actions(tasks,btn("إضافة مهمة",()=>{const title=tf.title.value.trim();if(!title){status.textContent="اكتب وصف المهمة أولاً.";return;}if(data.tasks.length>=300){status.textContent="الحد الأقصى 300 مهمة.";return;}data.tasks.push({id:uid(),title:title.slice(0,160),project:tf.project.value.trim().slice(0,100)||"عام",due:tf.due.value||"",priority:tf.priority.value,status:"open",createdAt:new Date().toISOString()});tf.title.value="";persist();}));
const ledger=pane("ledger");ledger.append(el("h3","","دفتر الإيرادات والمصروفات"),el("p","oph-note","سجل تشغيلي مبسط، لا يمثل نظاماً محاسبياً قانونياً ولا يستبدل مراجعة الفواتير والضرائب."));
const lg=el("div","oph-grid");ledger.append(lg);const lf={kind:field(lg,"نوع الحركة","lkind","select",[["income","إيراد"],["expense","مصروف"]]),amount:field(lg,"المبلغ","lamount","number"),category:field(lg,"التصنيف","lcat"),date:field(lg,"التاريخ","ldate","date"),note:field(lg,"ملاحظة","lnote")};
ledger.append(txList);actions(ledger,btn("تسجيل الحركة",()=>{const n=Number(lf.amount.value);if(!lf.amount.value||!Number.isFinite(n)||n<=0||n>1e12){status.textContent="أدخل مبلغاً موجباً لا يتجاوز 1,000,000,000,000.";return;}if(data.transactions.length>=500){status.textContent="الحد الأقصى 500 حركة.";return;}data.transactions.push({id:uid(),kind:lf.kind.value,amount:n,category:lf.category.value.trim().slice(0,80)||"غير مصنف",date:lf.date.value||new Date().toISOString().slice(0,10),note:lf.note.value.trim().slice(0,160)});lf.amount.value="";persist();}));
const backup=pane("backup");backup.append(el("h3","","نسخ البيانات واستعادتها"),el("p","oph-note","تشمل النسخة المشاريع والمهام والحركات المالية. احتفظ بها في مكان آمن؛ فقد تحتوي معلومات تجارية ومالية."));
const importFile=el("input","");importFile.type="file";importFile.accept=".json,application/json";importFile.hidden=true;
actions(backup,btn("تنزيل نسخة JSON",()=>{const blob=new Blob([JSON.stringify({app:"ofoq-operations-hub",version:1,exportedAt:new Date().toISOString(),data},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=el("a");a.href=url;a.download="ofoq-operations-backup.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent="تم تجهيز النسخة الاحتياطية.";}),btn("استيراد نسخة JSON",()=>importFile.click()));
backup.append(importFile);
importFile.addEventListener("change",async()=>{const file=importFile.files&&importFile.files[0];if(!file)return;try{if(file.size>1024*1024)throw new Error("الملف يتجاوز 1 ميغابايت.");const raw=JSON.parse(await file.text()),d=raw&&raw.data;if(!raw||raw.app!=="ofoq-operations-hub"||raw.version!==1||!d||!Array.isArray(d.projects)||!Array.isArray(d.tasks)||!Array.isArray(d.transactions))throw new Error("صيغة النسخة غير متوافقة.");if(d.projects.length>100||d.tasks.length>300||d.transactions.length>500)throw new Error("تجاوزت النسخة حدود السجلات.");if(!d.projects.every(x=>x&&typeof x.name==="string"&&x.name.length<=100&&["active","paused","done"].includes(x.status)))throw new Error("بيانات المشاريع غير صالحة.");if(!d.tasks.every(x=>x&&typeof x.title==="string"&&x.title.length<=160&&["open","done"].includes(x.status)))throw new Error("بيانات المهام غير صالحة.");if(!d.transactions.every(x=>x&&["income","expense"].includes(x.kind)&&Number.isFinite(x.amount)&&x.amount>0&&x.amount<=1e12&&typeof x.category==="string"))throw new Error("بيانات الدفتر المالي غير صالحة.");if(!confirm("سيستبدل الاستيراد بيانات مركز القيادة الحالية. هل تريد المتابعة؟"))return;data=clean(d);persist();status.textContent="تمت استعادة النسخة الاحتياطية.";}catch(e){status.textContent="تعذر الاستيراد: "+(e.message||"ملف غير صالح.");}finally{importFile.value="";}});
root.append(style,head,metrics,tabs,panes,status);host.append(root);render();activate("overview");
}
const wrapped=async function(sec){await prior(sec);if(sec&&(sec.id==="business"||sec.id==="startup_lab"))mount(sec);};
wrapped.__ofoqOperationsWrapped=true;window.openSection=wrapped;
})();