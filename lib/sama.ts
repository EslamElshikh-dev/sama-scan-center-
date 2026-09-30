export const GBP = "locations/12265962119006335138";
export const WEBSITE = "https://samascan.vercel.app/";
export const channels = [
  {id:"google_my_business",name:"ملف Google التجاري",short:"G",kind:"publish",color:"#4285f4"},
  {id:"facebook_organic",name:"فيسبوك",short:"f",kind:"publish",color:"#1877f2"},
  {id:"instagram",name:"إنستغرام",short:"◎",kind:"publish",color:"#bf367a"},
  {id:"searchconsole",name:"Search Console",short:"G",kind:"analytics",color:"#2b9368"},
  {id:"googleanalytics4",name:"تحليلات الموقع GA4",short:"A",kind:"analytics",color:"#d47918"},
  {id:"tiktok_organic",name:"تيك توك",short:"♪",kind:"read",color:"#162632",url:"https://www.tiktok.com/@samascancenter"},
  {id:"x_organic",name:"منصة X",short:"𝕏",kind:"read",color:"#162632",url:"https://x.com/samascansenter"},
  {id:"snapchat",name:"سناب شات",short:"S",kind:"profile",color:"#aa8f00",url:"https://www.snapchat.com/add/samascansenter"},
] as const;
export type Row = Record<string, string | number | null>;
export function payload(result: unknown): unknown {
  if (!result || typeof result !== "object") return result;
  const r = result as Record<string, unknown>;
  if ("structuredContent" in r && r.structuredContent != null) return r.structuredContent;
  if (Array.isArray(r.content)) {
    const item = r.content.find((c: {type?:string})=>c.type === "text");
    if (item?.text) { try { return JSON.parse(item.text); } catch { return {message:item.text}; } }
  }
  return result;
}
export function rowsOf(result: unknown): Row[] {
  const p=payload(result);
  if(Array.isArray(p))return p;
  if(p&&typeof p==="object") for(const key of ["result","data","rows"]) {
    const v=(p as Record<string,unknown>)[key];
    if(Array.isArray(v))return v;
    if(v&&typeof v==="object"){ const rr=rowsOf(v); if(rr.length)return rr; }
  }
  return [];
}
export function period(days=28,end?:string) {
  const today=new Date(new Date().toLocaleString("en-US",{timeZone:"Asia/Riyadh"}));
  const last=end?new Date(end+"T00:00:00Z"):new Date(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()-3));
  const date=(offset:number)=>new Date(last.getTime()+offset*86400000).toISOString().slice(0,10);
  return {from:date(1-days),to:date(0),previousFrom:date(1-days*2),previousTo:date(-days),days};
}
export function summarize(rows:Row[], source:string) {
  const sum=(field:string)=>rows.reduce((s,r)=>s+(Number(r[field])||0),0);
  const impressions=sum("impressions"), clicks=sum("clicks");
  return {impressions,clicks,calls:sum("call_clicks"),directions:sum("direction_requests"),website:sum("website_clicks"),
    ctr:impressions?clicks/impressions*100:null,
    position:impressions?rows.reduce((s,r)=>s+(Number(r.position)||0)*(Number(r.impressions)||0),0)/impressions:null,
    days:new Set(rows.map(r=>r.date).filter(Boolean)).size, source};
}
export function change(current:number|null,previous:number|null,comparable:boolean) {
  if(!comparable||current===null||previous===null||previous===0)return null;
  return (current-previous)/previous*100;
}
