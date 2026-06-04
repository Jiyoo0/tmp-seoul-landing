import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = resolve(new URL(".", import.meta.url).pathname);
const port = Number(process.env.PORT || 4174);

loadEnv();

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".ttf": "font/ttf",
};

const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/apply") {
      await handleApply(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "method_not_allowed" });
      return;
    }

    const url = new URL(req.url || "/", `http://localhost:${port}`);
    const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const filePath = resolve(join(root, pathname));

    if (!filePath.startsWith(root) || !existsSync(filePath)) {
      sendText(res, 404, "not found");
      return;
    }

    const body = await readFile(filePath);
    res.writeHead(200, { "content-type": contentTypes[extname(filePath)] || "application/octet-stream" });
    if (req.method === "GET") res.end(body);
    else res.end();
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "server_error" });
  }
});

server.listen(port, () => {
  console.log(`tmp Seoul mockup server running at http://127.0.0.1:${port}/`);
});

async function handleApply(req, res) {
  const config = getNotionConfig();
  if (!config.ok) {
    sendJson(res, 500, { error: "missing_notion_config", missing: config.missing });
    return;
  }

  const data = await readJson(req);
  const required = ["name", "phone", "email", "linkedin", "link", "building"];
  const missing = required.filter((key) => !String(data[key] || "").trim());

  if (missing.length) {
    sendJson(res, 400, { error: "missing_fields", missing });
    return;
  }

  const notionResponse = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "content-type": "application/json",
      "notion-version": "2026-03-11",
    },
    body: JSON.stringify({
      parent: {
        [process.env.NOTION_PARENT_TYPE || "data_source_id"]: process.env.NOTION_PARENT_ID,
      },
      properties: buildProperties(data),
    }),
  });

  const notionBody = await notionResponse.json().catch(() => ({}));

  if (!notionResponse.ok) {
    console.error("Notion API error", notionResponse.status, notionBody);
    sendJson(res, 502, { error: "notion_api_error", detail: notionBody });
    return;
  }

  sendJson(res, 200, { ok: true, notionPageId: notionBody.id, notionUrl: notionBody.url });
}

function buildProperties(data) {
  const props = {};
  props[env("NOTION_TITLE_PROPERTY", "Name")] = { title: richText(data.name) };
  props[env("NOTION_PHONE_PROPERTY", "Phone")] = { rich_text: richText(data.phone) };
  props[env("NOTION_EMAIL_PROPERTY", "Email")] = { email: data.email };
  props[env("NOTION_LINKEDIN_PROPERTY", "LinkedIn")] = { url: data.linkedin };
  props[env("NOTION_LINK_PROPERTY", "Link")] = { url: data.link };
  props[env("NOTION_BUILDING_PROPERTY", "Building")] = { rich_text: richText(data.building) };
  return props;
}

function richText(content) {
  return [{ type: "text", text: { content: String(content || "") } }];
}

function getNotionConfig() {
  const required = ["NOTION_TOKEN", "NOTION_PARENT_ID"];
  const missing = required.filter((key) => !process.env[key]);
  return { ok: missing.length === 0, missing };
}

function env(key, fallback) {
  return process.env[key] || fallback;
}

function loadEnv() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
}
