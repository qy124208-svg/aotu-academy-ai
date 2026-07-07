-- ═══════════════════════════════════════
-- 好梦论坛 · Supabase 数据库表结构
-- 在 Supabase SQL Editor 中执行此文件
-- ═══════════════════════════════════════

-- 1. 留言帖表
CREATE TABLE IF NOT EXISTS dreams (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_name TEXT NOT NULL DEFAULT '匿名学生',
  author_emoji TEXT NOT NULL DEFAULT '😶',
  author_color TEXT NOT NULL DEFAULT '#8b949e',
  content TEXT NOT NULL CHECK (char_length(content) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- 索引加速
CREATE INDEX IF NOT EXISTS idx_dreams_created ON dreams(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dreams_likes ON dreams(likes_count DESC);

-- 2. 评论表
CREATE TABLE IF NOT EXISTS dream_comments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dream_id BIGINT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT '匿名学生',
  author_emoji TEXT NOT NULL DEFAULT '😶',
  author_color TEXT NOT NULL DEFAULT '#8b949e',
  content TEXT NOT NULL CHECK (char_length(content) <= 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_comments_dream ON dream_comments(dream_id, created_at ASC);

-- 3. 点赞表 (防止重复点赞)
CREATE TABLE IF NOT EXISTS dream_likes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dream_id BIGINT NOT NULL REFERENCES dreams(id) ON DELETE CASCADE,
  user_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(dream_id, user_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_likes_dream ON dream_likes(dream_id);

-- 4. 自动更新点赞数触发器
CREATE OR REPLACE FUNCTION update_dream_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE dreams SET likes_count = (SELECT COUNT(*) FROM dream_likes WHERE dream_id = NEW.dream_id) WHERE id = NEW.dream_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE dreams SET likes_count = (SELECT COUNT(*) FROM dream_likes WHERE dream_id = OLD.dream_id) WHERE id = OLD.dream_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_likes ON dream_likes;
CREATE TRIGGER trigger_update_likes
  AFTER INSERT OR DELETE ON dream_likes
  FOR EACH ROW EXECUTE FUNCTION update_dream_likes();

-- 5. 自动更新评论数触发器
CREATE OR REPLACE FUNCTION update_dream_comments()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE dreams SET comments_count = (SELECT COUNT(*) FROM dream_comments WHERE dream_id = NEW.dream_id AND is_deleted = FALSE) WHERE id = NEW.dream_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE dreams SET comments_count = (SELECT COUNT(*) FROM dream_comments WHERE dream_id = OLD.dream_id AND is_deleted = FALSE) WHERE id = OLD.dream_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_comments ON dream_comments;
CREATE TRIGGER trigger_update_comments
  AFTER INSERT OR DELETE ON dream_comments
  FOR EACH ROW EXECUTE FUNCTION update_dream_comments();

-- 6. 开启行级安全 + 公开读策略
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dream_likes ENABLE ROW LEVEL SECURITY;

-- 公开读取
CREATE POLICY "Anyone can read dreams" ON dreams FOR SELECT USING (is_deleted = FALSE);
CREATE POLICY "Anyone can read comments" ON dream_comments FOR SELECT USING (is_deleted = FALSE);
CREATE POLICY "Anyone can read likes" ON dream_likes FOR SELECT USING (true);

-- 公开写入
CREATE POLICY "Anyone can insert dreams" ON dreams FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert comments" ON dream_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert likes" ON dream_likes FOR INSERT WITH CHECK (true);

-- 公开删除自己的点赞
CREATE POLICY "Anyone can delete likes" ON dream_likes FOR DELETE USING (true);

-- ═══ 7. 验证码表 ═══
CREATE TABLE IF NOT EXISTS login_codes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_codes_email ON login_codes(email);

ALTER TABLE login_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read login codes" ON login_codes FOR SELECT USING (true);
