import type {TeamMember,User} from "./types";

export type ReferralView="physicians"|"physicianvisits"|"physicianreports";
export const institutionKinds={clinic:"عيادة / مجمع طبي",hospital:"مستشفى"};
export const visitOutcomes={interested:"مهتم بالتعاون",followup:"يحتاج متابعة",not_interested:"غير مهتم حاليًا",unavailable:"تعذّر لقاء الطبيب"};
export const relationshipStatuses={recent:"إحالات حديثة",dormant:"توقفت الإحالات المسجلة",never:"لم تسجّل إحالات",archived:"مؤرشف"};
export type PhysicianOption={id:string;name:string;specialty:string;institution:string;active:boolean};
export type Physician=PhysicianOption & {
 version:number;institution_kind:keyof typeof institutionKinds;district:string;phone:string|null;
 owner:string|null;note:string;created_at?:string;updated_at?:string;
 last_visit_at?:string|null;next_followup_at?:string|null;open_followups?:number;
};
export type PhysicianVisit={
 id:string;version:number;physician_id:string;physician_name?:string;institution?:string;
 visited_at:string;owner:string;outcome:keyof typeof visitOutcomes;note:string;
 next_followup_at:string|null;followup_status:"not_needed"|"open"|"done";completed_at?:string|null;
 created_at?:string;updated_at?:string;
};
export type PhysicianDetail={physician:Physician;visits:PhysicianVisit[];stats:{referrals:number;booked:number;attended:number;completed:number;last_referral_at:string|null}};
export type PhysicianReportRow=PhysicianOption & {district:string;referrals:number;booked:number;attended:number;completed:number;visits:number;last_referral_at:string|null;relationship_status:keyof typeof relationshipStatuses};
export type PhysicianReport={
 from:string;to:string;dormant_days:number;rows:PhysicianReportRow[];total:number;page:number;updatedAt:string;unlinkedReferrals:number;
 totals:{physicians:number;referrals:number;booked:number;attended:number;completed:number;visits:number;dormant:number;never:number};
};
export type ReferralStaff=Pick<TeamMember,"username"|"display_name"|"role">;
export const canEditPhysician=(user:User,doctor:Physician)=>user.role==="admin"||!doctor.owner||doctor.owner===user.username;
export const canEditVisit=(user:User,visit:PhysicianVisit)=>user.role==="admin"||visit.owner===user.username;
