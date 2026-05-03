#!/usr/bin/env node
/**
 * HiveAddressScreen MCP Server — pre-settlement on-chain risk screen.
 *
 * Exposes the C23 GoPlus address-risk endpoint as MCP tools,
 * proxying to the hivemorph backend.
 *
 * Protocol:  MCP 2024-11-05 / Streamable-HTTP / JSON-RPC 2.0
 * Transport: POST /mcp
 * Discovery: GET /.well-known/mcp.json
 * Health:    GET /health
 * Brand:     Hive Civilization gold #FFB800
 * Patent:    USPTO Provisional 64/055,601, Claim C23
 *
 * Copyright 2026 Stephen A. Rotzin, Hive Civilization.
 * Inventor: Stephen A. Rotzin, 170 Greenway Dr, Walnut Creek CA 94596.
 */

import express from 'express';

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT || 3000;
const HIVE_BASE = process.env.HIVE_BASE || 'https://hivemorph.onrender.com';
const BRAND_GOLD = '#FFB800';
const PATENT = 'USPTO 64/055,601';
const SERVICE = 'hive-mcp-address-screen';
const VERSION = '1.0.0';

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'address_screen',
    description:
      'Screen an on-chain address against 17 GoPlus risk vectors (C23). ' +
      'Returns the full backend response: screen_id, address, chain_id, ' +
      'decision (CLEAR|FLAG), flags_hit[], malicious_contracts_created, ' +
      'raw GoPlus data, and an Ed25519-signed C18 receipt. ' +
      'Real rail — no mock. Default chain: Base (8453).',
    inputSchema: {
      type: 'object',
      required: ['address'],
      properties: {
        address: {
          type: 'string',
          description: 'EVM address to screen (0x-prefixed, 42 chars)',
        },
        chain_id: {
          type: 'integer',
          description: 'EVM chain ID (default: 8453 = Base)',
          default: 8453,
        },
      },
    },
  },
  {
    name: 'address_screen_clear_only',
    description:
      'Convenience wrapper around address_screen (C23). ' +
      'Returns is_clear (boolean) and flags_hit (string[]). ' +
      'Use when you only need a pass/fail signal without the full receipt payload. ' +
      'Real rail — no mock. Default chain: Base (8453).',
    inputSchema: {
      type: 'object',
      required: ['address'],
      properties: {
        address: {
          type: 'string',
          description: 'EVM address to screen (0x-prefixed, 42 chars)',
        },
        chain_id: {
          type: 'integer',
          description: 'EVM chain ID (default: 8453 = Base)',
          default: 8453,
        },
      },
    },
  },
];

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function hivePost(path, body) {
  const res = await fetch(`${HIVE_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  let data;
  try { data = await res.json(); } catch { data = { raw: await res.text() }; }
  return { data, status: res.status };
}

// ─── Tool execution ───────────────────────────────────────────────────────────

async function executeTool(name, args) {
  const address = args.address;
  const chain_id = args.chain_id ?? 8453;

  switch (name) {
    case 'address_screen': {
      const { data, status } = await hivePost('/v1/attest/address/screen', { address, chain_id });
      return { type: 'text', text: JSON.stringify({ status, ...data }, null, 2) };
    }

    case 'address_screen_clear_only': {
      const { data, status } = await hivePost('/v1/attest/address/screen', { address, chain_id });
      if (status !== 200 || !data.decision) {
        return {
          type: 'text',
          text: JSON.stringify({
            is_clear: null,
            flags_hit: [],
            error: data.error ?? data.detail ?? `Unexpected status ${status}`,
          }, null, 2),
        };
      }
      return {
        type: 'text',
        text: JSON.stringify({
          is_clear: data.decision === 'CLEAR',
          flags_hit: data.flags_hit ?? [],
          decision: data.decision,
          screen_id: data.screen_id,
          address: data.address,
          chain_id: data.chain_id,
        }, null, 2),
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── MCP JSON-RPC handler ─────────────────────────────────────────────────────

app.post('/mcp', async (req, res) => {
  const { jsonrpc, id, method, params } = req.body || {};
  if (jsonrpc !== '2.0') {
    return res.json({ jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid JSON-RPC' } });
  }
  try {
    switch (method) {
      case 'initialize':
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: { listChanged: false } },
            serverInfo: {
              name: SERVICE,
              version: VERSION,
              description:
                'HiveAddressScreen MCP shim — pre-settlement on-chain risk screen. ' +
                '17-vector GoPlus rail. Ed25519-signed C18 receipts. ' +
                `${PATENT} claim C23.`,
            },
          },
        });

      case 'tools/list':
        return res.json({ jsonrpc: '2.0', id, result: { tools: TOOLS } });

      case 'tools/call': {
        const { name, arguments: args } = params || {};
        const out = await executeTool(name, args || {});
        return res.json({ jsonrpc: '2.0', id, result: { content: [out] } });
      }

      case 'ping':
        return res.json({ jsonrpc: '2.0', id, result: {} });

      default:
        return res.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        });
    }
  } catch (err) {
    return res.json({ jsonrpc: '2.0', id, error: { code: -32000, message: err.message } });
  }
});

// ─── Discovery + health ───────────────────────────────────────────────────────

app.get('/health', (req, res) =>
  res.json({
    status: 'ok',
    service: SERVICE,
    version: VERSION,
    backend: HIVE_BASE,
    tools: TOOLS.length,
    patent: PATENT,
    claim: 'C23',
  })
);

app.get('/.well-known/mcp.json', (req, res) =>
  res.json({
    name: SERVICE,
    endpoint: '/mcp',
    transport: 'streamable-http',
    protocol: '2024-11-05',
    tools: TOOLS.map(t => ({ name: t.name, description: t.description })),
  })
);

app.get('/.well-known/agent.json', (req, res) =>
  res.json({
    name: SERVICE,
    description:
      'HiveAddressScreen MCP shim — pre-settlement on-chain risk screen. ' +
      `17-vector GoPlus rail. Ed25519-signed C18 receipts. ${PATENT} claim C23.`,
    url: `https://${SERVICE}.onrender.com`,
    version: VERSION,
    provider: {
      organization: 'Hive Civilization',
      url: 'https://www.thehiveryiq.com',
      contact: 'steve@thehiveryiq.com',
    },
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    authentication: { schemes: [] },
    defaultInputModes: ['application/json'],
    defaultOutputModes: ['application/json'],
    skills: TOOLS.map(t => ({ name: t.name, description: t.description })),
  })
);

