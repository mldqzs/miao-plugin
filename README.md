# Miao-Plugin（mldqzs 个人维护 Fork）

本仓库是 [yoimiya-kokomi/miao-plugin](https://github.com/yoimiya-kokomi/miao-plugin) 的**个人维护 Fork 分支**，在跟进原版更新的基础上加入了一些自用功能与样式调整。

> [!WARNING]
> **一般用户请优先使用 [原版 miao-plugin](https://github.com/yoimiya-kokomi/miao-plugin)。**
>
> 本分支为个人维护，更新频率、稳定性与兼容性均不作保证，部分功能（如未实装角色数据、第三方面板服务）可能随时调整或移除。
> 使用本分支遇到的问题请在 [本仓库 Issues](https://github.com/mldqzs/miao-plugin/issues) 反馈，**不要**向原版作者反馈。

`miao-plugin` 是一个 `Yunzai-Bot` 的升级插件，提供角色面板、伤害计算、圣遗物评分、角色查询等功能，支持原神与崩坏：星穹铁道。

- 安装后发送 `#喵喵帮助` 查看全部功能
- 发送 `#喵喵设置` 管理插件设置

## 目录

- [与原版的区别](#与原版的区别)
- [安装与更新](#安装与更新)
- [Yunzai 版本支持](#yunzai-版本支持)
- [功能说明](#功能说明)
- [免责声明](#免责声明)
- [资源与致谢](#资源与致谢)

---

## 与原版的区别

本分支会定期合并原版更新，以下为本分支**额外**的改动：

### 新增功能

- **崩坏三查询**：使用 `!` 前缀（Cookie 与原神共用，支持 `@他人` 查询）
  - 常用指令：`!角色` `!武器` `!总览` `!体力` `!超弦空间` / `!深渊` `!记忆战场` `!往世乐土` `!周报` `!水晶` `!uid`，完整列表见 `#喵喵帮助`
- **刷新后推荐查询**：`#更新面板` 后自动发送本次评分提升最明显（或新获得面板）的角色面板，提示「你可能想查询【#xx面板】」，可通过 `#喵喵设置推荐查询关闭` 关闭
- **AQing-Api 面板服务**（服务编号 `6`）：
  > [!CAUTION]
  > AQing-Api 为**作者个人使用**的面板服务，**暂不对他人开放**。
  >
  > 本分支中面板服务为 `0`（自动，默认值）且未配置喵 Token 时，国服 / B 服原神与全部星铁会走 AQing-Api，**其他使用者会更新失败**。请安装后手动指定其他面板服务，例如：
  >
  > - 原神：`#喵喵设置面板服务332`（国服 / B 服 MiniGG，外服 Enka）
  > - 星铁：`#喵喵设置星铁面板服务222`（Mihomo）
  >
  > 不要将面板服务设为 `0` 或 `6`。
- **攻略查询**（需搭配 [mldqzs/Yunzai-genshin](https://github.com/mldqzs/Yunzai-genshin)，见下方说明）：
  - `#刻晴攻略` / `#星铁黄泉攻略`：合并全部来源，以合并转发发送
  - `#刻晴攻略[1-7]` / `#星铁黄泉攻略[1-5]`：查询指定来源；`#更新星铁黄泉攻略` 强制刷新
  - `#设置默认攻略[1-7]` / `#设置星铁默认攻略[1-5]`：设置合并转发中排在最前的来源
  - 星铁来源：1 HoYo青枫、2 万事屋YIDA、3 祈鸢ya、4 清酒微殇、5 原神小玩家呀；原神来源见 `#攻略帮助`
- **未实装角色数据**：提前加入部分未实装角色的面板与伤害计算数据，**仅供参考**，以正式上线为准

### 样式调整

- 面板背景使用随机二次元图（附本地默认图兜底），卡片遮罩淡化
- 角色名 / UID 彩虹字、伤害数值冷暖分色、评级分档配色
- 武器显示风格优化

### 搭配 Yunzai-genshin Fork 使用

攻略查询的实现位于 genshin 插件中，本分支的帮助菜单与按钮按 [mldqzs/Yunzai-genshin](https://github.com/mldqzs/Yunzai-genshin) 的指令编写。使用原版 genshin 插件时，`#星铁xx攻略` 的多来源查询、`#设置星铁默认攻略` 等指令不可用。

> [!IMPORTANT]
> genshin 插件的目录**必须**为 `plugins/genshin`。Yunzai 本体及 miao-plugin 等插件按此固定路径引用它，目录名不对时插件会跳过加载，米游社相关功能也会失效。
> 自行 `git clone` 时请务必在命令末尾指定目录名，不要使用默认的 `Yunzai-genshin`。

已安装 genshin 插件（Yunzai 自带）的，在 Yunzai 根目录执行以下命令切换到 Fork，然后执行 `git -C plugins/genshin pull` 并重启：

```bash
git -C plugins/genshin remote set-url origin https://github.com/mldqzs/Yunzai-genshin
```

如需全新克隆（请先删除或备份原有的 `plugins/genshin`）：

```bash
git clone --depth=1 https://github.com/mldqzs/Yunzai-genshin plugins/genshin
```

如果已经克隆成了 `plugins/Yunzai-genshin`，启动日志会提示目录名错误，将其重命名为 `plugins/genshin` 后重启即可。

### Ark-plugin 适配

本分支提供了排行渲染的运行时注入接口，配合 [mldqzs/ark-plugin](https://github.com/mldqzs/ark-plugin) 使用时**无需覆盖** miao-plugin 的核心文件。

> [!IMPORTANT]
> 如果你正在使用原版 Ark-plugin，并且曾通过 Ark 替换过 miao-plugin 文件，请先发送 `#ark恢复文件miao-rank` 恢复被替换的文件，再将 Ark-plugin 切换到 [mldqzs/ark-plugin](https://github.com/mldqzs/ark-plugin) 分支，以适配本分支。

---

## 安装与更新

> 如果你只需要原版功能，请按 [原版 README](https://github.com/yoimiya-kokomi/miao-plugin#readme) 安装，不必使用本分支。

### 全新安装

在 Yunzai-Bot 根目录打开终端执行：

```bash
git clone --depth=1 https://github.com/mldqzs/miao-plugin plugins/miao-plugin
```

然后安装依赖并重启 Yunzai-Bot：

```bash
pnpm install -P
```

之后管理员发送 `#喵喵更新` 即可从本分支自动更新。

> [!IMPORTANT]
> 安装后请先手动指定面板服务（如 `#喵喵设置面板服务332`、`#喵喵设置星铁面板服务222`），否则默认会走仅供作者个人使用的 AQing-Api，导致 `#更新面板` 失败。

### 从原版切换到本分支

已安装原版 miao-plugin 的，在 Yunzai 根目录执行以下命令切换更新源，然后发送 `#喵喵更新`（或执行 `git -C plugins/miao-plugin pull`）：

```bash
git -C plugins/miao-plugin remote set-url origin https://github.com/mldqzs/miao-plugin
```

### 切换回原版

```bash
git -C plugins/miao-plugin remote set-url origin https://github.com/yoimiya-kokomi/miao-plugin
```

切回后如更新出现冲突，可执行 `git -C plugins/miao-plugin fetch origin` 再 `git -C plugins/miao-plugin reset --hard origin/master`（会丢弃本地修改，请先备份）。

---

## Yunzai 版本支持

`miao-plugin` 支持 V3 / V2 版本的 Yunzai-Bot：

| 版本 | 说明 |
| --- | --- |
| [Miao-Yunzai](https://github.com/yoimiya-kokomi/Miao-Yunzai) | 喵版 Yunzai，本体不含签到，与 miao-plugin 打通，功能迭代较多，建议新部署 / 迁移使用 |
| [Yunzai-V3（喵喵维护版）](https://github.com/yoimiya-kokomi/Yunzai-Bot) | icqq 版本，与原版功能基本一致，保持卡池更新，可从原版直接换源升级 |
| [Yunzai-V3（乐神原版）](https://gitee.com/Le-niao/Yunzai-Bot) | oicq 版本，可能遇到登录问题 |

---

## 功能说明

### 角色面板（如 `#雷神面板`）

发送 `#面板帮助` 查看详细用法。

#### `#更新面板`

从面板服务拉取角色橱窗中展示的角色数据。面板服务由 [Enka.Network](https://enka.network/) 提供。

> 查询功能经 Enka 官方授权（[issue#63](https://github.com/yoimiya-kokomi/miao-plugin/issues/63#issuecomment-1199348789)），感谢 Enka 提供的面板查询服务。
> 如果可以，也请在 Patreon 上支持 Enka，或通过 [Enka 官网](https://enka.network/) 的 Discord 提供闲置的原神账号。

> 也可使用 [@MiniGrayGay](https://github.com/MiniGrayGay) 的 `MiniGG-Api` 面板服务：
> 发送 `#喵喵设置面板服务332`，将国服与 B 服的面板查询交由 `MiniGG-Api` 处理。
>
> 本分支中的 `AQing-Api`（服务编号 `6`）仅供作者个人使用，暂不对他人开放。默认的自动模式也会走 AQing-Api，请按 [与原版的区别](#与原版的区别) 中的说明手动指定其他面板服务。

#### `#雷神伤害`

伤害计算由喵喵在本地完成。如结果有偏差，可通过 `#雷神伤害` 查看伤害加成信息；确认有误时，请附上伤害录屏 / 截图及 UID 进行反馈。

#### `#雷神圣遗物`

圣遗物评分采用喵喵版评分规则。

---

更多内容请阅读 [CHANGELOG.md](CHANGELOG.md)，其余文档持续完善中。

---

## 免责声明

1. `miao-plugin` 自身的 UI 与代码均开放，无需征得特殊同意即可任意使用。能备注来源最好，但不强求。
2. 以上声明仅代表 `miao-plugin` 自身的范畴，请尊重 Yunzai 本体及其他插件作者的努力，勿将 Yunzai 及其他插件用于以盈利为目的的场景。
3. miao-plugin 的图片与其他素材均来自网络，仅供交流学习使用，如有侵权请联系，会立即删除。

## 资源与致谢

**相关项目**

- [miao-plugin（原版）](https://github.com/yoimiya-kokomi/miao-plugin)：喵喵插件，本分支的上游，感谢喵喵及所有贡献者
- [mldqzs/Yunzai-genshin](https://github.com/mldqzs/Yunzai-genshin)：适配本分支的 genshin 插件（攻略查询等）
- [mldqzs/ark-plugin](https://github.com/mldqzs/ark-plugin)：适配本分支的 Ark-plugin
- [Miao-Yunzai](https://github.com/yoimiya-kokomi/Miao-Yunzai)：喵版 Yunzai（[Gitee](https://gitee.com/yoimiya-kokomi/Miao-Yunzai) / [GitHub](https://github.com/yoimiya-kokomi/Miao-Yunzai)）
- [Yunzai-V3](https://github.com/yoimiya-kokomi/Yunzai-Bot)：喵喵维护版（icqq）
- [Yunzai-V3](https://gitee.com/Le-niao/Yunzai-Bot)：乐神原版（oicq）

**致谢**

- [Enka.Network](https://enka.network/)：提供面板服务
- [Snap.Hutao](https://hut.ao/)：感谢 DGP Studio 开发的 [胡桃 API](https://github.com/DGP-Studio/Snap.Hutao.Server)
