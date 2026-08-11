# internalcot

[English](README.md) · [简体中文](README.zh-CN.md)

**让智能体展示完整思维链。**

`internalcot` 为 Codex 和 Claude Code 增加一种可选的推理工作区。开启一次后，智能体必须在整个对话期间，把问题分解、中间推导、备选方案、证据、不确定性和检查过程写进正常的工具执行记录。

```sh
npx internalcot@latest setup
```

```text
› $internalcot

• internalcot 模式已在本次对话中启用。

› 重新检查这个证明。我认为已发表的答案有问题。

• internalcot> 问题：重新评估证明，而不是沿用之前的结论。
  推导：需要检查的阶乘取决于 p，因此固定的有限同余构造不能证明该命题。
  我需要将任何候选构造与下一个阶乘阈值比较。
  下一步：找到最新的声称证明，再验证这个缺口。
```

你可以在智能体工作时查看一条持续、易读的思维链。智能体会主动把推理写成可见的工作笔记。

## 安装

上面的 setup 命令会同时安装 CLI 和 skill。它会检测 Codex 与 Claude Code，列出将要执行的全局安装命令和 skill 路径，并在修改前请求确认。如果安装后没有立即看到 skill，请重启编码智能体。

无人值守安装 Codex 版本：

```sh
npx internalcot@latest setup --codex --yes
```

使用 `--project` 可将 skill 安装到当前仓库，而不是用户主目录。你也可以先预览全部改动：

```sh
npx internalcot@latest setup --codex --project --dry-run
```

重复运行 setup 会更新 internalcot 自己的文件，并保留同一 skill 目录中的其他文件。

## 使用

开启可见工作笔记：

```text
$internalcot
```

在当前对话中，该模式会持续作用于每一次回复，也会跨越工具调用和上下文压缩。智能体必须在第一次实质性工具调用或回答前记录详细推理，在各个推理阶段之间继续记录，并在回答前写下最终验证。

明确关闭该模式：

```text
$internalcot off
```

此模式属于对话状态，不会改变宿主的原生推理设置。新对话默认关闭 internalcot。

## 执行记录中会显示什么

有用的笔记会展示推导过程，而不只是事后润色的目标与检查摘要：

```text
internalcot> 目标：找出刷新令牌为什么只在轮换后被拒绝。
约束：保留现有会话数据，不能削弱重放攻击防护。
推导：轮换在事务中更新令牌族。第二个请求可能在事务提交前读到旧令牌族，
因此校验会将提交的令牌与过期状态比较。削弱重放防护只会遮盖竞态，而不是修复它。
备选方案：按令牌族串行化轮换，或让读取加入同一事务边界。首先通过公开登录流程复现，
以区分这两种情况。
```

CLI 会把笔记拆成少量只追加的输出片段，让支持流式进程输出的宿主逐步显示内容。会缓冲输出的宿主则会一次显示完整笔记。无论哪种情况，笔记都在命令启动前由智能体写好；分段显示只是一种呈现方式。

## 从 skills.sh 安装

你也可以从 [skills.sh](https://www.skills.sh/morluto/internalcot/internalcot) 安装引导 skill：

```sh
npx skills add morluto/internalcot
```

此命令只安装 skill。如果系统中没有持久安装的 CLI，skill 会改用 npx 运行当前版本：

```sh
npx --yes internalcot@latest skill --npx
```

在这种模式下，笔记命令为 `npx --yes internalcot@latest note`。推荐的 `setup` 方式仍然更快，因为它会持久安装 CLI。

## skill 如何保持最新

实际安装的 `SKILL.md` 是一个很小的引导入口。启用时，它会向 CLI 请求与已安装版本一致的指令：

```sh
internalcot skill
```

完整工作流程随 npm 包一起发布。因此，更新 CLI 就会同时更新笔记约定，不会留下与 CLI 版本不匹配的旧 skill 副本。

## 直接使用 note 命令

无需开启对话模式，也可以直接写一条可见笔记：

```sh
internalcot note '起草前先检查等号成立的情况。'
```

笔记会以 `internalcot>` 为前缀写入 stderr。默认情况下，输出会分段显示，stdout 保持为空。使用 `--no-pace` 可立即输出；使用 `--receipt` 可获得机器可读结果：

```sh
internalcot note --no-pace '检查等号成立的情况。'
internalcot note --receipt '检查等号成立的情况。'
```

```json
{"recorded":true,"next":"Continue the derivation in internalcot. Record intermediate reasoning, alternatives, evidence, and checks before the next substantive step."}
```

该命令不访问网络、不需要 API key，也不会单独保存笔记。编码智能体的工具执行记录就是存档。

## API 观察模式 POC

`internalcot observe` 保留了本项目最初的实验：它通过 OpenAI Responses API 启动另一个模型，强制模型调用可见的 scratchpad 工具，流式输出工具输入，然后再流式输出最终回答。

这是用于单独 API 请求的测试工具，不是常规 skill 工作流程。它需要 OpenAI API key，并可能产生 API 费用。

请在 [OpenAI 控制台](https://platform.openai.com/api-keys)创建项目 key。不要把 key 粘贴到提示词、issue、源文件或会被 shell 历史记录保存的命令中。

```sh
unset OPENAI_BASE_URL

read -rsp "OpenAI API key: " OPENAI_API_KEY && echo
export OPENAI_API_KEY

internalcot observe --model gpt-5.6-luna \
  '计算 17 * 23，然后只给出乘积。'

unset OPENAI_API_KEY
```

Scratchpad 输出写入 stderr，最终回答写入 stdout：

```sh
internalcot observe '检查 17 * 23 是否等于 391' \
  >answer.txt 2>scratchpad.txt
```

默认观察模型为 `gpt-5.6-sol`。参阅 [OpenAI 模型目录](https://developers.openai.com/api/docs/models)和 [API 快速入门](https://developers.openai.com/api/docs/quickstart)。

## 开发

```sh
npm install
npm run check
npm test
npm run build
npm link
```

验证公开的引导 skill：

```sh
npx skills add . --list
```

## 发布

```sh
npm whoami
npm run prepublishOnly
npm pack --dry-run --json
npm publish
```

发布前请确认打包后的 `dist/cli.js` 可执行，并且同时包含 `skills/internalcot` 和 `runtime/internalcot-workflow.md`。

## 致谢

本项目的构想和[最初的 Python 概念验证](https://pasta.can.ac/omegiligox.py)来自 [Can Bölük（@_can1357）](https://x.com/_can1357/status/2087228354399265125)。

## 许可证

[MIT](LICENSE)
