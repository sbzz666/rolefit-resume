const $ = (selector) => document.querySelector(selector);
const fields = ["company","role","jd","name","years","city","email","phone","identity","school","education","portfolio","availability","background"];
const storageKey = "rolefit-resume-v1";
const resumeHtmlKey = `${storageKey}-html`;
let photoData = localStorage.getItem(`${storageKey}-photo`) || "";
let editMode = false;
let editSaveTimer;
const desktopApi = window.rolefitDesktop || null;

const keywordGroups = {
  "产品策略": ["产品规划","产品策略","路线图","roadmap","需求分析","需求管理","PRD","用户研究"],
  "数据分析": ["数据分析","SQL","指标体系","A/B","实验","漏斗","转化率","BI"],
  "项目管理": ["项目管理","跨部门","协同","推进","交付","敏捷","Scrum","风险管理"],
  "增长运营": ["增长","运营","获客","留存","商业化","用户增长","GMV","ROI"],
  "技术能力": ["Python","Java","JavaScript","React","Vue","AI","大模型","算法","架构","云计算"],
  "用户体验": ["用户体验","交互","UX","原型","Figma","可用性","设计系统"],
  "业务能力": ["行业研究","竞品分析","商业分析","B端","C端","SaaS","供应链","电商"]
};

function escapeHtml(value="") { return value.replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function splitBackground(text) { return text.split(/\n|；|;/).map(x => x.trim()).filter(Boolean).slice(0,7); }
function extractKeywords(jd) {
  const hits = [];
  for (const [group, words] of Object.entries(keywordGroups)) {
    const found = words.filter(word => jd.toLowerCase().includes(word.toLowerCase()));
    if (found.length) hits.push({ group, words: found });
  }
  const flat = [...new Set(hits.flatMap(x => x.words))];
  return { hits, flat: flat.slice(0,12) };
}
function roleFocus(role, keywords) {
  const top = keywords.slice(0,4).join("、") || "业务理解、项目推进与结果交付";
  return `具备${$("#years").value.trim() || "相关"}工作经验，聚焦${top}。能够从业务目标出发拆解问题，联动多方资源推动方案落地，并持续用数据验证结果。希望在${$("#company").value.trim()}担任${role}，为核心业务创造可衡量的价值。`;
}
function projectDraft(role, company, keywords, simulated) {
  const k = [...keywords, "需求分析", "项目交付", "效果复盘"];
  const prefix = simulated ? "模拟项目｜" : "岗位项目草稿｜";
  return [
    { title: `${prefix}${role}核心业务增长方案`, desc: `围绕${k.slice(0,3).join("、")}梳理业务机会，完成用户场景、需求优先级、产品方案与指标口径设计；输出可评审方案和验证计划，并以【请填写真实验证结果】复盘方案有效性。` },
    { title: `${prefix}${company || "目标公司"}同类场景效率优化`, desc: `针对岗位关注的${k.slice(2,5).join("、")}建立分析框架，识别流程瓶颈，设计跨团队协作与迭代机制；产出【原型/分析报告/可运行作品，请按实际选择】作为能力证明。` }
  ];
}
function score(jd, background, keywords) {
  if (!jd.trim()) return 0;
  const matched = keywords.filter(k => background.toLowerCase().includes(k.toLowerCase())).length;
  return Math.min(92, 46 + matched * 7 + Math.min(18, Math.floor(background.length / 80)));
}
function renderAI(data, company, role) {
  const contact = [$("#identity").value,$("#city").value,$("#phone").value,$("#email").value].filter(Boolean).map(escapeHtml).join(" ｜ ");
  const profileBullets = Array.isArray(data.profileBullets) ? data.profileBullets : [];
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const skillGroups = Array.isArray(data.skillGroups) ? data.skillGroups : [];
  const educationHighlights = Array.isArray(data.educationHighlights) ? data.educationHighlights : [];
  const notes = Array.isArray(data.reviewNotes) ? data.reviewNotes : [];
  $("#resumePreview").innerHTML = `
    <header class="resume-head tech-head"><div class="identity-block"><h1>${escapeHtml($("#name").value.trim() || "候选人姓名")}</h1><div class="target">${escapeHtml(data.headline || role)}</div><p>${contact || "基本信息待补充"}</p><p>${escapeHtml($("#portfolio").value.trim())}${$("#availability").value.trim() ? ` ｜ ${escapeHtml($("#availability").value.trim())}` : ""}</p></div>${photoData ? `<img class="resume-photo" src="${photoData}" alt="证件照">` : `<div class="resume-photo placeholder">照片</div>`}</header>
    <section><h3>个人概述</h3><ul>${profileBullets.map(x=>`<li>${escapeHtml(String(x))}</li>`).join("")}</ul></section>
    <section><h3>教育背景</h3><div class="education-line"><b>${escapeHtml($("#school").value.trim() || "学校名称待补充")}</b><span>${escapeHtml($("#education").value.trim() || "专业 / 学历待补充")}</span><span>${escapeHtml($("#years").value.trim() || "时间待补充")}</span></div>${educationHighlights.length ? `<ul>${educationHighlights.map(x=>`<li>${escapeHtml(String(x))}</li>`).join("")}</ul>` : ""}</section>
    <section><h3>项目经历</h3>${projects.map(p=>`<div class="project"><div class="project-title"><b>${escapeHtml(p.title || "项目方案")}</b><span>${escapeHtml(p.date || "")}</span></div><div class="tech-stack">技术栈：${(p.techStack || []).map(x=>escapeHtml(String(x))).join(" / ")}</div><div class="project-type">${escapeHtml(p.type || "模拟项目")}</div><ol>${(p.bullets || []).map(x=>`<li>${escapeHtml(String(x))}</li>`).join("")}</ol></div>`).join("")}</section>
    <section><h3>专业技能</h3><div class="skill-table">${skillGroups.map(g=>`<div><b>${escapeHtml(g.name || "技能")}</b><span>${(g.items || []).map(x=>escapeHtml(String(x))).join("、")}</span></div>`).join("")}</div><p class="draft-note">※ ${notes.map(x=>escapeHtml(String(x))).join("；") || "技能与项目数据须由本人核对；模拟项目不得写成真实任职经历。"}</p></section>`;
  $("#emptyState").classList.add("hidden"); $("#resumePreview").classList.remove("hidden"); save(); persistResume();
}
async function generate(event) {
  event?.preventDefault();
  const company = $("#company").value.trim(); const role = $("#role").value.trim(); const jd = $("#jd").value.trim();
  if (!company || !role || !jd) return notify("请先填写公司、职位名称和 JD");
  const background = $("#background").value.trim();
  notify("正在调用 DeepSeek 分析 JD…");
  try {
    const input = { company, role, jd, background, years:$("#years").value.trim(), school:$("#school").value.trim(), education:$("#education").value.trim() };
    let payload;
    if (desktopApi) payload = await desktopApi.generate(input);
    else {
      const response = await fetch("/api/generate", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(input) });
      payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "AI 生成失败");
    }
    renderAI(payload.result, company, role); notify(`已由 ${payload.model} 生成`); return;
  } catch (error) {
    notify(`${error.message}，已使用本地草稿`);
  }
  const simulated = !background; const { flat } = extractKeywords(jd);
  const projects = projectDraft(role, company, flat, simulated); const experiences = splitBackground(background);
  const contact = [$("#city").value,$("#phone").value,$("#email").value].filter(Boolean).map(escapeHtml).join(" · ");
  const match = score(jd, background, flat);
  $("#resumePreview").innerHTML = `
    <header class="resume-head"><h1>${escapeHtml($("#name").value.trim() || "候选人姓名")}</h1><div class="target">目标职位：${escapeHtml(company)} · ${escapeHtml(role)}</div><p>${contact || "城市 · 电话 · 邮箱"}</p></header>
    <div class="match-box"><span>当前 JD 关键词覆盖度<br>补充真实数据与相关经历可继续提升</span><strong>${match}%</strong></div>
    <section><h3>职业摘要</h3><p>${escapeHtml(roleFocus(role, flat))}</p></section>
    <section><h3>岗位技能建议（待本人确认）</h3><div class="skills">${(flat.length ? flat : ["业务分析","项目推进","协作沟通","结果导向"]).map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div></section>
    ${experiences.length ? `<section><h3>相关经历</h3><ul>${experiences.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul></section>` : ""}
    <section><h3>${simulated ? "模拟项目 / 作品集实践" : "岗位相关项目"}</h3>${projects.map(p=>`<p><b>${escapeHtml(p.title)}</b><br>${escapeHtml(p.desc)}</p>`).join("")}<p class="draft-note">※ ${simulated ? "以上为根据 JD 生成的模拟项目方案，不代表真实任职经历；完成对应作品后再用于投递。" : "项目内容为岗位贴合写作草稿，请仅保留真实参与内容，并替换占位符。"}</p></section>`;
  $("#emptyState").classList.add("hidden"); $("#resumePreview").classList.remove("hidden"); save(); persistResume(); notify("定制简历已生成，请核对事实与数据");
}
function plainText() { return $("#resumePreview").innerText.replace(/\n{3,}/g,"\n\n"); }
function exportName(extension) {
  const name = $("#name").value.trim() || "候选人";
  const role = $("#role").value.trim() || "目标岗位";
  const company = $("#company").value.trim() || "目标公司";
  return `${name}-${company}-${role}-简历.${extension}`;
}
let pendingExport="";
function openExportConfirm(type) {
  if ($("#resumePreview").classList.contains("hidden")) return notify("请先生成简历");
  pendingExport=type;
  const isPdf=type==="pdf";
  $("#confirmIcon").textContent=isPdf?"↓":"W";
  $("#confirmTitle").textContent=`确认导出 ${isPdf?"PDF":"Word"}？`;
  $("#confirmDescription").textContent=isPdf?"将生成 A4 PDF 并开始下载，适合直接投递或打印。":"将生成可继续编辑的 A4 Word 文档并开始下载。";
  $("#confirmFileName").textContent=exportName(isPdf?"pdf":"docx");
  $("#confirmExport").textContent=`确认导出 ${isPdf?"PDF":"Word"}`;
  const modal=$("#exportConfirmModal");
  modal.classList.remove("hidden"); modal.setAttribute("aria-hidden","false");
  $("#confirmExport").focus();
}
function closeExportConfirm() {
  const modal=$("#exportConfirmModal");
  modal.classList.add("hidden"); modal.setAttribute("aria-hidden","true"); pendingExport="";
}
async function downloadPdf() {
  if ($("#resumePreview").classList.contains("hidden")) return notify("请先生成简历");
  persistResume(); setEditMode(false); notify("正在生成 A4 PDF…");
  const source = $("#resumePreview");
  const previousStyle = source.getAttribute("style") || "";
  Object.assign(source.style,{width:"210mm",minHeight:"0",padding:"9mm 10mm",margin:"0",boxSizing:"border-box",boxShadow:"none",borderRadius:"0",background:"#ffffff"});
  try {
    await html2pdf().set({ margin:0, filename:exportName("pdf"), image:{type:"jpeg",quality:.98}, html2canvas:{scale:2,useCORS:true,backgroundColor:"#ffffff",scrollX:0,scrollY:0}, jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}, pagebreak:{mode:["css","legacy"],avoid:[".project","section"]} }).from(source).save();
    notify("A4 PDF 已下载");
  } catch(error) { notify(`PDF 导出失败：${error.message}`); }
  finally { source.setAttribute("style",previousStyle); }
}
async function downloadWord() {
  if ($("#resumePreview").classList.contains("hidden")) return notify("请先生成简历");
  persistResume(); setEditMode(false); notify("正在生成 A4 Word…");
  const {Document,Packer,Paragraph,TextRun,HeadingLevel,AlignmentType,BorderStyle,PageOrientation} = docx;
  const children=[]; const preview=$("#resumePreview");
  const addParagraph=(text,options={})=>children.push(new Paragraph({spacing:{after:options.after??80,line:276},alignment:options.alignment,runs:[new TextRun({text:text||"",bold:options.bold,size:options.size||19,font:"Microsoft YaHei"})]}));
  addParagraph(preview.querySelector("h1")?.innerText,{bold:true,size:32,alignment:AlignmentType.CENTER,after:30});
  addParagraph(preview.querySelector(".target")?.innerText,{bold:true,size:21,alignment:AlignmentType.CENTER,after:30});
  preview.querySelectorAll(".identity-block p").forEach(p=>addParagraph(p.innerText,{size:17,alignment:AlignmentType.CENTER,after:20}));
  preview.querySelectorAll("section").forEach(section=>{
    children.push(new Paragraph({heading:HeadingLevel.HEADING_2,spacing:{before:120,after:50},border:{bottom:{color:"222222",style:BorderStyle.SINGLE,size:10}},runs:[new TextRun({text:section.querySelector("h3")?.innerText||"",bold:true,size:24,font:"Microsoft YaHei"})]}));
    const education=section.querySelector(".education-line");
    if(education) addParagraph([...education.children].map(x=>x.innerText).join("    "),{bold:true,size:19});
    section.querySelectorAll(":scope > ul > li").forEach(li=>children.push(new Paragraph({text:li.innerText,bullet:{level:0},spacing:{after:35,line:260},style:"Normal"})));
    section.querySelectorAll(":scope > .project").forEach(project=>{
      const title=[...project.querySelectorAll(".project-title>*")].map(x=>x.innerText).join("    "); addParagraph(title,{bold:true,size:20,after:25});
      addParagraph(project.querySelector(".tech-stack")?.innerText||"",{size:16,after:20}); addParagraph(project.querySelector(".project-type")?.innerText||"",{bold:true,size:16,after:20});
      project.querySelectorAll("ol>li").forEach(li=>children.push(new Paragraph({text:li.innerText,numbering:{reference:"project-points",level:0},spacing:{after:35,line:260}})));
    });
    section.querySelectorAll(":scope > .skill-table > div").forEach(row=>addParagraph(`${row.querySelector("b")?.innerText||""}：${row.querySelector("span")?.innerText||""}`,{size:18,after:35}));
    const note=section.querySelector(":scope > .draft-note"); if(note) addParagraph(note.innerText,{size:15,after:20});
  });
  const documentFile=new Document({styles:{default:{document:{run:{font:"Microsoft YaHei",size:19},paragraph:{spacing:{line:276}}}}},numbering:{config:[{reference:"project-points",levels:[{level:0,format:"decimal",text:"%1.",alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:360,hanging:220}}}}]}]},sections:[{properties:{page:{size:{width:11906,height:16838,orientation:PageOrientation.PORTRAIT},margin:{top:567,right:680,bottom:567,left:680}}},children}]});
  try { const blob=await Packer.toBlob(documentFile); const url=URL.createObjectURL(blob); const link=document.createElement("a"); link.href=url; link.download=exportName("docx"); link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); notify("A4 Word 已下载"); }
  catch(error){ notify(`Word 导出失败：${error.message}`); }
}
function notify(text) { const el=$("#toast"); el.textContent=text; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2200); }
function save() { const data=Object.fromEntries(fields.map(id=>[id,$(`#${id}`).value])); localStorage.setItem(storageKey,JSON.stringify(data)); }
function persistResume() { if(!$("#resumePreview").classList.contains("hidden")) localStorage.setItem(resumeHtmlKey,$("#resumePreview").innerHTML); }
function setEditMode(enabled) {
  if($("#resumePreview").classList.contains("hidden")) return notify("请先生成简历");
  editMode=enabled; $("#resumePreview").classList.toggle("editing",enabled); $("#editBtn").innerHTML=enabled?"<span>✓</span> 完成":"<span>✎</span> 编辑";
  $("#resumePreview").querySelectorAll("h1,.target,.identity-block p,section h3,section li,.education-line>*,.project-title>*,.tech-stack,.project-type,.skill-table b,.skill-table span,.draft-note").forEach(el=>el.contentEditable=enabled?"true":"false");
  if(!enabled){ persistResume(); notify("修改已保存"); } else notify("已进入编辑模式，点击文字即可修改");
}
function restore() { try { const data=JSON.parse(localStorage.getItem(storageKey)||"{}"); fields.forEach(id=>{ if(data[id]) $(`#${id}`).value=data[id]; }); const saved=localStorage.getItem(resumeHtmlKey); if(saved){ $("#resumePreview").innerHTML=saved; $("#resumePreview").classList.remove("hidden"); $("#emptyState").classList.add("hidden"); } else if(data.company&&data.role&&data.jd) generate(); } catch {} }

