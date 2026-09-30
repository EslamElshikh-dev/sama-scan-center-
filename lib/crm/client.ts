import { crmErrors } from "./types";
export async function crmRequest<T>(action:string,payload:Record<string,unknown>={},signal?:AbortSignal):Promise<T> {
 let response:Response;
 try { response=await fetch("/api/dashboard/crm",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,payload}),signal}); }
 catch(error) { if(error instanceof Error && error.name==="AbortError")throw error; throw new Error(crmErrors.unavailable); }
 const value=await response.json();
 if(!response.ok||value.ok!==true) {
  if(response.status===401) window.location.reload();
  throw new Error(crmErrors[value.code]||crmErrors.unavailable);
 }
 return value as T;
}
