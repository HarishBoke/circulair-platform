# Circul-AI-r MCP Integration Guide

**Version:** 1.0.0  
**Protocol:** MCP 2024-11-05  
**Endpoint:** `/api/mcp`

---

## What is MCP?

The **Model Context Protocol (MCP)** is an open standard that enables AI agents (Claude, GPT, Gemini, custom agents) to discover and invoke platform capabilities through a standardized interface. Instead of writing custom API integrations for each AI system, MCP provides a universal contract that any compliant agent can use.

Circul-AI-r implements an MCP server that exposes battery lifecycle management as **tools**, **resources**, and **prompts** — the three primitives of the MCP specification.

---

## Quick Start

### 1. Discover Available Tools

```bash
curl -X POST https://your-domain.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

### 2. Call a Tool

```bash
curl -X POST https://your-domain.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_battery",
      "arguments": {
        "bpan": "IN-TAT-LFP-A3-X7K9M2P4"
      }
    }
  }'
```

### 3. Read a Resource

```bash
curl -X POST https://your-domain.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "resources/read",
    "params": {
      "uri": "circulair://analytics/kpis"
    }
  }'
```

---

## Available Tools (20)

### Battery Registry

| Tool | Description | Required Parameters |
|---|---|---|
| `get_battery` | Get battery details by BPAN | `bpan` |
| `list_batteries` | List batteries with filters | — (optional: search, status, chemistry, limit, offset) |
| `get_battery_stats` | Fleet-wide statistics | — |

### Telemetry

| Tool | Description | Required Parameters |
|---|---|---|
| `get_telemetry` | Latest telemetry reading | `bpan` |
| `get_telemetry_history` | Historical telemetry data | `bpan` |

### SOH Prediction

| Tool | Description | Required Parameters |
|---|---|---|
| `get_soh_prediction` | AI SOH prediction with RUL | `bpan` |

### Warranty

| Tool | Description | Required Parameters |
|---|---|---|
| `check_warranty` | Check warranty by BPAN | `bpan` |
| `lookup_warranty` | Multi-channel warranty search | `channel`, `value` |
| `get_warranty_stats` | Warranty statistics | — |

### Marketplace

| Tool | Description | Required Parameters |
|---|---|---|
| `list_marketplace` | Browse marketplace listings | — (optional: listingType, limit, offset) |
| `get_marketplace_stats` | Marketplace statistics | — |

### Compliance

| Tool | Description | Required Parameters |
|---|---|---|
| `get_epr_stats` | EPR compliance statistics | — |
| `list_epr_tokens` | List EPR tokens | — (optional: limit) |

### Analytics

| Tool | Description | Required Parameters |
|---|---|---|
| `get_platform_kpis` | Platform-wide KPIs | — |
| `get_audit_stats` | Audit log statistics | — |
| `get_security_stats` | Security event statistics | — |

### Agent Operations

| Tool | Description | Required Parameters |
|---|---|---|
| `log_agent_action` | Log an agent action | `actionType`, `module`, `description` |
| `get_agent_activity` | Recent agent activity | — (optional: limit) |

---

## Available Resources (5)

Resources provide bulk data access for AI agents that need to analyze or reason over larger datasets.

| URI | Name | Description |
|---|---|---|
| `circulair://batteries` | Battery Registry | All registered batteries (up to 100) |
| `circulair://warranties` | Warranty Records | All warranty registrations (up to 100) |
| `circulair://marketplace` | Marketplace Listings | Active marketplace listings (up to 100) |
| `circulair://compliance/epr` | EPR Compliance | EPR compliance tokens (up to 100) |
| `circulair://analytics/kpis` | Platform KPIs | Platform-wide key performance indicators |

---

## Available Prompts (4)

Prompts provide pre-built context packages that agents can use to generate reports and analyses. Each prompt returns a structured message with all relevant data pre-loaded.

| Prompt | Description | Arguments |
|---|---|---|
| `battery_health_report` | Comprehensive health report for a specific battery | `bpan` (required) |
| `fleet_overview` | Fleet-wide overview with metrics and insights | — |
| `warranty_analysis` | Warranty data analysis with claim patterns | — |
| `compliance_summary` | Compliance summary covering EPR, audit, and security | — |

### Example: Get a Battery Health Report Prompt

```bash
curl -X POST https://your-domain.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "prompts/get",
    "params": {
      "name": "battery_health_report",
      "arguments": {
        "bpan": "IN-TAT-LFP-A3-X7K9M2P4"
      }
    }
  }'
```

The response includes a pre-built message with battery data, telemetry, SOH prediction, and warranty information that an AI agent can use to generate a comprehensive health report.

---

## Configuring AI Agents

### Claude Desktop (claude_desktop_config.json)

```json
{
  "mcpServers": {
    "circulair": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-client-http"],
      "env": {
        "MCP_SERVER_URL": "https://your-domain.com/api/mcp"
      }
    }
  }
}
```

### Custom Python Agent

```python
import requests

MCP_URL = "https://your-domain.com/api/mcp"

def mcp_call(method, params=None):
    response = requests.post(MCP_URL, json={
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params or {}
    })
    return response.json()["result"]

# List available tools
tools = mcp_call("tools/list")

# Check a battery
battery = mcp_call("tools/call", {
    "name": "get_battery",
    "arguments": {"bpan": "IN-TAT-LFP-A3-X7K9M2P4"}
})

# Check warranty by phone
warranty = mcp_call("tools/call", {
    "name": "lookup_warranty",
    "arguments": {"channel": "phone", "value": "+919876543210"}
})
```

### Custom Node.js Agent

```javascript
const fetch = require('node-fetch');

const MCP_URL = 'https://your-domain.com/api/mcp';

async function mcpCall(method, params = {}) {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const data = await res.json();
  return data.result;
}

// Get fleet overview prompt for AI analysis
const prompt = await mcpCall('prompts/get', {
  name: 'fleet_overview',
  arguments: {},
});
```

---

## Convenience REST Endpoints

For simpler integrations that do not need the full JSON-RPC protocol, the MCP server also exposes REST endpoints:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/mcp` | Server info and capabilities |
| GET | `/api/mcp/tools` | List all available tools |
| GET | `/api/mcp/resources` | List all available resources |
| GET | `/api/mcp/prompts` | List all available prompts |

---

## Audit Trail

Every `tools/call` invocation is automatically logged to the platform's audit system. The Super Admin panel shows all MCP tool calls with timestamps, parameters, and results. This ensures full traceability for compliance purposes.
