import { ZodError } from "zod";
import { accessToken } from "./auth";
import { callMcp } from "./mcp";
import { payload } from "@/lib/sama";
export { owner } from "./auth";
export { database } from "./database";
export const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
export function json(data: unknown, status = 200) { return Response.json(data, { status, headers }); }
export function originOK(request: Request) { return request.headers.get("origin") === new URL(request.url).origin; }
export function fail(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (code === "SIGN_IN_REQUIRED") return json({ status: "reauthentication_required", message: "سجّل الدخول بحساب إدارة المركز للمتابعة." }, 401);
  if (code === "PROVIDER_CONNECTION_REQUIRED") return json({ status: "provider_connection_required", message: "اربط حساب Windsor.ai الخاص بالمركز لعرض البيانات المباشرة." }, 409);
  if (code === "STORAGE_UNAVAILABLE") return json({ status: "storage_unavailable", message: "لم يتم تفعيل تخزين اللوحة بعد. الحفظ ورفع الصور والنشر ينتظرون ربط قاعدة البيانات والتخزين." }, 503);
  if (error instanceof ZodError || error instanceof SyntaxError) return json({ status: "invalid_request", message: "تحقق من البيانات المدخلة." }, 400);
  // Do not log provider errors: they can contain private results or credentials.
  return json({ status: "internal_error", message: "تعذّر إكمال الطلب. المحتوى ما زال على الشاشة؛ جرّب مرة أخرى." }, 503);
}
export async function invoke(action: string, args: Record<string, unknown>) {
  const token = await accessToken();
  try {
    const result = await callMcp(token, action, args);
    const value = payload(result) as Record<string, unknown> | null;
    if (result.isError || (value && typeof value.error === "string")) return { status: "tool_error", message: "رفض المصدر الطلب. راجع صلاحية الحساب وحالة الاتصال.", result };
    return { status: "success", result };
  } catch { return { status: "upstream_error", message: "لم تصل استجابة مؤكدة من المصدر. راجع حالة الاتصال قبل إعادة المحاولة." }; }
}
