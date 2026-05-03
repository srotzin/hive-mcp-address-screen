# v1.0.0 — HiveAddressScreen MCP Server

**Released:** 2026-05-03

## What's new

Initial release of the `hive-mcp-address-screen` MCP shim.

Exposes the C23 GoPlus address-risk endpoint as two MCP tools, enabling autonomous agents to screen on-chain addresses before settlement on Base (USDC, chain ID 8453).

## Tools

| Tool | Description |
|------|-------------|
| `address_screen` | Full 17-vector GoPlus screen — returns complete response including Ed25519-signed C18 receipt |
| `address_screen_clear_only` | Convenience wrapper — returns `is_clear` (boolean) and `flags_hit[]` only |

## Backend

- Endpoint: `POST https://hivemorph.onrender.com/v1/attest/address/screen`
- Provider: GoPlus Security
- Vectors: 17 (cybercrime, money laundering, sanctioned, phishing, mixer, and 12 more)
- Receipt: Ed25519-signed C18 attestation warranty (every response)
- Default chain: Base (8453)

## Protocol

- MCP 2024-11-05 / Streamable-HTTP / JSON-RPC 2.0
- Node.js ESM, Express
- `GET /health` · `GET /.well-known/mcp.json` · `POST /mcp`

## Connect

```json
{
  "mcpServers": {
    "hive-address-screen": {
      "url": "https://hive-mcp-address-screen.onrender.com/mcp",
      "transport": "streamable-http"
    }
  }
}
```

## Patent

Patent claim: C23 (USPTO 64/055,601)  
Inventor: Stephen A. Rotzin, Hive Civilization
