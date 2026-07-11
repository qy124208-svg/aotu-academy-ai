-- 好梦论坛 v6.21 升级 SQL
-- 复制到 Supabase Dashboard → SQL Editor 执行

-- 1. 帖子分类
ALTER TABLE dreams ADD COLUMN IF NOT EXISTS category TEXT DEFAULT '闲聊';

-- 2. 帖子审核状态 (0待审/1正常/2下架)
ALTER TABLE dreams ADD COLUMN IF NOT EXISTS status INT DEFAULT 1;

-- 3. 评论嵌套回复
ALTER TABLE dream_comments ADD COLUMN IF NOT EXISTS parent_id BIGINT DEFAULT 0;

-- 4. 帖子收藏表
CREATE TABLE IF NOT EXISTS dream_favorites (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL,
  dream_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, dream_id)
);
ALTER TABLE dream_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public favorites" ON dream_favorites FOR ALL USING (true);

-- 5. 用户关注表
CREATE TABLE IF NOT EXISTS user_follows (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  follower_id TEXT NOT NULL,
  followee_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, followee_id)
);
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public follows" ON user_follows FOR ALL USING (true);