$("#resumeForm").addEventListener("submit",generate);
fields.forEach(id => $(`#${id}`).addEventListener("input",save));
$("#photo").addEventListener("change", event => { const file=event.target.files?.[0]; if(!file) return; if(file.size>2_000_000) return notify("照片请控制在 2MB 以内"); const reader=new FileReader(); reader.onload=()=>{ photoData=reader.result; localStorage.setItem(`${storageKey}-photo`,photoData); notify("照片已添加"); }; reader.readAsDataURL(file); });
$("#editBtn").addEventListener("click",()=>setEditMode(!editMode));
$("#resumePreview").addEventListener("input",()=>{ clearTimeout(editSaveTimer); editSaveTimer=setTimeout(()=>{ persistResume(); notify("修改已自动保存"); },700); });
$("#printBtn").addEventListener("click",()=>openExportConfirm("pdf"));
$("#wordBtn").addEventListener("click",()=>openExportConfirm("word"));
$("#confirmCancel").addEventListener("click",closeExportConfirm);
$("#confirmExport").addEventListener("click",()=>{ const type=pendingExport; closeExportConfirm(); if(type==="pdf") downloadPdf(); else if(type==="word") downloadWord(); });
$("#exportConfirmModal").addEventListener("click",event=>{ if(event.target===$("#exportConfirmModal")) closeExportConfirm(); });
document.addEventListener("keydown",event=>{ if(event.key==="Escape"&&!$("#exportConfirmModal").classList.contains("hidden")) closeExportConfirm(); });
$("#copyBtn").addEventListener("click",async()=>{ if($("#resumePreview").classList.contains("hidden")) return notify("请先生成简历"); await navigator.clipboard.writeText(plainText()); notify("简历内容已复制"); });
$("#resetBtn").addEventListener("click",()=>{ if(!confirm("确定清空所有已填写内容吗？")) return; localStorage.removeItem(storageKey); localStorage.removeItem(`${storageKey}-photo`); localStorage.removeItem(resumeHtmlKey); photoData=""; editMode=false; $("#resumeForm").reset(); $("#resumePreview").classList.add("hidden"); $("#resumePreview").classList.remove("editing"); $("#emptyState").classList.remove("hidden"); notify("已清空"); });
async function checkAI() {
  try {
    const data = desktopApi ? await desktopApi.getConfig() : await fetch("/api/status").then(r=>r.json());
    const configured = desktopApi ? data.hasKey : data.configured;
    $("#aiStatus").innerHTML = `<i></i> ${configured ? `${data.model} 已配置` : "DeepSeek 待配置"}`;
  }
  catch { $("#aiStatus").innerHTML = "DeepSeek 状态未知"; }
}

