export const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
export function originOK(request: Request) { return request.headers.get("origin") === new URL(request.url).origin; }
