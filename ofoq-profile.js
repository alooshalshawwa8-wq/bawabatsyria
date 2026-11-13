/* OFOQ Account Profile v1 — profile fields backed by the existing owner-only profile table. */
(function(){
"use strict";
if(!window.OFOQData||window.__OFOQ_PROFILE_V1__)return;window.__OFOQ_PROFILE_V1__=true;
const host=document.getElementById("membershipPanel");if(!host)return;
const el=(t,c,x)=>{const n=document.createElement(t);if(c)n.className=c;if(x!==undefined)n.textContent=x;return n};
const root=el("section","ofoq-profile-panel");const css=el("style");css.textContent=".ofoq-profile-panel{margin:16px 0;padding:15px;border:1px solid #466b83;border-radius:14px;background:#0c2032;color:#edf7ff}.ofoq-profile-panel h3{color:#d5efff;margin:0 0 8px;font-size:16px}.ofoq-profile-panel p{font-size:12px;color:#afc6d5;line-height:1.8}.ofoq-profile-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px}.ofoq-profile-panel label{display:grid;gap:5px;font-size:12px}.ofoq-profile-panel input,.ofoq-profile-panel select{width:100%;box-sizing:border-box;padding:10px;border:1px solid #36586c;border-radius:9px;background:#071827;color:#f5fbff}.ofoq-profile-panel button{margin:10px 7px 0 0;padding:9px 13px;border:1px solid #4c89a8;border-radius:9px;background:#16405b;color:white}.ofoq-profile-status{padding:9px;border:1px solid #34536a;border-radius:9px;margin-top:10px;white-space:pre-wrap}";
const title=el("h3","","الملف الشخصي الموحد");const desc=el("p","","بيانات الملف الشخصي مرتبطة بحسابك في أُفُق وتُحمّل عبر الجلسة الموثقة. صلاحية التعديل محصورة بصاحب الحساب.");
const grid=el("div","ofoq-profile-grid");
function field(label,type,placeholder){const w=el("label","",label),i=el("input");i.type=type;i.placeholder=placeholder||"";w.append(i);grid.append(w);return i}
const name=field("الاسم المعروض","text","اسمك الظاهر");const avatar=field("رابط الصورة (اختياري)","url","https://...");const locale=el("select");[["ar","العربية"],["en","English"]].forEach(([v,l])=>{const o=el("option","",l);o.value=v;locale.append(o)});const lw=el("label","","لغة الحساب");lw.append(locale);grid.append(lw);
const status=el("div","ofoq-profile-status","حمّل ملفك الشخصي بعد تسجيل الدخول.");
const load=el("button","","تحميل الملف");const save=el("button","","حفظ التغييرات");load.type=save.type="button";
root.append(css,title,desc,grid,load,save,status);host.append(root);
async function fetchProfile(){const u=await window.OFOQData.getUser();const rows=await window.OFOQData.request("profiles",{query:{select:"id,display_name,avatar_url,locale",id:"eq."+u.id,limit:"1"}});const p=rows&&rows[0];name.value=p?.display_name||"";avatar.value=p?.avatar_url||"";locale.value=p?.locale||"ar";status.textContent="الحساب المتصل: "+(u.email||u.id)+" · الملف الشخصي جاهز للتعديل."}
load.onclick=()=>fetchProfile().catch(e=>status.textContent=e.message||"تعذر تحميل الملف.");
save.onclick=async()=>{try{const u=await window.OFOQData.getUser();const image=avatar.value.trim();if(image&&!/^https:\/\//i.test(image)){status.textContent="يجب أن يبدأ رابط الصورة بـ https://";return}await window.OFOQData.request("profiles",{method:"POST",query:{on_conflict:"id"},prefer:"resolution=merge-duplicates,return=representation",body:{id:u.id,display_name:name.value.trim().slice(0,120)||null,avatar_url:image||null,locale:locale.value,updated_at:new Date().toISOString()}});status.textContent="تم حفظ الملف الشخصي في حسابك."; }catch(e){status.textContent=e.message||"تعذر حفظ الملف."}};
})();
