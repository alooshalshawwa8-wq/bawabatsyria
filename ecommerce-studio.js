/* OFOQ E-commerce Studio v1 — local-first merchant tools; no network/API calls. */
(function(){
  'use strict';
  if(window.__OFOQ_ECOM_STUDIO_V1__) return;
  const original=window.openSection;
  if(typeof original!=="function" || original.__ofoqEcomWrapped) return;
  window.__OFOQ_ECOM_STUDIO_V1__=true;

  const PRICE_KEY="ofoq_ecommerce_scenarios_v1";
  const CHECK_KEY="ofoq_ecommerce_launch_checklist_v1";
  const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const button=(label,cls,handler)=>{const b=make("button",cls,label);b.type="button";b.addEventListener("click",handler);return b;};
  const readJSON=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||"null");return v===null?fallback:v;}catch(_){return fallback;}};
  const writeJSON=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}};
  const number=(value)=>{const n=Number(value);return Number.isFinite(n)?n:NaN;};
  const fmt=(n)=>Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
  const pct=(n)=>Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})+"%";

  function mount(sec){
    const host=document.getElementById("specialTool");
    if(!host || host.querySelector(".ofoq-ecom-studio")) return;
    const root=make("section","ofoq-ecom-studio");
    const style=make("style");
    style.textContent=`
      .ofoq-ecom-studio{margin:22px 0;padding:18px;border:1px solid #347b83;border-radius:22px;background:linear-gradient(145deg,#0d263a,#091725 72%);color:#e8f4f7;box-shadow:0 18px 48px #0005}
      .ofoq-ecom-head{padding:8px 4px 16px;border-bottom:1px solid #315365}
      .ofoq-ecom-kicker{font-size:10px;letter-spacing:.16em;color:#81e8d8;font-weight:900}
      .ofoq-ecom-head h2{margin:8px 0;color:#e8fffb;font-size:clamp(22px,4vw,32px)}
      .ofoq-ecom-head p{margin:0;color:#b7ced8;font-size:13px;line-height:1.9;max-width:850px}
      .ofoq-ecom-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}
      .ofoq-ecom-tabs button,.ofoq-ecom-btn{border:1px solid #396477;border-radius:12px;background:#102b3d;color:#d8f7f1;padding:10px 13px;font:inherit;font-size:12px;cursor:pointer}
      .ofoq-ecom-tabs button[aria-selected=true]{background:linear-gradient(135deg,#087f83,#36bda9);border-color:#8af4e2;color:#05282b;font-weight:900}
      .ofoq-ecom-tabs button:focus-visible,.ofoq-ecom-btn:focus-visible,.ofoq-ecom-studio input:focus-visible,.ofoq-ecom-studio textarea:focus-visible{outline:2px solid #8af4e2;outline-offset:2px}
      .ofoq-ecom-pane[hidden]{display:none}
      .ofoq-ecom-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:11px}
      .ofoq-ecom-field{display:grid;gap:6px;color:#c5d9e1;font-size:12px}
      .ofoq-ecom-field input,.ofoq-ecom-field textarea{width:100%;min-width:0;box-sizing:border-box;border:1px solid #35586c;border-radius:10px;background:#071927;color:#fff;padding:11px;font:inherit}
      .ofoq-ecom-field textarea{min-height:88px;resize:vertical;line-height:1.7}
      .ofoq-ecom-actions{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}
      .ofoq-ecom-output{margin-top:13px;padding:14px;border:1px solid #367d79;border-radius:13px;background:#0b2b32;color:#e2fff7;line-height:1.9;white-space:pre-wrap;overflow-wrap:anywhere}
      .ofoq-ecom-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:9px;margin-top:14px}
      .ofoq-ecom-metric{padding:12px;border:1px solid #2b5264;border-radius:12px;background:#0d2030;min-width:0}
      .ofoq-ecom-metric small{display:block;color:#9dbbc8;font-size:10px;margin-bottom:7px}
      .ofoq-ecom-metric strong{display:block;color:#91f1df;font-size:18px;overflow-wrap:anywhere}
      .ofoq-ecom-note{font-size:11px;color:#9fb9c5;line-height:1.8;margin:12px 0}
      .ofoq-ecom-saved{display:grid;gap:7px;margin-top:12px}
      .ofoq-ecom-saved-row{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:9px;border:1px solid #294b5e;border-radius:10px;background:#0a1c2a;font-size:12px}
      .ofoq-ecom-checks{display:grid;gap:8px}
      .ofoq-ecom-check{display:flex;align-items:flex-start;gap:9px;padding:11px;border:1px solid #2b5062;border-radius:10px;background:#0b1e2c;font-size:12px;line-height:1.7}
      .ofoq-ecom-check input{margin-top:4px;accent-color:#43d4bf}
      .ofoq-ecom-progress{height:8px;border-radius:20px;background:#06121e;overflow:hidden;margin:12px 0}
      .ofoq-ecom-progress span{display:block;height:100%;width:0;background:linear-gradient(90deg,#138d8b,#82f0d9);transition:width .2s}
      @media(max-width:560px){.ofoq-ecom-studio{padding:13px}.ofoq-ecom-tabs button{flex:1 1 44%}.ofoq-ecom-grid{grid-template-columns:1fr 1fr}}
      @media(prefers-reduced-motion:reduce){.ofoq-ecom-progress span{transition:none}}
    `;
    const head=make("header","ofoq-ecom-head");
    head.append(make("div","ofoq-ecom-kicker","OFOQ MERCHANT INTELLIGENCE · LOCAL WORKSPACE"));
    head.append(make("h2","","استوديو قيادة المتجر الإلكتروني"));
    head.append(make("p","","أدوات تسعير وربحية، تحليل حملات التحويل، صياغة صفحات المنتجات، وقائمة إطلاق عملية. الحسابات تعمل داخل جهازك ولا ترسل بياناتك إلى أي خادم."));
    const tabs=make("div","ofoq-ecom-tabs");tabs.setAttribute("role","tablist");tabs.setAttribute("aria-label","أدوات استوديو التجارة الإلكترونية");
    const panes=make("div","");
    const panel=(id)=>{const p=make("section","ofoq-ecom-pane");p.id="ofoq-ecom-pane-"+id;p.setAttribute("role","tabpanel");p.setAttribute("aria-label",id);p.hidden=true;panes.append(p);return p;};
    const activate=id=>{
      tabs.querySelectorAll('[role="tab"]').forEach(t=>{const on=t.dataset.pane===id;t.setAttribute("aria-selected",String(on));t.tabIndex=on?0:-1;});
      panes.querySelectorAll('[role="tabpanel"]').forEach(p=>{p.hidden=p.id!=="ofoq-ecom-pane-"+id;});
    };
    const addTab=(id,label)=>{const t=button(label,"",()=>activate(id));t.dataset.pane=id;t.setAttribute("role","tab");t.setAttribute("aria-controls","ofoq-ecom-pane-"+id);t.setAttribute("aria-selected","false");t.tabIndex=-1;t.addEventListener("keydown",e=>{const all=Array.from(tabs.querySelectorAll('[role="tab"]'));const i=all.indexOf(t);let next;if(e.key==="ArrowLeft")next=all[(i+1)%all.length];else if(e.key==="ArrowRight")next=all[(i-1+all.length)%all.length];else if(e.key==="Home")next=all[0];else if(e.key==="End")next=all[all.length-1];if(next){e.preventDefault();activate(next.dataset.pane);next.focus();}});tabs.append(t);return t;};
    const field=(parent,label,id,type="number",value="0",placeholder="")=>{
      const wrap=make("label","ofoq-ecom-field",label);const input=make(type==="textarea"?"textarea":"input");
      input.id="ofoq-ecom-"+id;input.name=id;input.placeholder=placeholder;
      if(type==="number"){input.type="number";input.min="0";input.step="any";input.value=value;}
      else if(type==="text"){input.type="text";input.maxLength=180;input.value=value;}
      else{input.maxLength=800;input.rows=3;input.value=value;}
      wrap.append(input);parent.append(wrap);return input;
    };
    const actionRow=(parent)=>{const row=make("div","ofoq-ecom-actions");parent.append(row);return row;};
    const output=(parent)=>{const box=make("div","ofoq-ecom-output","أدخل البيانات ثم شغّل الحساب.");box.setAttribute("aria-live","polite");parent.append(box);return box;};
    const metric=(parent,label,value)=>{const card=make("div","ofoq-ecom-metric");card.append(make("small","",label),make("strong","",value));parent.append(card);};
    const note=(parent,text)=>parent.append(make("p","ofoq-ecom-note",text));

    // 1) Full-cost price and contribution calculator.
    addTab("pricing","🧮 التسعير والربحية");
    const pricing=panel("pricing");
    pricing.append(make("h3","","حاسبة السعر وهامش المساهمة"));
    note(pricing,"أدخل تكلفة الوحدة وكل ما تتحمله في الطلب الواحد. الرسوم والنسب تُحسب من سعر البيع؛ أدخل نسبة المرتجعات المتوقعة كتقدير احتياطي وليس كبيانات فعلية.");
    const priceGrid=make("div","ofoq-ecom-grid");pricing.append(priceGrid);
    const priceFields={
      cost:field(priceGrid,"تكلفة شراء المنتج","cost","number","0"),
      inbound:field(priceGrid,"نقل/توريد للوحدة","inbound","number","0"),
      packaging:field(priceGrid,"تغليف وتجهيز الطلب","packaging","number","0"),
      fulfilment:field(priceGrid,"توصيل تتحمله أنت","fulfilment","number","0"),
      ad:field(priceGrid,"تكلفة الإعلان لكل طلب","ad","number","0"),
      platform:field(priceGrid,"رسوم المنصة %","platform","number","0"),
      payment:field(priceGrid,"رسوم الدفع %","payment","number","0"),
      returns:field(priceGrid,"احتياطي المرتجعات %","returns","number","0"),
      target:field(priceGrid,"هامش صافي مستهدف %","target","number","20"),
      price:field(priceGrid,"سعر البيع الحالي","price","number","0"),
      qty:field(priceGrid,"عدد الطلبات للتحليل","qty","number","1")
    };
    const priceActions=actionRow(pricing),calcPrice=button("احسب اقتصاديات الطلب","ofoq-ecom-btn",calculatePrice),savePrice=button("احفظ هذا السيناريو","ofoq-ecom-btn",saveScenario),exportPrices=button("تصدير السيناريوهات JSON","ofoq-ecom-btn",exportScenarios);
    priceActions.append(calcPrice,savePrice,exportPrices);
    const priceMetrics=make("div","ofoq-ecom-metrics");pricing.append(priceMetrics);
    const priceOutput=output(pricing);
    const saved=make("div","ofoq-ecom-saved");pricing.append(saved);
    function getPriceValues(){return Object.fromEntries(Object.entries(priceFields).map(([k,v])=>[k,number(v.value)]));}
    function calculatePrice(){
      const v=getPriceValues(),fixed=v.cost+v.inbound+v.packaging+v.fulfilment+v.ad,rate=(v.platform+v.payment+v.returns)/100;
      const valid=Object.values(v).every(Number.isFinite)&&Object.values(v).every(x=>x>=0)&&v.qty>0&&Number.isInteger(v.qty)&&rate<1&&v.target/100+rate<1;
      if(!valid){priceOutput.textContent="تحقق من القيم: يجب أن تكون التكاليف والنسب غير سالبة، وعدد الطلبات عدداً صحيحاً موجباً، ومجموع الرسوم والمرتجعات والهامش المستهدف أقل من 100%.";return;}
      const breakEven=fixed/(1-rate),targetPrice=fixed/(1-rate-v.target/100),profit=v.price*(1-rate)-fixed,margin=v.price>0?profit/v.price*100:0;
      priceMetrics.replaceChildren();
      metric(priceMetrics,"التكلفة الثابتة لكل طلب",fmt(fixed));
      metric(priceMetrics,"سعر التعادل التقريبي",fmt(breakEven));
      metric(priceMetrics,"سعر تحقيق الهامش المستهدف",fmt(targetPrice));
      metric(priceMetrics,"صافي المساهمة لكل طلب",fmt(profit));
      metric(priceMetrics,"هامش المساهمة الحالي",pct(margin));
      metric(priceMetrics,"النتيجة للكمية المحددة",fmt(profit*v.qty));
      priceOutput.textContent=(profit>=0?"الطلب يحقق مساهمة موجبة وفق المدخلات.":"الطلب خاسر وفق المدخلات.")+"\n\nالسعر الحالي: "+fmt(v.price)+"\nالتكلفة الثابتة للطلب: "+fmt(fixed)+"\nالرسوم والمرتجعات كنسبة من البيع: "+pct(rate*100)+"\nصافي المساهمة: "+fmt(profit)+" لكل طلب، و"+fmt(profit*v.qty)+" للكمية المحددة.\n\nسعر التعادل: "+fmt(breakEven)+" · السعر اللازم للهامش المستهدف: "+fmt(targetPrice)+"\n\nملاحظة: لا يشمل الحساب الضرائب أو الرسوم غير المدخلة أو أثر تغير سعر الصرف. لا تعتمد السعر قبل مراجعة تكاليفك الفعلية.";
      priceOutput.dataset.valid="1";
    }
    function readScenarios(){const v=readJSON(PRICE_KEY,[]);return Array.isArray(v)?v.filter(x=>x&&typeof x.id==="string"&&x.values&&typeof x.values==="object").slice(-40):[];}
    function renderScenarios(){
      saved.replaceChildren();const rows=readScenarios();
      if(!rows.length){saved.append(make("p","ofoq-ecom-note","لا توجد سيناريوهات محفوظة بعد."));return;}
      rows.slice().reverse().forEach(row=>{
        const line=make("div","ofoq-ecom-saved-row");line.append(make("span","",row.name+" · "+new Date(row.createdAt).toLocaleDateString()));
        const load=button("تحميل","ofoq-ecom-btn",()=>{Object.entries(priceFields).forEach(([k,input])=>{if(row.values[k]!==undefined)input.value=String(row.values[k]);});calculatePrice();});
        const del=button("حذف","ofoq-ecom-btn",()=>{writeJSON(PRICE_KEY,readScenarios().filter(x=>x.id!==row.id));renderScenarios();});
        line.append(load,del);saved.append(line);
      });
    }
    function saveScenario(){
      const v=getPriceValues();
      if(!Object.values(v).every(Number.isFinite)||!Object.values(v).every(x=>x>=0)||!Number.isInteger(v.qty)||v.qty<1){priceOutput.textContent="صحح القيم قبل حفظ السيناريو.";return;}
      const name=prompt("اسم السيناريو (مثال: المنتج الأساسي)");if(name===null)return;
      const rows=readScenarios();rows.push({id:"ec_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7),name:name.trim().slice(0,70)||"سيناريو دون اسم",createdAt:new Date().toISOString(),values:v});
      if(!writeJSON(PRICE_KEY,rows.slice(-40))){priceOutput.textContent="تعذر الحفظ محلياً. تحقق من مساحة تخزين المتصفح.";return;}
      renderScenarios();priceOutput.textContent="تم حفظ السيناريو محلياً على هذا الجهاز.";
    }
    function exportScenarios(){
      const rows=readScenarios();const blob=new Blob([JSON.stringify({app:"ofoq-ecommerce-scenarios",version:1,createdAt:new Date().toISOString(),scenarios:rows},null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob),a=make("a");a.href=url;a.download="ofoq-ecommerce-scenarios.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    calcPrice.addEventListener("click",calculatePrice);renderScenarios();

    // 2) Advertising funnel and unit economics.
    addTab("funnel","📈 أداء الحملات");
    const funnel=panel("funnel");funnel.append(make("h3","","لوحة مؤشرات الحملة والتحويل"));
    note(funnel,"أدخل الأرقام من لوحة حملتك أو متجرك. هذه الأداة تحسب المؤشرات من مدخلاتك ولا تتصل بمنصات الإعلانات.");
    const funnelGrid=make("div","ofoq-ecom-grid");funnel.append(funnelGrid);
    const funnelFields={
      spend:field(funnelGrid,"الإنفاق الإعلاني","spend","number","0"),
      impressions:field(funnelGrid,"مرات الظهور","impressions","number","0"),
      clicks:field(funnelGrid,"النقرات","clicks","number","0"),
      orders:field(funnelGrid,"الطلبات","orders","number","0"),
      revenue:field(funnelGrid,"إجمالي الإيرادات","revenue","number","0"),
      cogs:field(funnelGrid,"تكلفة البضاعة المباعة","cogs","number","0")
    };
    const funnelActions=actionRow(funnel),runFunnel=button("حلّل أداء الحملة","ofoq-ecom-btn",()=>{
      const v=Object.fromEntries(Object.entries(funnelFields).map(([k,x])=>[k,number(x.value)]));
      if(!Object.values(v).every(Number.isFinite)||Object.values(v).some(x=>x<0)||!Number.isInteger(v.impressions)||!Number.isInteger(v.clicks)||!Number.isInteger(v.orders)||v.clicks>v.impressions){funnelOutput.textContent="تحقق من الأرقام: القيم غير سالبة، مرات الظهور والنقرات والطلبات أعداد صحيحة، والنقرات لا تتجاوز مرات الظهور.";return;}
      const ratio=(a,b)=>b>0?a/b:null,metrics=funnelMetrics;
      metrics.replaceChildren();
      metric(metrics,"معدل النقر CTR",ratio(v.clicks,v.impressions)===null?"—":pct(ratio(v.clicks,v.impressions)*100));
      metric(metrics,"تكلفة النقرة CPC",ratio(v.spend,v.clicks)===null?"—":fmt(ratio(v.spend,v.clicks)));
      metric(metrics,"تكلفة ألف ظهور CPM",ratio(v.spend*1000,v.impressions)===null?"—":fmt(ratio(v.spend*1000,v.impressions)));
      metric(metrics,"معدل التحويل",ratio(v.orders,v.clicks)===null?"—":pct(ratio(v.orders,v.clicks)*100));
      metric(metrics,"تكلفة اكتساب الطلب",ratio(v.spend,v.orders)===null?"—":fmt(ratio(v.spend,v.orders)));
      metric(metrics,"متوسط قيمة الطلب",ratio(v.revenue,v.orders)===null?"—":fmt(ratio(v.revenue,v.orders)));
      metric(metrics,"العائد على الإنفاق ROAS",ratio(v.revenue,v.spend)===null?"—":ratio(v.revenue,v.spend).toFixed(2)+"×");
      metric(metrics,"بعد تكلفة البضاعة والإعلان",fmt(v.revenue-v.cogs-v.spend));
      funnelOutput.textContent="ملخص الحملة\nالإيرادات: "+fmt(v.revenue)+"\nالإنفاق الإعلاني: "+fmt(v.spend)+"\nتكلفة البضاعة: "+fmt(v.cogs)+"\nالمتبقي قبل بقية المصروفات والرسوم والضرائب: "+fmt(v.revenue-v.cogs-v.spend)+"\n\nROAS لا يساوي صافي الربح. أضف الشحن والعمولات والمرتجعات والرواتب والضرائب قبل الحكم على ربحية الحملة.";
    });
    funnelActions.append(runFunnel);
    const funnelMetrics=make("div","ofoq-ecom-metrics");funnel.append(funnelMetrics);
    const funnelOutput=output(funnel);

    // 3) Truthful product page copy builder.
    addTab("product","✍️ صفحة المنتج");
    const product=panel("product");product.append(make("h3","","مولّد مسودة صفحة المنتج"));
    note(product,"اكتب المعلومات التي تستطيع إثباتها. المولّد يعيد ترتيب مدخلاتك ولا يخترع شهادات أو مواصفات أو ضمانات.");
    const productGrid=make("div","ofoq-ecom-grid");product.append(productGrid);
    const productFields={
      name:field(productGrid,"اسم المنتج","name","text","","اسم واضح ومحدد"),
      audience:field(productGrid,"العميل المستهدف","audience","text","","لمن يناسب؟"),
      problem:field(productGrid,"الحاجة التي يلبيها","problem","textarea","","ما المشكلة أو الحاجة؟"),
      benefit:field(productGrid,"الفائدة الأساسية","benefit","textarea","","ما الفائدة الملموسة؟"),
      features:field(productGrid,"المواصفات المؤكدة","features","textarea","","المقاس، المادة، المحتويات، التوافق..."),
      proof:field(productGrid,"تفصيل داعم موثق (اختياري)","proof","textarea","","معلومة تستطيع إثباتها"),
      cta:field(productGrid,"دعوة لاتخاذ إجراء","cta","text","","اطلبه الآن أو تواصل معنا")
    };
    const productActions=actionRow(product),generateCopy=button("أنشئ مسودة الصفحة","ofoq-ecom-btn",()=>{
      const v=Object.fromEntries(Object.entries(productFields).map(([k,x])=>[k,x.value.trim()]));
      if(!v.name||!v.benefit){productOutput.textContent="أدخل اسم المنتج والفائدة الأساسية أولاً.";return;}
      const lines=[v.name.toUpperCase(),"",v.problem?"هل تبحث عن حل لـ"+v.problem+"؟":"اكتشف "+v.name+".",v.benefit,"",v.audience?"مناسب لـ: "+v.audience:"",v.features?"المواصفات:\n"+v.features:"",v.proof?"تفصيل إضافي: "+v.proof:"","",v.cta||"تواصل معنا لمعرفة التفاصيل والطلب."];
      productOutput.textContent=lines.filter(Boolean).join("\n");
    }),copyCopy=button("نسخ المسودة","ofoq-ecom-btn",async()=>{try{await navigator.clipboard.writeText(productOutput.textContent);productStatus.textContent="تم نسخ المسودة.";}catch(_){productStatus.textContent="تعذر النسخ التلقائي؛ حدد النص وانسخه يدوياً.";}}),productStatus=make("p","ofoq-ecom-note","");
    productActions.append(generateCopy,copyCopy);product.append(productStatus);
    const productOutput=output(product);productOutput.textContent="ستظهر مسودة الصفحة هنا بعد إدخال المعلومات.";

    // 4) Launch checklist with local progress.
    addTab("launch","🚀 قائمة الإطلاق");
    const launch=panel("launch");launch.append(make("h3","","قائمة إطلاق المتجر"));
    note(launch,"علّم الخطوات المنجزة. يحفظ التقدم على هذا المتصفح فقط، ويمكنك تصدير القائمة لمشاركتها.");
    const tasks=[
      "تحديد العميل المستهدف والمشكلة التي يحلها المنتج",
      "التحقق من المورد والجودة والمواصفات الفعلية",
      "حساب التكلفة الكاملة وسعر التعادل وهامش المساهمة",
      "إعداد صور أصلية أو مرخصة ووصف دقيق للمنتج",
      "كتابة سياسة الشحن والإرجاع والاستبدال والخصوصية",
      "اختبار الدفع والسلة ورسائل تأكيد الطلب",
      "تجربة طلب كامل من البداية حتى التسليم",
      "إعداد قياس الزيارات والتحويل والطلبات والمرتجعات",
      "تحديد ميزانية اختبار إعلاني وحد إيقاف للخسارة",
      "تجهيز خدمة العملاء وآلية معالجة الشكاوى"
    ];
    const progressText=make("strong","","0 من "+tasks.length+" خطوات مكتملة");
    const progress=make("div","ofoq-ecom-progress"),bar=make("span","");progress.append(bar);
    const taskList=make("div","ofoq-ecom-checks");
    const savedChecks=readJSON(CHECK_KEY,[]);
    const checks=Array.isArray(savedChecks)?tasks.map((_,i)=>Boolean(savedChecks[i])):tasks.map(()=>false);
    function saveChecks(){if(!writeJSON(CHECK_KEY,checks))progressText.textContent="تعذر حفظ التقدم؛ مساحة التخزين قد تكون ممتلئة.";const count=checks.filter(Boolean).length;progressText.textContent=count+" من "+tasks.length+" خطوات مكتملة";bar.style.width=(count/tasks.length*100)+"%";}
    tasks.forEach((task,i)=>{const label=make("label","ofoq-ecom-check"),box=make("input");box.type="checkbox";box.checked=checks[i];box.addEventListener("change",()=>{checks[i]=box.checked;saveChecks();});label.append(box,make("span","",task));taskList.append(label);});
    const launchActions=actionRow(launch),exportChecklist=button("تصدير قائمة الإطلاق","ofoq-ecom-btn",()=>{const content={app:"ofoq-ecommerce-launch-checklist",version:1,createdAt:new Date().toISOString(),items:tasks.map((task,i)=>({task,completed:checks[i]}))};const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:"application/json"})),a=make("a");a.href=url;a.download="ofoq-ecommerce-launch-checklist.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);});
    const resetChecklist=button("إعادة ضبط القائمة","ofoq-ecom-btn",()=>{if(!confirm("هل تريد إعادة ضبط تقدم قائمة الإطلاق؟"))return;checks.fill(false);taskList.querySelectorAll('input[type="checkbox"]').forEach(x=>x.checked=false);saveChecks();});
    launchActions.append(exportChecklist,resetChecklist);launch.append(progressText,progress,taskList);saveChecks();

    root.append(style,head,tabs,panes);host.append(root);activate("pricing");
  }

  const wrapped=async function(sec){await original(sec);if(sec&&sec.id==="ecommerce_studio")mount(sec);};
  wrapped.__ofoqEcomWrapped=true;window.openSection=wrapped;
})();
