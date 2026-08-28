# IELTS Training Lab

一个面向 B1 → B2 → IELTS 的个人训练网站，支持阅读、听力、词汇复习记录，以及跨设备云同步。

## 功能

- 阅读 / 听力训练计时器
- 每次训练记录话题、正确率、笔记和时长
- 阅读、听力累计正确率
- 本周训练次数、总学习时长、连续学习天数
- 8 周 B1 → B2 → IELTS 训练路线
- 词汇复习记录
- JSON 数据导出
- 本地存储，无需后端即可先用
- Supabase 邮箱账号登录与跨设备同步
- Row Level Security：用户只能读取和修改自己的训练数据

## 本地运行

这个项目是纯静态网页。可以直接用任意静态服务器运行，例如 VS Code Live Server、Python HTTP Server、Netlify、Vercel 或 GitHub Pages。

不要直接双击 `index.html` 作为长期部署方式，建议通过 HTTP(S) 访问。

## 开启跨设备同步

1. 创建一个 Supabase 项目。
2. 打开 Supabase SQL Editor。
3. 执行 `supabase.sql`。
4. 在 Project Settings → API 中获取 Project URL 和 anon/public key。
5. 修改 `config.js`：

```js
window.IELTS_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_ANON_KEY"
};
```

6. 在 Supabase Authentication 中启用 Email 登录。
7. 将网站部署到 HTTPS 地址。
8. 手机和电脑使用同一个邮箱账号登录，即可读取同一份训练记录。

> Supabase anon key 本来就设计为可用于前端。真正的数据隔离依赖 `supabase.sql` 中的 Row Level Security 策略，请不要关闭 RLS，也不要把 service_role key 放到前端。

## 部署

### GitHub Pages

如果项目最终放在独立仓库，可把静态文件放在仓库根目录并启用 Pages。

当前版本位于 `ielts-trainer/` 子目录。如果继续保留在现有仓库中，可使用 GitHub Actions 或其他静态托管服务，把该目录作为发布目录。

### Netlify / Vercel

把发布目录设置为：

```text
ielts-trainer
```

无需构建命令。

## 数据结构

每条训练记录包含：

- `kind`: reading / listening / vocabulary
- `topic`: 材料或话题名称
- `notes`: 错题、长难句、没听出来的词等
- `correct`: 答对数量
- `total`: 总题数
- `minutes`: 训练分钟数
- `created_at`: 创建时间

## 后续可扩展

- 内置训练材料库
- IELTS 题型标签（T/F/NG、Matching Headings、Map 等）
- 错题本与复习提醒
- 周/月趋势图
- B1/B2/IELTS 分阶段任务
- 听力音频播放器与变速
- PWA 离线安装
- AI 作文批改和口语训练
