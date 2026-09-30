import { APP_ORIGIN, CALLBACK, CLIENT_ID } from "@/lib/dashboard/auth";
export function GET() {
  return Response.json({ client_id: CLIENT_ID, client_name: "Sama Scan Dashboard", client_uri: `${APP_ORIGIN}/dashboard`, redirect_uris: [CALLBACK], grant_types: ["authorization_code"], response_types: ["code"], token_endpoint_auth_method: "none", scope: "create" });
}
