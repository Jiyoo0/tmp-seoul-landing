module.exports = async function applyHandler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "method_not_allowed" });
  }

  const config = getNotionConfig();
  if (!config.ok) {
    return sendJson(res, 500, { error: "missing_notion_config", missing: config.missing });
  }

  const data = await getBody(req);
  const required = ["name", "phone", "email", "linkedin", "link", "building"];
  const missing = required.filter((key) => !String(data[key] || "").trim());

  if (missing.length) {
    return sendJson(res, 400, { error: "missing_fields", missing });
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
    return sendJson(res, 502, { error: "notion_api_error", detail: notionBody });
  }

  return sendJson(res, 200, { ok: true, notionPageId: notionBody.id, notionUrl: notionBody.url });
};

function buildProperties(data) {
  const props = {};
  props[env("NOTION_TITLE_PROPERTY", "Your name")] = { title: richText(data.name) };
  props[env("NOTION_PHONE_PROPERTY", "Phone number")] = { rich_text: richText(data.phone) };
  props[env("NOTION_EMAIL_PROPERTY", "Email")] = { email: data.email };
  props[env("NOTION_LINKEDIN_PROPERTY", "LinkedIn URL")] = { url: data.linkedin };
  props[env("NOTION_LINK_PROPERTY", "GitHub / Personal link")] = { url: data.link };
  props[env("NOTION_BUILDING_PROPERTY", "지금 무엇을 만들고 계신가요?")] = { rich_text: richText(data.building) };
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

async function getBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  let body = "";
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
