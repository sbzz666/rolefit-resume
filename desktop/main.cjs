const { app, BrowserWindow, ipcMain, safeStorage } = require("electron");
const { readFile, writeFile, mkdir } = require("node:fs/promises");
const path = require("node:path");

let sessionKey = "";
const defaultModel = "deepseek-flash";

function configPath() {
  return path.join(app.getPath("userData"), "deepseek.json");
}

async function readConfigFile() {
  try {
    return JSON.parse(await readFile(configPath(), "utf8"));
  } catch {
    return {};
  }
}

async function currentKey(temporaryKey = "") {
  if (typeof temporaryKey === "string" && temporaryKey.trim()) return temporaryKey.trim();
  if (sessionKey) return sessionKey;
  const config = await readConfigFile();
  if (!config.encryptedKey || !safeStorage.isEncryptionAvailable()) return "";
  try {
    return safeStorage.decryptString(Buffer.from(config.encryptedKey, "base64"));
  } catch {
    return "";
  }
}

async function fetchModels(key) {
  const response = await fetch("https://api.deepseek.com/models", {
    headers: { Authorization: `Bearer ${key}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `连接失败（${response.status}）`);
  return (payload.data || []).map(item => ({ id: item.id, name: item.name || item.id }));
}

async function generateWithDeepSeek(input, key, model) {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      thinking: { type: "disabled" },
      temperature: 0.75,
      max_tokens: 2200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "你是中文技术岗位简历专家。仅返回合法 JSON，不要 Markdown。内容紧凑、项目导向、动词开头、突出架构与技术选型。必须贴合 JD，但不得虚构任职公司、学历、证书或已经取得的业绩。未提供真实经历时只能生成明确标注为‘模拟项目’的作品集方案；所有指标使用【待实测】或【待填写】，不得捏造数字。技能必须标注为待本人确认。JSON 结构：{headline:string,profileBullets:string[],educationHighlights:string[],projects:[{title:string,type:'真实经历草稿'|'模拟项目',date:string,techStack:string[],bullets:string[]}],skillGroups:[{name:string,items:string[]}],reviewNotes:string[]}" },
        { role: "user", content: `目标公司：${input.company}\n目标职位：${input.role}\n工作年限：${input.years || "未提供"}\n学校：${input.school || "未提供"}\n专业学历：${input.education || "未提供"}\n职位 JD：\n${input.jd}\n\n候选人提供的基础信息：\n${input.background || "未提供，请生成模拟项目"}` }
      ]
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `DeepSeek 请求失败（${response.status}）`);
  const content = payload?.choices?.[0]?.message?.content || payload?.choices?.[0]?.message?.reasoning_content;
  if (!content) throw new Error("DeepSeek 未返回正文");
  return JSON.parse(String(content).replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim());
}

function registerIpc() {
  ipcMain.handle("desktop:get-config", async () => {
    const config = await readConfigFile();
    return { desktop: true, hasKey: Boolean(await currentKey()), model: config.model || defaultModel, saveKey: Boolean(config.encryptedKey), encryptionAvailable: safeStorage.isEncryptionAvailable() };
  });

  ipcMain.handle("desktop:test-connection", async (_event, input = {}) => {
    const key = await currentKey(input.key);
    if (!key) throw new Error("请先填写 DeepSeek API Key");
    return { models: await fetchModels(key) };
  });

  ipcMain.handle("desktop:save-config", async (_event, input = {}) => {
    const key = typeof input.key === "string" ? input.key.trim() : "";
    const existingKey = await currentKey();
    const effectiveKey = key || existingKey;
    const model = typeof input.model === "string" && input.model.trim() ? input.model.trim() : defaultModel;
    const saveKey = Boolean(input.saveKey);
    if (saveKey && effectiveKey && !safeStorage.isEncryptionAvailable()) throw new Error("当前系统无法安全保存 Key，请选择仅本次使用");
    sessionKey = effectiveKey;
    const stored = { model };
    if (saveKey && effectiveKey) stored.encryptedKey = safeStorage.encryptString(effectiveKey).toString("base64");
    await mkdir(path.dirname(configPath()), { recursive: true });
    await writeFile(configPath(), JSON.stringify(stored, null, 2), { encoding: "utf8", mode: 0o600 });
    return { hasKey: Boolean(effectiveKey), model, saveKey: Boolean(stored.encryptedKey) };
  });

  ipcMain.handle("desktop:generate", async (_event, input = {}) => {
    if (!input.company || !input.role || !input.jd) throw new Error("缺少公司、职位或 JD");
    const config = await readConfigFile();
    const key = await currentKey();
    if (!key) throw new Error("尚未配置 DeepSeek API Key");
    const model = config.model || defaultModel;
    return { result: await generateWithDeepSeek(input, key, model), model };
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: "#f4f1e8",
    title: "RoleFit",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  window.removeMenu();
  window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on("window-all-closed", () => app.quit());

