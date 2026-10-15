# RoleFit 一键生成简历

**把岗位要求，变成一份可以继续编辑的中文简历草稿。**

[下载 Windows 软件](https://github.com/sbzz666/rolefit-resume/releases/latest) · [使用问题与建议](https://github.com/sbzz666/rolefit-resume/issues) · [MIT 开源许可](LICENSE)

RoleFit 根据公司、职位与 JD 生成岗位定制中文简历草稿，支持在线修改以及导出 Word、PDF。项目同时提供网页版和数据留在本机的 Windows 桌面版。

## 能做什么

- **围绕岗位生成**：输入公司、职位、完整 JD 和真实经历，生成职业概述、项目经历与技能分组。
- **逐段校对编辑**：直接点击简历内容修改，本地自动保存草稿。
- **Word / PDF 导出**：下载可编辑的 Word 或适合投递的 A4 PDF。
- **自带 DeepSeek Key**：Windows 版提供独立设置页，支持连接测试、模型选择和手动填写模型 ID。
- **本机保存资料**：无需注册，无遥测；AI 生成时，仅将必要的 JD 与基础经历发送给 DeepSeek。
- **没有 Key 也可体验**：自动回退到本地规则草稿，供整理结构与继续编辑。

## 三步开始

1. 下载并安装 Windows 版，按需打开右上角“DeepSeek 设置”，填写自己的 API Key。
2. 填写目标公司、职位 JD 与真实个人经历，生成岗位定制草稿。
3. 核对内容、修改表述，再导出 Word 或 PDF。

软件免费，DeepSeek API 的调用费用由用户自己的账户承担。离线时可继续编辑、导出和使用本地规则草稿；AI 生成需要联网。

## 桌面版与网页版

| 功能 | Windows 桌面版 | 网页版 |
| --- | --- | --- |
| 生成、编辑、Word / PDF 导出 | 支持 | 支持 |
| DeepSeek Key 设置页面 | 支持 | 由部署者配置服务端环境变量 |
| Key 保存 | 本次会话或 Windows 加密保存 | 服务端环境变量 |
| 运行方式 | 安装后在本机运行 | Node.js / Docker 部署 |

> 生成器不会验证候选人的真实经历。未提供经历时只会生成明确标注的“模拟项目”；投递前必须核对技能、数字和事实。

## Windows 桌面版

从 GitHub Releases 下载 `RoleFit-Windows-v*.zip`，解压后运行其中的安装程序。软件未购买商业代码签名证书，因此 Windows 可能显示“未知发布者”。你可以用 ZIP 内的 `SHA256SUMS.txt` 校验安装文件。

桌面版特点：

- 无需注册，简历和 JD 默认只保存在本机
- DeepSeek API Key 可仅在本次运行期间使用
- 选择保存时，Key 使用 Windows DPAPI 加密后保存在当前用户目录
- 可测试连接、读取可用模型，也可手动填写模型 ID
- AI 请求从本机直接发送到 DeepSeek，不经过 RoleFit 服务器

打开软件后点击右上角“DeepSeek 设置”。未配置 Key 时仍可使用本地草稿、编辑和文件导出。

## 网页版运行

网页版的 Key 只能由部署者在服务端配置，不会提供给浏览器：

```powershell
$env:DEEPSEEK_API_KEY="你的 DeepSeek API Key"
$env:DEEPSEEK_MODEL="deepseek-flash"
npm start
```

浏览器打开 `http://127.0.0.1:4173`。要求 Node.js 18 或更高版本。

也可以使用 Docker：

```powershell
docker build -t rolefit-resume .
docker run -p 4173:4173 -e DEEPSEEK_API_KEY="你的密钥" rolefit-resume
```

不要把网页版部署成纯静态站点，否则 `/api/generate` 无法工作。

## 本地开发

```powershell
npm install
npm run check
npm run desktop
```

构建 Windows 安装程序：

```powershell
npm run dist:win
```

输出位于 `release/`。推送 `v*` 标签时，GitHub Actions 会自动构建安装程序、ZIP 和 SHA-256 校验文件并创建 Release。

## 隐私与安全

- 不要把 `.env`、API Key、真实简历或个人资料提交到 Git
- 桌面版保存的 Key 只能由同一 Windows 登录用户解密，但同一用户权限下运行的其他恶意程序仍可能读取它
- DeepSeek 会收到用户主动提交的 JD 和简历基础信息；使用前请阅读 DeepSeek 的隐私政策与服务条款
- 项目不包含遥测、账号系统或云同步

## 开源许可

[MIT](LICENSE) © 2026 夏世康 · 2932073285@qq.com

