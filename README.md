# hive-mcp-address-screen

**Pre-settlement on-chain risk screen for autonomous agents.**

17-vector GoPlus address-risk rail. Every response includes an Ed25519-signed C18 attestation receipt from the Hive backend. Real rail on Base (USDC chain ID 8453) — no mocks.

<div align="center">
  <img src="https://img.shields.io/badge/MCP-2024--11--05-FFB800?style=flat-square&labelColor=000" alt="MCP 2024-11-05"/>
  <img src="https://img.shields.io/badge/Chain-Base%208453-FFB800?style=flat-square&labelColor=000" alt="Base 8453"/>
  <img src="https://img.shields.io/badge/Rail-GoPlus%2017--vector-FFB800?style=flat-square&labelColor=000" alt="GoPlus 17-vector"/>
  <img src="https://img.shields.io/badge/Receipt-Ed25519%20C18-FFB800?style=flat-square&labelColor=000" alt="Ed25519 C18 receipt"/>
  <img src="https://img.shields.io/badge/License-MIT-FFB800?style=flat-square&labelColor=000" alt="MIT"/>
</div>

---

## MCP Tools

| Tool | Input | Output |
|------|-------|--------|
| `address_screen` | `address` (string, required), `chain_id` (integer, default 8453) | Full backend response: `screen_id`, `address`, `chain_id`, `decision` (CLEAR\|FLAG), `flags_hit[]`, `malicious_contracts_created`, `raw` GoPlus data, Ed25519-signed `receipt` (C18), `_meta` |
| `address_screen_clear_only` | `address` (string, required), `chain_id` (integer, default 8453) | `is_clear` (boolean), `flags_hit[]`, `decision`, `screen_id`, `address`, `chain_id` |

Both tools call the same live backend. `address_screen_clear_only` is a lightweight convenience wrapper that strips the full receipt when you only need a pass/fail signal.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/mcp` | JSON-RPC 2.0 MCP endpoint |
| `GET` | `/health` | Service health check |
| `GET` | `/.well-known/mcp.json` | MCP discovery manifest |
| `GET` | `/.well-known/agent.json` | A2A agent card |
| `GET` | `/seo.json` | SEO metadata |

---

## Backend

| Field | Value |
|-------|-------|
| Endpoint | `POST https://hivemorph.onrender.com/v1/attest/address/screen` |
| Body | `{"address":"<0x...>","chain_id":8453}` |
| Provider | GoPlus Security (17-vector address risk) |
| Receipt | Ed25519-signed (C18 attestation warranty) |
| Chain (default) | Base — chain ID 8453 |

### Example request

```bash
curl -X POST https://hivemorph.onrender.com/v1/attest/address/screen \
  -H "Content-Type: application/json" \
  -d '{"address":"0x15184Bf50B3d3F52b60434f8942b7D52F2eB436E","chain_id":8453}'
```

### Example response (CLEAR)

```json
{
  "screen_id": "addrca8431d8-...",
  "address": "0x15184bf50b3d3f52b60434f8942b7d52f2eb436e",
  "chain_id": 8453,
  "decision": "CLEAR",
  "flags_hit": [],
  "malicious_contracts_created": 0,
  "raw": { "cybercrime": "0", "money_laundering": "0", ... },
  "receipt": {
    "kind": "address_risk_screen_receipt",
    "decision": "CLEAR",
    "signing": { "algorithm": "EdDSA", "curve": "Ed25519", ... }
  },
  "_meta": { "patent": "USPTO 64/055,601", "claim": "C23" }
}
```

---

## Connect

### Claude / Cursor / any MCP-compatible host

Add to your MCP config:

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

### Run locally

```bash
git clone https://github.com/srotzin/hive-mcp-address-screen.git
cd hive-mcp-address-screen
npm install
node server.js
# Server on :3000
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP listen port |
| `HIVE_BASE` | `https://hivemorph.onrender.com` | Hive backend base URL |

---

## Protocol

- Transport: Streamable-HTTP
- Protocol version: MCP 2024-11-05
- Message format: JSON-RPC 2.0
- Methods supported: `initialize`, `tools/list`, `tools/call`, `ping`

---

## GoPlus Risk Vectors (17)

`cybercrime` · `money_laundering` · `gas_abuse` · `financial_crime` · `darkweb_transactions` · `reinit` · `phishing_activities` · `contract_address` · `fake_kyc` · `blacklist_doubt` · `fake_standard_interface` · `stealing_attack` · `blackmail_activities` · `sanctioned` · `malicious_mining_activities` · `mixer` · `fake_token` · `honeypot_related_address`

A `CLEAR` decision means all 17 vectors returned `"0"` and `malicious_contracts_created` is 0.

---

## License

MIT — see [LICENSE](LICENSE).

Patent claim: C23 (USPTO 64/055,601)

Inventor: Stephen A. Rotzin · [thehiveryiq.com](https://www.thehiveryiq.com) · steve@thehiveryiq.com
