/* OFOQ Operations Hub v2: local-first operations with opt-in private cloud snapshots. */
(function(){
"use strict";
if(window.__OFOQ_OPERATIONS_HUB_V1__)return;
const prior=window.openSection;
if(typeof prior!=="function"||prior.__ofoqOperationsWrapped)return;
window.__OFOQ_OPERATIONS_HUB_V1__=true;
const KEY="ofoq_operations_hub_v1";
const SOURCE_KEYS={
stock:"bawabatsyria_stock_v1",
trade:"bawabatsyria_trade_ledger_v1",
expenses:"bawabatsyria_trade_expenses_v1",
settlements:"bawabatsyria_trade_settlements_v1",
invoiceNumbers:"bawabatsyria_trade_invoice_numbers_v1",
parties:"bawabatsyria_trade_parties_v1",
career:"ofoq_career_applications_v1",
ecommerceScenarios:"ofoq_ecommerce_scenarios_v1",
commerceProducts:"ofoq_ecommerce_products_v1",
commerceOrders:"ofoq_ecommerce_orders_v1"
};
const ARCHIVE_KEY="ofoq_operations_recovery_archive_v1";
const RECOVERY_KEY="ofoq_operations_hub_recovery_v1";
const readSource=(key,valid,limit=20000)=>{
try{const raw=localStorage.getItem(key);if(!raw)return[];const value=JSON.parse(raw);if(!Array.isArray(value))return[];return value.filter(valid).slice(-limit);}catch(_){return[];}
};
const sourceSnapshot=()=>({
capturedAt:new Date().toISOString(),
stock:readSource(SOURCE_KEYS.stock,x=>x&&typeof x.name==="string"&&Number.isFinite(Number(x.qty))&&Number(x.qty)>=0,10000),
trade:readSource(SOURCE_KEYS.trade,x=>x&&typeof x.id==="string"&&["sale","purchase"].includes(x.type)&&Number.isFinite(Number(x.total))&&Number(x.total)>=0,20000),
expenses:readSource(SOURCE_KEYS.expenses,x=>x&&typeof x.id==="string"&&Number.isFinite(Number(x.amount))&&Number(x.amount)>0,20000),
settlements:readSource(SOURCE_KEYS.settlements,x=>x&&typeof x.transactionId==="string"&&Number.isFinite(Number(x.amount))&&Number(x.amount)>0,20000),
parties:readSource(SOURCE_KEYS.parties,x=>x&&typeof x.name==="string",10000),
career:readSource(SOURCE_KEYS.career,x=>x&&typeof x.id==="string",100),
ecommerceScenarios:readSource(SOURCE_KEYS.ecommerceScenarios,x=>x&&typeof x==="object",100),
commerceProducts:readSource(SOURCE_KEYS.commerceProducts,x=>x&&typeof x.id==="string"&&typeof x.name==="string"&&Number.isFinite(Number(x.price))&&Number.isFinite(Number(x.stock)),500),
commerceOrders:readSource(SOURCE_KEYS.commerceOrders,x=>x&&typeof x.id==="string"&&typeof x.orderNo==="string"&&Number.isFinite(Number(x.total))&&Number.isInteger(Number(x.qty)),1000),
invoiceNumbers:(()=>{try{const x=JSON.parse(localStorage.getItem(SOURCE_KEYS.invoiceNumbers)||"{}");return x&&typeof x==="object"&&!Array.isArray(x)?x:{};}catch(_){return {};}})()
});
const sourceTotals=s=>{
const sales=s.trade.filter(x=>x.type==="sale").reduce((n,x)=>n+Number(x.total||0),0);
const purchases=s.trade.filter(x=>x.type==="purchase").reduce((n,x)=>n+Number(x.total||0),0);
const expenses=s.expenses.reduce((n,x)=>n+Number(x.amount||0),0);
const units=s.stock.reduce((n,x)=>n+Number(x.qty||0),0);
const commerceUnits=s.commerceProducts.reduce((n,x)=>n+Number(x.stock||0),0);
const commerceOrderValue=s.commerceOrders.filter(x=>x.status!=="cancelled").reduce((n,x)=>n+Number(x.total||0),0);
return {sales,purchases,expenses,units,commerceUnits,commerceOrderValue};
};

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
const head=el("header","oph-head");head.append(el("div","oph-kicker","OFOQ · BUSINESS OPERATIONS COMMAND"),el("h2","","مركز القيادة وإدارة الأعمال"),el("p","oph-note","لوحة واحدة للمشاريع والمهام والحركة المالية، مع روابط مباشرة إلى أدوات أُفُق. تعمل محلياً افتراضياً؛ ولا تُرسل أي بيانات إلى السحابة إلا عند تسجيل الدخول والضغط الصريح على إنشاء نسخة احتياطية."));
const metrics=el("div","oph-metrics"),tabs=el("div","oph-tabs"),panes=el("div",""),status=el("p","oph-status","");
tabs.setAttribute("role","tablist");tabs.setAttribute("aria-label","مساحات مركز القيادة");
const pane=id=>{const p=el("section","oph-pane");p.id="oph-pane-"+id;p.setAttribute("role","tabpanel");p.hidden=true;panes.append(p);return p;};
const activate=id=>{tabs.querySelectorAll('[role="tab"]').forEach(t=>{const on=t.dataset.pane===id;t.setAttribute("aria-selected",String(on));t.tabIndex=on?0:-1;});panes.querySelectorAll('[role="tabpanel"]').forEach(p=>p.hidden=p.id!=="oph-pane-"+id);};
const tab=(id,label)=>{const t=btn(label,()=>activate(id),"oph-tab");t.dataset.pane=id;t.setAttribute("role","tab");t.setAttribute("aria-controls","oph-pane-"+id);t.setAttribute("aria-selected","false");t.tabIndex=-1;t.addEventListener("keydown",e=>{const all=[...tabs.querySelectorAll('[role="tab"]')],i=all.indexOf(t);let n;if(e.key==="ArrowLeft")n=all[(i+1)%all.length];else if(e.key==="ArrowRight")n=all[(i-1+all.length)%all.length];else if(e.key==="Home")n=all[0];else if(e.key==="End")n=all[all.length-1];if(n){e.preventDefault();activate(n.dataset.pane);n.focus();}});tabs.append(t);};
const field=(p,label,name,type="text",opts=[])=>{const w=el("label","oph-field",label);let x;if(type==="select"){x=el("select");opts.forEach(([v,l])=>{const o=el("option","",l);o.value=v;x.append(o);});}else{x=el("input");x.type=type;if(type==="number"){x.min="0";x.step="any";}}x.name=name;w.append(x);p.append(w);return x;};
const actions=(p,...nodes)=>{const r=el("div","oph-actions");nodes.forEach(n=>r.append(n));p.append(r);};
const showEmpty=(p,msg)=>p.append(el("div","oph-empty",msg));
const persist=()=>{
 let previous=null;
 try{previous=localStorage.getItem(KEY);}catch(_){status.textContent="تعذر قراءة السجل السابق؛ لم يتم اعتماد التغيير.";return false;}
 const rollback=()=>{try{data=previous===null?empty():clean(JSON.parse(previous));}catch(_){data=empty();}render();};
 if(previous!==null){try{localStorage.setItem(RECOVERY_KEY,JSON.stringify({savedAt:new Date().toISOString(),data:JSON.parse(previous)}));}catch(_){rollback();status.textContent="تعذر إنشاء نقطة الاستعادة؛ أُعيدت البيانات إلى حالتها السابقة.";return false;}}
 try{localStorage.setItem(KEY,JSON.stringify(data));render();status.textContent="تم الحفظ مع نقطة استعادة محلية.";return true;}
 catch(_){rollback();status.textContent="تعذر الحفظ؛ أُعيدت البيانات إلى الحالة السابقة. صدّر نسخة احتياطية.";return false;}
};
const record=(title,detail,buttons)=>{const r=el("article","oph-item"),left=el("div","");left.append(el("strong","",title),el("small","",detail));r.append(left,buttons);return r;};
const metric=(label,value)=>{const m=el("div","oph-metric");m.append(el("small","",label),el("strong","",value));metrics.append(m);};
const projectList=el("div","oph-list"),taskList=el("div","oph-list"),txList=el("div","oph-list");
function render(){
metrics.replaceChildren();
const open=data.tasks.filter(x=>x.status!=="done").length,done=data.tasks.length-open;
const income=data.transactions.filter(x=>x.kind==="income").reduce((a,x)=>a+x.amount,0),expense=data.transactions.filter(x=>x.kind==="expense").reduce((a,x)=>a+x.amount,0);
metric("المشاريع النشطة",String(data.projects.filter(x=>x.status!=="done").length));metric("المهام المفتوحة",String(open));metric("المهام المنجزة",String(done));metric("الإيرادات المسجلة",money(income));metric("المصروفات المسجلة",money(expense));metric("صافي الحركة",money(income-expense));const imported=sourceSnapshot(),totals=sourceTotals(imported);metric("أصناف المخزون",String(imported.stock.length));metric("المبيعات من الدفتر",money(totals.sales));metric("المشتريات من الدفتر",money(totals.purchases));metric("مصروفات المحاسبة",money(totals.expenses));metric("طلبات التوظيف",String(imported.career.length));metric("منتجات المتجر",String(imported.commerceProducts.length));metric("طلبات المتجر",String(imported.commerceOrders.length));metric("قيمة الطلبات غير الملغاة",money(totals.commerceOrderValue));
projectList.replaceChildren();if(!data.projects.length)showEmpty(projectList,"لا توجد مشاريع بعد.");
data.projects.slice().reverse().forEach(x=>{const a=el("div","oph-actions");a.append(btn(x.status==="done"?"إعادة فتح":"إنجاز",()=>{x.status=x.status==="done"?"active":"done";persist();}),btn("حذف",()=>{if(confirm("حذف المشروع؟")){data.projects=data.projects.filter(y=>y.id!==x.id);persist();}},"oph-btn oph-danger"));projectList.append(record(x.name,(x.owner||"دون مسؤول")+" · "+x.status+" · "+new Date(x.createdAt).toLocaleDateString(),a));});
taskList.replaceChildren();if(!data.tasks.length)showEmpty(taskList,"لا توجد مهام مسجلة.");
data.tasks.slice().reverse().forEach(x=>{const a=el("div","oph-actions");a.append(btn(x.status==="done"?"إعادة فتح":"تمت",()=>{x.status=x.status==="done"?"open":"done";persist();}),btn("حذف",()=>{data.tasks=data.tasks.filter(y=>y.id!==x.id);persist();},"oph-btn oph-danger"));taskList.append(record(x.title,x.project+" · "+x.priority+" · "+(x.due||"بلا موعد"),a));});
txList.replaceChildren();if(!data.transactions.length)showEmpty(txList,"دفتر الحركة المالية فارغ.");
data.transactions.slice().reverse().forEach(x=>{const a=el("div","oph-actions");a.append(btn("حذف",()=>{data.transactions=data.transactions.filter(y=>y.id!==x.id);persist();},"oph-btn oph-danger"));txList.append(record((x.kind==="income"?"إيراد + ":"مصروف − ")+money(x.amount),x.category+" · "+x.note+" · "+x.date,a));});
}
tab("overview","◈ الملخص");tab("projects","▣ المشاريع");tab("tasks","✓ المهام");tab("ledger","＄ الدفتر المالي");tab("linked","⇄ البيانات المرتبطة");tab("backup","⇧ النسخ الاحتياطي");
const overview=pane("overview");overview.append(el("h3","","نبض الأعمال"),el("p","oph-note","تعرض المؤشرات سجلات مركز القيادة إلى جانب ملخصات قراءة مباشرة من دفاتر المتجر والمحاسبة والمسار المهني. السجلات المستوردة للعرض فقط ولا تُنسخ إلى دفترك المحلي لتجنب تضخيم الأرقام."));
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
const linked=pane("linked");linked.append(el("h3","","مزامنة مصادر أُفُق"),el("p","oph-note","قراءة مباشرة من التخزين المحلي للأدوات المتصلة. لا يتم تعديل المصدر أو نقل السجلات أو تكرارها في دفتر مركز القيادة. افتح الأداة المصدر ثم اضغط تحديث لقراءة أحدث بياناتها."));
const linkedSummary=el("div","oph-metrics"),linkedList=el("div","oph-list");
const renderLinked=()=>{
const snap=sourceSnapshot(),totals=sourceTotals(snap);linkedSummary.replaceChildren();linkedList.replaceChildren();
[[ "أصناف المخزون",snap.stock.length],["وحدات المخزون",money(totals.units)],["عمليات البيع",snap.trade.filter(x=>x.type==="sale").length],["عمليات الشراء",snap.trade.filter(x=>x.type==="purchase").length],["المصروفات",snap.expenses.length],["التحصيلات والتسديدات",snap.settlements.length],["ملفات العملاء والموردين",snap.parties.length],["طلبات التوظيف",snap.career.length],["سيناريوهات التسعير",snap.ecommerceScenarios.length],["منتجات المتجر",snap.commerceProducts.length],["طلبات المتجر",snap.commerceOrders.length],["أرقام الفواتير",Object.keys(snap.invoiceNumbers).length]].forEach(([label,value])=>{const m=el("div","oph-metric");m.append(el("small","",label),el("strong","",String(value)));linkedSummary.append(m);});
const add=(title,detail)=>linkedList.append(el("article","oph-item",""),el("small","",detail));
const rows=[
["المخزون",snap.stock.length+" صنف · "+money(totals.units)+" وحدة · المصدر: دفتر المخزون"],
["المبيعات والمشتريات",snap.trade.length+" عملية · مبيعات "+money(totals.sales)+" · مشتريات "+money(totals.purchases)],
["الفواتير",Object.keys((()=>{try{return JSON.parse(localStorage.getItem(SOURCE_KEYS.invoiceNumbers)||"{}")||{};}catch(_){return {};}})()).length+" رقم فاتورة مرتبط بمعاملات الدفتر"],
["المصروفات",snap.expenses.length+" سجل · إجمالي "+money(totals.expenses)],
["التحصيلات والتسديدات",snap.settlements.length+" حركة مرتبطة بمعرّفات المعاملات"],
["العملاء والموردون",snap.parties.length+" ملف طرف محفوظ"],
["طلبات المسار المهني",snap.career.length+" طلب توظيف محفوظ"],
["كتالوج المتجر",snap.commerceProducts.length+" منتج محلي · "+money(snap.commerceProducts.reduce((n,x)=>n+Number(x.stock||0),0))+" وحدة مسجلة"],
["طلبات المتجر",snap.commerceOrders.length+" طلب محلي · "+money(snap.commerceOrders.reduce((n,x)=>n+Number(x.total||0),0))+" قيمة إجمالية مسجلة؛ لا تمثل مدفوعات مؤكدة"],
["استوديو المتجر",snap.ecommerceScenarios.length+" سيناريو تسعير محفوظ"]
];
rows.forEach(([title,detail])=>{const r=el("article","oph-item");r.append(el("div","",""),el("small","",detail));r.firstChild.append(el("strong","",title));linkedList.append(r);});
};
linked.append(linkedSummary,linkedList);actions(linked,btn("تحديث البيانات الآن",()=>{render();renderLinked();status.textContent="تم تحديث لوحة القيادة ومصادرها دون تعديل السجلات الأصلية.";}));
const backup=pane("backup");backup.append(el("h3","","نسخ البيانات واستعادتها"),el("p","oph-note","تتضمن النسخة بيانات مركز القيادة ولقطة مؤرخة من المخزون والمبيعات والفواتير والمصروفات والتحصيلات والعملاء وطلبات العمل وكتالوج المنتجات والطلبات المحلية. اللقطة أرشيف مستقل ولا تستبدل بيانات الأدوات الأصلية عند الاستيراد."));
const importFile=el("input","");importFile.type="file";importFile.accept=".json,application/json";importFile.hidden=true;
actions(backup,btn("تنزيل نسخة JSON",()=>{const blob=new Blob([JSON.stringify({app:"ofoq-operations-hub",version:2,exportedAt:new Date().toISOString(),data,linkedSources:sourceSnapshot()},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=el("a");a.href=url;a.download="ofoq-complete-operations-backup.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent="تم تجهيز النسخة الاحتياطية.";}),btn("استيراد نسخة JSON",()=>importFile.click()));
backup.append(importFile);

const cloudPanel=el("section","oph-cloud-panel");
cloudPanel.style.cssText="margin-top:18px;padding:15px;border:1px solid #347b83;border-radius:15px;background:#081a29";
cloudPanel.append(el("h3","","الخزنة السحابية الخاصة"),el("p","oph-note","نسخ احتياطي اختياري لحسابك فقط؛ يحتفظ النظام بآخر 20 نسخة لكل حساب، وتشمل اللقطة كتالوج المنتجات والطلبات المحلية. لا توجد مزامنة تلقائية. استخدم بريدك وكلمة مرور حساب أُفُق، ثم اضغط إنشاء نسخة بنفسك. لا تُخزّن كلمة المرور في الموقع؛ تحفظ جلسة الدخول مؤقتاً في علامة التبويب."));
const authGrid=el("div","oph-grid");
const cloudEmail=field(authGrid,"البريد الإلكتروني","cloud-email","email");
cloudEmail.autocomplete="email";cloudEmail.inputMode="email";
const cloudPassword=field(authGrid,"كلمة المرور","cloud-password","password");
cloudPassword.autocomplete="current-password";cloudPassword.minLength=8;
cloudPanel.append(authGrid);
const cloudStatus=el("p","oph-status","");
const cloudUser=el("p","oph-note","غير مسجل الدخول");
const cloudList=el("div","oph-list");
const cloudSessionKey="ofoq_cloud_backup_session_v1";
const cloudBase=String(window.BAWABA_SUPABASE_URL||"").replace(/\/$/,"");
const cloudAnon=String(window.BAWABA_SUPABASE_ANON_KEY||"");
const readCloudSession=()=>{try{return JSON.parse(sessionStorage.getItem(cloudSessionKey)||"null");}catch(_){return null;}};
const saveCloudSession=s=>{try{sessionStorage.setItem(cloudSessionKey,JSON.stringify({access_token:s.access_token,refresh_token:s.refresh_token,user:{id:s.user&&s.user.id,email:s.user&&s.user.email}}));return true;}catch(_){return false;}};
const clearCloudSession=()=>{try{sessionStorage.removeItem(cloudSessionKey);}catch(_){}};
const cloudAuth=async(path,body)=>{
 if(!cloudBase||!cloudAnon)throw new Error("إعداد الاتصال السحابي غير مكتمل.");
 const response=await fetch(cloudBase+"/auth/v1"+path,{method:"POST",headers:{"apikey":cloudAnon,"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(result.msg||result.message||result.error_description||result.error||"تعذر إكمال طلب الحساب.");
 return result;
};
const refreshCloudSession=async()=>{
 const s=readCloudSession();if(!s||!s.refresh_token)throw new Error("انتهت جلسة الدخول؛ سجّل الدخول مجدداً.");
 const fresh=await cloudAuth("/token?grant_type=refresh_token",{refresh_token:s.refresh_token});
 if(!fresh.access_token||!saveCloudSession(fresh))throw new Error("تعذر تحديث جلسة الدخول.");
 return readCloudSession();
};
const cloudRequest=async(path,options={},retry=true)=>{
 let s=readCloudSession();if(!s||!s.access_token)throw new Error("سجّل الدخول أولاً.");
 const headers=Object.assign({"apikey":cloudAnon,"Authorization":"Bearer "+s.access_token,"Content-Type":"application/json"},options.headers||{});
 let response=await fetch(cloudBase+path,Object.assign({},options,{headers,cache:"no-store"}));
 if(response.status===401&&retry){s=await refreshCloudSession();return cloudRequest(path,options,false);}
 const raw=await response.text();let result={};try{result=raw?JSON.parse(raw):{};}catch(_){result={message:raw};}
 if(!response.ok)throw new Error(result.message||result.msg||result.error_description||"تعذر الوصول إلى الخزنة السحابية ("+response.status+").");
 return result;
};
const setCloudStatus=message=>{cloudStatus.textContent=message;};
const backupPayload=()=>({app:"ofoq-operations-hub",version:2,exportedAt:new Date().toISOString(),data:clean(data),linkedSources:sourceSnapshot()});
const validCloudBackup=p=>{
 const d=p&&p.data;
 if(!p||p.app!=="ofoq-operations-hub"||![1,2].includes(p.version)||!d||!Array.isArray(d.projects)||!Array.isArray(d.tasks)||!Array.isArray(d.transactions))return false;
 if(d.projects.length>100||d.tasks.length>300||d.transactions.length>500)return false;
 if(!d.projects.every(x=>x&&typeof x.name==="string"&&x.name.length<=100&&["active","paused","done"].includes(x.status)))return false;
 if(!d.tasks.every(x=>x&&typeof x.title==="string"&&x.title.length<=160&&["open","done"].includes(x.status)))return false;
 if(!d.transactions.every(x=>x&&["income","expense"].includes(x.kind)&&Number.isFinite(x.amount)&&x.amount>0&&x.amount<=1e12&&typeof x.category==="string"))return false;
 const ls=p.linkedSources;
 return !ls||(Array.isArray(ls.stock)&&Array.isArray(ls.trade)&&Array.isArray(ls.expenses)&&Array.isArray(ls.settlements)&&ls.stock.length<=10000&&ls.trade.length<=20000&&ls.expenses.length<=20000&&ls.settlements.length<=20000&&(!ls.commerceProducts||(Array.isArray(ls.commerceProducts)&&ls.commerceProducts.length<=500&&ls.commerceProducts.every(x=>x&&typeof x.id==="string"&&typeof x.name==="string"&&Number.isFinite(Number(x.price))&&Number(x.price)>=0&&Number.isFinite(Number(x.stock))&&Number(x.stock)>=0)))&&(!ls.commerceOrders||(Array.isArray(ls.commerceOrders)&&ls.commerceOrders.length<=1000&&ls.commerceOrders.every(x=>x&&typeof x.id==="string"&&typeof x.orderNo==="string"&&Number.isFinite(Number(x.total))&&Number(x.total)>=0&&Number.isInteger(Number(x.qty))&&Number(x.qty)>0&&["new","processing","shipped","delivered","cancelled"].includes(x.status)))));
};
const loadCloudBackups=async()=>{
 cloudList.replaceChildren();
 const rows=await cloudRequest("/rest/v1/user_workspace_backups?select=id,label,backup_type,schema_version,created_at&order=created_at.desc&limit=20");
 if(!Array.isArray(rows)||!rows.length){showEmpty(cloudList,"لا توجد نسخ سحابية بعد.");return;}
 rows.forEach(item=>{
  const actionsBox=el("div","oph-actions");
  actionsBox.append(btn("استعادة",async()=>{
   if(!confirm("ستُستبدل بيانات مركز القيادة المحلي بالنسخة المختارة، مع حفظ نقطة استعادة محلية أولاً. لن تُستبدل دفاتر الأدوات الأصلية. هل تريد المتابعة؟"))return;
   try{
    const found=await cloudRequest("/rest/v1/user_workspace_backups?id=eq."+encodeURIComponent(item.id)+"&select=payload&limit=1");
    const payload=Array.isArray(found)&&found[0]&&found[0].payload;
    if(!validCloudBackup(payload))throw new Error("النسخة غير صالحة أو لا تتوافق مع إصدار مركز القيادة.");
    if(payload.version===2&&payload.linkedSources){try{localStorage.setItem(ARCHIVE_KEY,JSON.stringify({archivedAt:new Date().toISOString(),linkedSources:payload.linkedSources}));}catch(_){throw new Error("تعذر حفظ أرشيف المصادر؛ لم تُستبدل بيانات مركز القيادة.");}}
    data=clean(payload.data);if(!persist())throw new Error("تعذر حفظ الاستعادة محلياً؛ تحقق من المساحة المتاحة.");
    setCloudStatus("تمت الاستعادة بنجاح. بقيت بيانات الأدوات الأصلية دون تعديل.");
   }catch(e){setCloudStatus("تعذرت الاستعادة: "+(e.message||"خطأ غير معروف."));}
  }),btn("حذف",async()=>{
   if(!confirm("حذف هذه النسخة السحابية نهائياً؟"))return;
   try{await cloudRequest("/rest/v1/user_workspace_backups?id=eq."+encodeURIComponent(item.id),{method:"DELETE"});setCloudStatus("تم حذف النسخة.");await loadCloudBackups();}
   catch(e){setCloudStatus("تعذر الحذف: "+e.message);}
  },"oph-btn oph-danger"));
  const date=new Date(item.created_at).toLocaleString();
  cloudList.append(record(item.label||"نسخة مركز القيادة",date+" · نسخة خاصة بحسابك",actionsBox));
 });
};
const updateCloudState=()=>{
 const s=readCloudSession();
 cloudUser.textContent=s&&s.user&&s.user.email?"متصل بالحساب: "+s.user.email:"غير مسجل الدخول";
};
const signInCloud=async()=>{
 try{setCloudStatus("جارٍ تسجيل الدخول…");const email=cloudEmail.value.trim(),password=cloudPassword.value;
  if(!email||!password)throw new Error("أدخل البريد الإلكتروني وكلمة المرور.");
  const s=await cloudAuth("/token?grant_type=password",{email,password});
  if(!s.access_token||!s.user||!s.user.id)throw new Error("لم تُنشأ جلسة دخول صالحة.");
  if(!saveCloudSession(s))throw new Error("تعذر حفظ الجلسة المؤقتة في علامة التبويب.");
  cloudPassword.value="";updateCloudState();await loadCloudBackups();setCloudStatus("تم تسجيل الدخول وتحميل قائمة النسخ الخاصة بحسابك.");
 }catch(e){setCloudStatus("تعذر تسجيل الدخول: "+(e.message||"تحقق من بيانات الحساب."));}
};
const signUpCloud=async()=>{
 try{setCloudStatus("جارٍ إنشاء الحساب…");const email=cloudEmail.value.trim(),password=cloudPassword.value;
  if(!email||!password||password.length<8)throw new Error("أدخل بريداً صحيحاً وكلمة مرور من 8 أحرف على الأقل.");
  const s=await cloudAuth("/signup",{email,password});
  if(s.access_token&&s.user){saveCloudSession(s);updateCloudState();await loadCloudBackups();setCloudStatus("تم إنشاء الحساب وتسجيل الدخول.");}
  else setCloudStatus("تم إرسال طلب إنشاء الحساب. تحقق من بريدك لتأكيده، ثم سجّل الدخول.");
  cloudPassword.value="";
 }catch(e){setCloudStatus("تعذر إنشاء الحساب: "+(e.message||"تحقق من البيانات."));}
};
const createCloudBackup=async()=>{
 try{
  const s=readCloudSession();if(!s||!s.user||!s.user.id)throw new Error("سجّل الدخول أولاً.");
  const payload=backupPayload(),serialized=JSON.stringify(payload);
  if(new TextEncoder().encode(serialized).length>1800000)throw new Error("حجم النسخة كبير جداً؛ نزّل نسخة JSON محلية أو قلّل السجلات.");
  const label="مركز القيادة · "+new Date().toLocaleString();
  await cloudRequest("/rest/v1/user_workspace_backups",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({user_id:s.user.id,backup_type:"operations_hub",schema_version:2,label,payload})});
  setCloudStatus("تم إنشاء نسخة سحابية خاصة بحسابك. لم يتم تفعيل مزامنة تلقائية.");
  await loadCloudBackups();
 }catch(e){setCloudStatus("تعذر إنشاء النسخة: "+(e.message||"تحقق من الاتصال والحساب."));}
};
const signOutCloud=async()=>{
 try{const s=readCloudSession();if(s&&s.access_token)await fetch(cloudBase+"/auth/v1/logout",{method:"POST",headers:{"apikey":cloudAnon,"Authorization":"Bearer "+s.access_token},cache:"no-store"}).catch(()=>{});}
 finally{clearCloudSession();cloudList.replaceChildren();updateCloudState();setCloudStatus("تم إنهاء الجلسة المحلية.");}
};
actions(cloudPanel,btn("تسجيل الدخول",signInCloud),btn("إنشاء حساب",signUpCloud),btn("إنشاء نسخة سحابية الآن",createCloudBackup),btn("تحديث قائمة النسخ",async()=>{try{await loadCloudBackups();setCloudStatus("تم تحديث قائمة النسخ.");}catch(e){setCloudStatus(e.message);}}),btn("تسجيل الخروج",signOutCloud,"oph-btn oph-danger"));
cloudPanel.append(cloudUser,cloudList,cloudStatus,el("p","oph-note","الحماية: RLS تقصر القراءة والإنشاء والحذف على صاحب الحساب. لا توجد صلاحية تعديل النسخة بعد إنشائها. النسخ محفوظة في قاعدة البيانات السحابية ولا تُشفّر تشفيراً طرفياً من المتصفح؛ لا ترفع كلمات مرور أو أسراراً أو بيانات لا تريد تخزينها سحابياً."));
backup.append(cloudPanel);updateCloudState();
importFile.addEventListener("change",async()=>{const file=importFile.files&&importFile.files[0];if(!file)return;try{if(file.size>1024*1024)throw new Error("الملف يتجاوز 1 ميغابايت.");const raw=JSON.parse(await file.text()),d=raw&&raw.data;if(!raw||raw.app!=="ofoq-operations-hub"||![1,2].includes(raw.version)||!d||!Array.isArray(d.projects)||!Array.isArray(d.tasks)||!Array.isArray(d.transactions))throw new Error("صيغة النسخة غير متوافقة.");if(d.projects.length>100||d.tasks.length>300||d.transactions.length>500)throw new Error("تجاوزت النسخة حدود السجلات.");if(!d.projects.every(x=>x&&typeof x.name==="string"&&x.name.length<=100&&["active","paused","done"].includes(x.status)))throw new Error("بيانات المشاريع غير صالحة.");if(!d.tasks.every(x=>x&&typeof x.title==="string"&&x.title.length<=160&&["open","done"].includes(x.status)))throw new Error("بيانات المهام غير صالحة.");if(!d.transactions.every(x=>x&&["income","expense"].includes(x.kind)&&Number.isFinite(x.amount)&&x.amount>0&&x.amount<=1e12&&typeof x.category==="string"))throw new Error("بيانات الدفتر المالي غير صالحة.");if(!confirm("سيستبدل الاستيراد بيانات مركز القيادة الحالية. هل تريد المتابعة؟"))return;if(raw.version===2&&raw.linkedSources){const ls=raw.linkedSources;if(!ls||typeof ls!=="object"||!Array.isArray(ls.stock)||!Array.isArray(ls.trade)||!Array.isArray(ls.expenses)||!Array.isArray(ls.settlements)||ls.stock.length>10000||ls.trade.length>20000||ls.expenses.length>20000||ls.settlements.length>20000)throw new Error("لقطة المصادر المرتبطة غير صالحة أو تجاوزت الحدود.");try{localStorage.setItem(ARCHIVE_KEY,JSON.stringify({archivedAt:new Date().toISOString(),linkedSources:ls}));}catch(_){throw new Error("تعذر حفظ أرشيف المصادر؛ لم يتم استبدال بيانات مركز القيادة.");}}data=clean(d);if(!persist())throw new Error("لم تتم الاستعادة لأن الحفظ الآمن لم يكتمل.");status.textContent=raw.version===2?"تمت استعادة مركز القيادة وحفظ لقطة المصادر في أرشيف منفصل دون المساس بالأدوات الأصلية.":"تمت استعادة بيانات مركز القيادة.";}catch(e){status.textContent="تعذر الاستيراد: "+(e.message||"ملف غير صالح.");}finally{importFile.value="";}});
root.append(style,head,metrics,tabs,panes,status);host.append(root);render();renderLinked();activate("overview");
}
const wrapped=async function(sec){await prior(sec);if(sec&&(sec.id==="business"||sec.id==="startup_lab"))mount(sec);};
wrapped.__ofoqOperationsWrapped=true;window.openSection=wrapped;
})();