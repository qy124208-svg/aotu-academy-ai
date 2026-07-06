# 🌙 好梦论坛 · Supabase 设置指南

## 1. 注册 Supabase（免费，2分钟）

1. 打开 https://supabase.com
2. 点击 **Start your project** → 用 GitHub 登录
3. 创建新项目：
   - Name: `aotu-dreams`
   - Database Password: 设置一个密码（记住它）
   - Region: 选 **Northeast Asia (Tokyo)** 延迟最低
   - 点击 **Create new project**
4. 等待 1-2 分钟数据库创建完成

## 2. 获取连接信息

1. 进入项目 → 左侧菜单 **Settings** → **API**
2. 复制以下两个值：
   - **Project URL**: `https://xxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIs...`

## 3. 配置到游戏中

打开 `index.html`，找到这一段：
```html
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_KEY = 'eyJhbGci...YOUR_ANON_KEY...';
```

替换为你的实际值。

## 4. 创建数据库表

1. 进入 Supabase 项目 → 左侧 **SQL Editor**
2. 点击 **New query**
3. 复制粘贴 `supabase_schema.sql` 的**全部内容**
4. 点击 **Run** 执行

## 5. 完成！

刷新游戏页面，夜晚休息时点击 **🌙 好梦** 即可进入论坛。
