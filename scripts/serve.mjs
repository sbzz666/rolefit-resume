import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
const deepseekKey = process.env.DEEPSEEK_API_KEY;
const deepseekModel = process.env.DEEPSEEK_MODEL || "deepseek-flash";

function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(value));
}

async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 200_000) throw new Error("请求内容过长");
  }
  return JSON.parse(body || "{}");
}

async function generateWithDeepSeek(input) {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${deepseekKey}` },
    body: JSON.stringify({
      model: deepseekModel,
      thinking: { type: "disabled" },
      temperature: 0.75,
      max_tokens: 2200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "你是中文技术岗位简历专家。仅返回合法 JSON，不要 Markdown。参考高质量中文校招/社招技术简历：内容紧凑、项目导向、动词开头、突出架构与技术选型、每个项目4到6条要点。必须贴合 JD，但不得虚构任职公司、学历、证书或已经取得的业绩。未提供真实经历时只能生成明确标注为‘模拟项目’的作品集方案；所有指标使用【待实测】或【待填写】，不得捏造数字。技能必须标注为待本人确认。JSON 结构：{headline:string,profileBullets:string[],educationHighlights:string[],projects:[{title:string,type:'真实经历草稿'|'模拟项目',date:string,techStack:string[],bullets:string[]}],skillGroups:[{name:string,items:string[]}],reviewNotes:string[]}" },
        { role: "user", content: `目标公司：${input.company}\n目标职位：${input.role}\n工作年限：${input.years || "未提供"}\n学校：${input.school || "未提供"}\n专业学历：${input.education || "未提供"}\n职位 JD：\n${input.jd}\n\n候选人提供的基础信息：\n${input.background || "未提供，请生成模拟项目"}` }
      ]
    })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || `DeepSeek 请求失败（${response.status}）`);
  const message = payload?.choices?.[0]?.message || {};
  const content = message.content || message.reasoning_content;
  if (!content) {
    const finish = payload?.choices?.[0]?.finish_reason || "unknown";
    throw new Error(`DeepSeek 未返回正文（finish_reason: ${finish}）`);
  }
  const normalized = String(content).replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(normalized);
}

http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    if (requestUrl.pathname === "/api/status") return sendJson(res, 200, { provider: "DeepSeek", configured: Boolean(deepseekKey), model: deepseekModel });
    if (requestUrl.pathname === "/api/generate" && req.method === "POST") {
      if (!deepseekKey) return sendJson(res, 503, { error: "服务端尚未配置 DEEPSEEK_API_KEY" });
      const input = await readJson(req);
      if (!input.company || !input.role || !input.jd) return sendJson(res, 400, { error: "缺少公司、职位或 JD" });
      return sendJson(res, 200, { result: await generateWithDeepSeek(input), model: deepseekModel });
    }
    const urlPath = decodeURIComponent(requestUrl.pathname);
    const requested = path.resolve(root, `.${urlPath === "/" ? "/index.html" : urlPath}`);
    if (!requested.startsWith(root) || !(await stat(requested)).isFile()) throw new Error("Not found");
    res.writeHead(200, { "Content-Type": mime[path.extname(requested)] || "application/octet-stream" });
    res.end(await readFile(requested));
  } catch (error) {
    if (req.url?.startsWith("/api/")) return sendJson(res, 500, { error: error.message || "生成失败" });
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Not found");
  }
}).listen(port, host, () => console.log(`Server: http://${host}:${port}`));