app.get('/seo.json', (req, res) =>
  res.json({
    title: `${SERVICE} · Pre-settlement on-chain risk screen`,
    description:
      `MCP server exposing C23 GoPlus address-risk rail. ${PATENT}. ` +
      '17-vector screen. Ed25519-signed receipts. Real rail on Base (USDC).',
    keywords: [
      'mcp',
      'address-risk',
      'goplus',
      'on-chain-compliance',
      'hive-civilization',
      'ed25519',
      'attestation',
      'base',
      'usdc',
      'agentic',
    ],
    brand_color: BRAND_GOLD,
  })
);

app.get('/', (req, res) => {
  res.type('text/html; charset=utf-8').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>hive-mcp-address-screen · Pre-settlement on-chain risk screen</title>
  <meta name="description" content="MCP server exposing C23 GoPlus address-risk rail. 17-vector screen. Ed25519-signed C18 receipts. ${PATENT}."/>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #f0f0f0; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { color: ${BRAND_GOLD}; }
    code { background: #1a1a1a; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
    a { color: ${BRAND_GOLD}; }
    .badge { display: inline-block; background: ${BRAND_GOLD}; color: #000; padding: 3px 10px; border-radius: 4px; font-weight: bold; font-size: 0.85em; margin: 2px; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; }
    th, td { border: 1px solid #333; padding: 8px 12px; text-align: left; }
    th { background: #1a1a1a; color: ${BRAND_GOLD}; }
  </style>
</head>
<body>
  <h1>hive-mcp-address-screen</h1>
  <p><strong>Pre-settlement on-chain risk screen for autonomous agents</strong></p>
  <p>
    <span class="badge">C23</span>
    <span class="badge">GoPlus 17-vector</span>
    <span class="badge">${PATENT}</span>
  </p>
  <p>${TOOLS.length} MCP tools. Real rail. Default chain: Base (8453).</p>
  <p>Backend: <code>${HIVE_BASE}</code></p>
  <p>MCP endpoint: <code>POST /mcp</code> (JSON-RPC 2.0, MCP 2024-11-05)</p>
  <table>
    <tr><th>Tool</th><th>Purpose</th></tr>
    <tr><td><code>address_screen</code></td><td>Full 17-vector screen — returns complete response + signed C18 receipt</td></tr>
    <tr><td><code>address_screen_clear_only</code></td><td>Convenience — returns is_clear (bool) + flags_hit list only</td></tr>
  </table>
  <hr/>
  <p>Patent claim: C23 (${PATENT})</p>
  <p>Inventor: Stephen A. Rotzin, 170 Greenway Dr, Walnut Creek CA 94596</p>
</body>
</html>`);
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`HiveAddressScreen MCP Server running on :${PORT}`);
  console.log(`  Backend : ${HIVE_BASE}`);
  console.log(`  Tools   : ${TOOLS.length}`);
  console.log(`  Patent  : ${PATENT} (C23)`);
});
