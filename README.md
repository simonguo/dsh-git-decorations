# dsh-git-decorations

在 DSH 原生文件树里显示真实 Git 状态，与 dsh-icons 分开安装，可同时使用。

| 状态 | 标记 | 颜色 |
|---|---|---|
| 已修改 | M | 主题警告色（通常黄色） |
| 未跟踪 | U | 主题成功色（通常绿色） |
| 暂存新增 | A | 主题成功色 |
| 重命名 | R | 主题强调色 |
| 删除 | D | 主题错误色 |
| 冲突 | ! | 主题错误色 |
| 忽略 | 无 | 主题次要文字色 |
| 目录内有变化 | ● | 目录内优先级最高的状态色 |

## 安装与使用

### 从 npm 安装（推荐）

npm 包：[dsh-git-decorations](https://www.npmjs.com/package/dsh-git-decorations)，已发布 `0.1.0`。

让 DSH 助手通过 Plugin Manager 安装并启用：

```json
{"action":"install_bundle","target":"dsh-git-decorations"}
```

或使用 DSH CLI（将 `web` 替换为实际 Profile 名称）：

```sh
dsh plugin --profile web add dsh-git-decorations
```

直接 `npm install` 只下载包，不会自动把插件注册到 DSH。无需全局 npm 安装。

### 从源码安装

```sh
git clone https://github.com/simonguo/dsh-git-decorations.git
cd dsh-git-decorations
```

无需安装依赖或构建。让 DSH 助手通过 `plugin_manager` 安装克隆目录：

```json
{"action":"install_bundle","target":"/absolute/path/to/dsh-git-decorations"}
```

本地链接安装后请保留目录；关闭插件即可恢复默认显示。也可安装 [GitHub Release 的预构建包](https://github.com/simonguo/dsh-git-decorations/releases/latest)。市场申请：[awesome-dsh-plugin #14287](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/14287)，以审核合并为准。

会话标题栏显示 Git 按钮，点击可手动刷新；悬停可查看状态。自动每 8 秒刷新一次，隐藏页面暂停。不同主题采用语义色，不硬编码 VS Code 主题的具体色值。

## 性能与安全

- 只运行 `git rev-parse` 与 `git status`，通过 execFile 参数调用，不拼接 shell 命令。
- 不执行 add/commit/reset，不读取文件正文，不扫描历史。
- 服务只接受已认证 owner 的现存会话 ID，目录由宿主会话决定，客户端不能传任意路径。
- 单次 Git 命令超时 8 秒，输出最多 4 MiB；最多返回 10,000 个变更项。
- 宿主缓存 5 秒，并发请求合并；客户端结果不变时不重建样式。
- 工作区为非 Git 父目录时，只探测最多 32 个直接非隐藏子目录；不递归查找仓库。
- 没有 MutationObserver、DOM 扫描或文件树替换。CSS 只对有变化的路径生成规则。

## 首版边界

依赖 DSH 原生 `data-files-path` 和行结构（0.2.2-rc.1 环境）。只在有活动会话时读取状态。未跟踪目录使用 Git 的 normal 模式汇总，不枚举所有新文件；忽略目录也以目录项表示。删除文件若已不在原生文件树中，只能通过目录圆点体现。纯净仓库无颜色，非仓库不显示装饰。Git 状态刷新不等同于逐次文件事件的实时刷新。

当前用会话标题栏组件管理样式生命周期，切换会话会移除旧装饰。它不修改图标，不接管点击或右键菜单。

## 开发

Node.js 22+，本机 Git，无第三方依赖。

```sh
node --test tests/*.test.js
node --check client.js
```

测试使用独立临时仓库，覆盖 porcelain -z、空格/Unicode/换行文件名、rename、目录汇总、并发缓存、真实修改/新增/暂存读取，并验证读取前后 Git 状态一致。

## npm 自动发布（维护者）

工作流：`.github/workflows/publish.yml`。在 GitHub 发布一个 Release 时自动执行，也可以在 Actions → Publish to npm → Run workflow 中手动指定现有版本标签。

1. 修改 `package.json` 版本并提交代码，等待 Validate CI 通过。
2. 创建与版本一致的标签，例如 `v1.0.2`，然后发布对应 GitHub Release。
3. 工作流检出标签、运行校验、检查 npm 是否已有该版本，再通过 OIDC 发布公开包和 provenance。

正式版本使用 `latest`，含预发布后缀的版本使用 `next`。已存在的版本跳过，不覆盖、不重新发布。默认分支普通 push 和上游图标同步 PR 不会直接发布 npm。

首次使用前，在 npm 包的 Settings → Trusted Publisher 配置：

| 字段 | 填写 |
|---|---|
| Publisher | GitHub Actions |
| Organization or user | `simonguo` |
| Repository | `dsh-git-decorations` |
| Workflow filename | `publish.yml`（只填文件名） |
| Environment name | 留空（工作流未声明 environment） |
| Allowed actions | 勾选 **Allow npm publish** |

Label 可填 `GitHub Actions`。工作流使用 GitHub 托管 Ubuntu runner、Node.js 24、npm 11 和 `id-token: write`；不需要 `NPM_TOKEN`，不要把个人 token 或 OTP 放进工作流。

Trusted Publisher 必须由 npm 包管理员在 npm 网页完成。仅添加 YAML 不会自动建立 npm 信任关系。配置完成后，可手动执行已有标签的发布以补发缺失版本；存在的版本会跳过。
