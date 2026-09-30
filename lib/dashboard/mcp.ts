import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Tokens remain on the server. The destination is fixed, never user supplied.
export async function callMcp(token: string, name: string, args: Record<string, unknown>) {
  const client = new Client({ name: "samascan-dashboard", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL("https://mcp.windsor.ai/"), {
    requestInit: { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  });
  try {
    await client.connect(transport);
    return await client.callTool({ name, arguments: args }, undefined, { timeout: 45000 });
  } finally { await client.close().catch(() => {}); }
}