function setSettingsResult(message, type="") {
  const result=$("#settingsResult"); result.textContent=message; result.className=`settings-result ${type}`.trim();
}
async function openSettings() {
  const modal=$("#settingsModal"); modal.classList.remove("hidden"); modal.setAttribute("aria-hidden","false");
  setSettingsResult("可先测试连接并读取可用模型。");
  try {
    const config=await desktopApi.getConfig();
    $("#deepseekModel").value=config.model||"deepseek-flash";
    $("#saveDeepseekKey").checked=config.saveKey;
    $("#deepseekKey").placeholder=config.hasKey?"已配置；留空保持不变":"sk-...";
  } catch(error) { setSettingsResult(error.message,"error"); }
  $("#deepseekKey").focus();
}
function closeSettings() { const modal=$("#settingsModal"); modal.classList.add("hidden"); modal.setAttribute("aria-hidden","true"); $("#deepseekKey").value=""; }
async function testDeepseek() {
  setSettingsResult("正在连接 DeepSeek…");
  try {
    const data=await desktopApi.testConnection({key:$("#deepseekKey").value.trim()});
    $("#modelOptions").innerHTML=data.models.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.name)}</option>`).join("");
    if(!$("#deepseekModel").value&&data.models[0]) $("#deepseekModel").value=data.models[0].id;
    setSettingsResult(`连接成功，读取到 ${data.models.length} 个模型。`,"success");
  } catch(error) { setSettingsResult(error.message||"连接失败","error"); }
}
async function saveDeepseek() {
  setSettingsResult("正在保存…");
  try {
    const data=await desktopApi.saveConfig({key:$("#deepseekKey").value.trim(),model:$("#deepseekModel").value.trim(),saveKey:$("#saveDeepseekKey").checked});
    setSettingsResult(data.saveKey?"已使用 Windows 加密保存。":"已保存为本次运行使用。","success");
    await checkAI(); setTimeout(closeSettings,650);
  } catch(error) { setSettingsResult(error.message||"保存失败","error"); }
}

if(desktopApi) {
  document.querySelectorAll(".desktop-only").forEach(el=>el.classList.remove("hidden"));
  $("#settingsBtn").addEventListener("click",openSettings);
  $("#settingsClose").addEventListener("click",closeSettings);
  $("#settingsModal").addEventListener("click",event=>{if(event.target===$("#settingsModal")) closeSettings();});
  $("#testDeepseek").addEventListener("click",testDeepseek);
  $("#saveDeepseek").addEventListener("click",saveDeepseek);
  $("#toggleKey").addEventListener("click",()=>{const input=$("#deepseekKey"); input.type=input.type==="password"?"text":"password"; $("#toggleKey").textContent=input.type==="password"?"显示":"隐藏";});
}
restore(); checkAI();

