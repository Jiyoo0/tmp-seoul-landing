import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";

const landing = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const application = readFileSync(new URL("./application.html", import.meta.url), "utf8");
const submitted = readFileSync(new URL("./submitted.html", import.meta.url), "utf8");
const server = readFileSync(new URL("./server.mjs", import.meta.url), "utf8");
const vercelApi = readFileSync(new URL("./api/apply.js", import.meta.url), "utf8");

assert.match(landing, /href="\.\/application\.html"/, "landing apply link points to application page");

for (const name of ["name", "phone", "email", "linkedin", "link", "building"]) {
  assert.match(application, new RegExp(`name="${name}"`), `application includes ${name} field`);
}

assert.match(application, /id="application-form"/, "application form has a stable form id");
assert.match(application, /type="email"/, "email field uses email input type");
assert.match(application, /type="tel"/, "phone field uses tel input type");
assert.match(application, /data-step="1"/, "application has first step");
assert.match(application, /data-step="2"/, "application has second step");
assert.match(application, /type="submit"/, "application form has submit button");
assert.match(application, /submitted\.html/, "application redirects to submitted page after submit");
assert.match(submitted, /<h1 id="submitted-title">application received<\/h1>/, "submitted page confirms application receipt");
assert.match(submitted, /지원서가 접수되었습니다\./, "submitted page includes Korean receipt confirmation");
assert.match(submitted, /href="\.\/index\.html"/, "submitted page links back to landing");
assert.match(application, /localStorage\.setItem\("tmp-seoul-application-draft"/, "application stores a local draft before redirecting");
assert.match(server, /https:\/\/api\.notion\.com\/v1\/pages/, "server creates Notion pages");
assert.match(server, /"notion-version": "2026-03-11"/, "server uses current Notion API version");
assert.match(vercelApi, /module\.exports/, "Vercel API exports a serverless handler");
assert.match(vercelApi, /https:\/\/api\.notion\.com\/v1\/pages/, "Vercel API creates Notion pages");
