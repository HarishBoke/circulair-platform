import { PilotError, PILOT_MAX_BYTES } from "./localPilotContract";
/** No silent last-key-wins decoding for captured readings. JSON.parse remains the grammar authority. */
export function parsePilotJson(raw: Uint8Array): unknown {
  if (raw.byteLength > PILOT_MAX_BYTES) throw new PilotError(413, "pilot_payload_too_large");
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(raw); } catch { throw new PilotError(400, "pilot_input_invalid"); }
  const stack: Array<Set<string> | null> = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      const start = i++;
      for (; i < text.length; i++) {
        if (text[i] === "\\") { i++; continue; }
        if (text[i] === '"') break;
      }
      let next = i + 1; while (/\s/.test(text[next] ?? "") && next < text.length) next++;
      if (text[next] === ":") {
        let key: string; try { key = JSON.parse(text.slice(start, i + 1)); } catch { throw new PilotError(400, "pilot_input_invalid"); }
        const keys = stack[stack.length - 1];
        if (!keys || keys.has(key)) throw new PilotError(400, "pilot_duplicate_or_invalid_json_key");
        keys.add(key);
      }
    } else if (char === "{" || char === "[") {
      stack.push(char === "{" ? new Set() : null);
      if (stack.length > 16) throw new PilotError(400, "pilot_json_too_deep");
    } else if (char === "}" || char === "]") stack.pop();
  }
  try { return JSON.parse(text); } catch { throw new PilotError(400, "pilot_input_invalid"); }
}
