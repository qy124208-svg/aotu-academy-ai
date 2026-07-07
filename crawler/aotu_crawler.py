"""
凹凸世界IP内容聚合爬虫 v2.1
支持: B站、小红书、微博 (抖音/Lofter 预留)
"""
import requests, json, time, os, re, sys, random
from datetime import datetime, timedelta, timezone

SUPABASE_URL = "https://ircabforurlovrpbvbas.supabase.co"
SUPABASE_KEY = "sb_publishable_qdMz_emErZvhUvLAT1hv-w_R2JL6jIY"

AOTU_KEYWORDS = [
    # 官方作品
    "凹凸世界", "凹凸学园", "凹凸", "AOTU", "aotu",
    # 角色全名
    "安迷修", "卡米尔", "格瑞", "埃米", "艾比",
    "雷狮", "帕洛斯", "佩利", "金", "凯莉",
    "安莉洁", "紫堂幻", "银爵", "祖玛", "鬼狐天冲",
    "嘉德罗斯", "雷蛰", "丹尼尔", "神近耀",
    "蒙特祖玛", "雷德", "秋", "小黑洞",
    # CP名
    "瑞金", "雷安", "凯柠", "卡埃", "嘉金", "佩帕", "祖雷",
    # 粉丝常用称呼
    "安哥", "雷总", "鬼狐", "螺丝", "卡卡", "小柠檬",
    "格瑞大人", "呆毛", "骑士道", "雷狮海盗团",
    # 角色英文/昵称
    "Anmicius", "Kamil", "Gray", "Emi", "Abby",
    "Raleigh", "Palos", "Peri", "King", "Kelly",
    "Angelie", "Zitang", "Silver", "Zuma", "Kitsune",
    # 作品相关
    "七创社", "烈斩", "矢量", "冷热流", "星月刃",
    "大罗神通棍", "雷神之锤", "重力球", "天使之弓",
    "恶魔之爪", "冰界领主", "镜像空间", "斯巴达战阵"
]

# 强关键词 — 出现在用户名/简介中几乎可以确定是凹凸圈
STRONG_AOTU = [
    "凹凸世界", "凹凸学园", "安迷修", "卡米尔", "格瑞", "埃米",
    "雷狮", "嘉德罗斯", "凯莉", "鬼狐天冲", "紫堂幻",
    "雷安", "凯柠", "瑞金", "卡埃", "骑士道", "七创社"
]

def is_aotu_related(text):
    if not text: return False
    text_lower = text.lower()
    for kw in AOTU_KEYWORDS:
        if kw.lower() in text_lower: return True
    return False

def is_strong_aotu(text):
    """强关联 — 用户名/简介中有这些词的基本就是凹凸圈"""
    if not text: return False
    for kw in STRONG_AOTU:
        if kw in text: return True
    return False

def verify_aotu_by_content(crawler_func, uid, cookie):
    """二次验证：抽查用户最近3条作品，看是否有凹凸关键词"""
    try:
        posts = crawler_func(cookie, uid, max_pages=1)
        return is_aotu_related(" ".join([p.get("title","")+p.get("content","") for p in posts[:3]]))
    except: return False

def time_category(publish_time):
    if not publish_time: return None
    if isinstance(publish_time, str):
        try: publish_time = datetime.fromisoformat(publish_time.replace('Z', '+00:00'))
        except: return None
    now = datetime.now(timezone.utc)
    delta = now - publish_time
    if delta <= timedelta(days=1): return "day"
    if delta <= timedelta(days=2): return "day2"
    if delta <= timedelta(days=7): return "week"
    if delta <= timedelta(days=30): return "month"
    return None

def is_aotu_related(text):
    if not text: return False
    text_lower = text.lower()
    for kw in AOTU_KEYWORDS:
        if kw.lower() in text_lower: return True
    return False

def supabase_api(path, method="GET", data=None):
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}", "Content-Type": "application/json"}
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    if method == "GET": r = requests.get(url, headers=headers)
    elif method == "POST":
        r = requests.post(url, headers=headers, json=data)
        if r.status_code == 409: return None
    r.raise_for_status()
    return r.json() if r.text else None

def insert_feed(feed):
    """插入动态，自动去重（按URL）"""
    try:
        existing = supabase_api(f"aotu_feeds?url=eq.{requests.utils.quote(feed['url'])}&select=id")
        if existing and len(existing) > 0: return False  # 已存在，跳过
        supabase_api("aotu_feeds", "POST", feed); return True
    except: return False

def clean_old_feeds():
    """删除超过30天的旧动态，保留最近1000条"""
    try:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        supabase_api(f"aotu_feeds?publish_time=lt.{cutoff}&order=publish_time.asc&limit=100", "DELETE")
        # 保留最新1000条
        all_feeds = supabase_api("aotu_feeds?select=id&order=publish_time.desc&limit=100000") or []
        if len(all_feeds) > 1000:
            to_delete = [f['id'] for f in all_feeds[1000:]]
            for chunk in [to_delete[i:i+100] for i in range(0, len(to_delete), 100)]:
                ids = ','.join(map(str, chunk))
                try: supabase_api(f"aotu_feeds?id=in.({ids})", "DELETE")
                except: pass
    except: pass

# ═══ B站爬虫 ═══
class BilibiliCrawler:
    def __init__(self, cookie):
        self.cookie = cookie
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://www.bilibili.com/", "Cookie": cookie
        })

    def get_my_uid(self):
        try:
            r = self.session.get("https://api.bilibili.com/x/web-interface/nav")
            return str(r.json().get("data", {}).get("mid", ""))
        except: return None

    def get_followings(self, uid, max_pages=5):
        users = []
        try:
            for page in range(1, max_pages + 1):
                r = self.session.get(f"https://api.bilibili.com/x/relation/followings?vmid={uid}&pn={page}&ps=50")
                data = r.json()
                if data.get("code") != 0: break
                for u in data.get("data", {}).get("list", []):
                    users.append({"uid": str(u["mid"]), "name": u["uname"], "sign": u.get("sign", ""),
                                  "url": f"https://space.bilibili.com/{u['mid']}"})
                time.sleep(0.3)
        except Exception as e: print(f"[B站] 关注列表失败: {e}")
        return users

    def get_user_videos(self, uid, max_videos=30):
        """拉取用户最新作品（不过滤内容，全部返回）"""
        videos = []
        try:
            r = self.session.get(f"https://api.bilibili.com/x/space/wbi/arc/search?mid={uid}&ps={max_videos}&pn=1",
                                headers={"Referer": f"https://space.bilibili.com/{uid}"})
            for v in r.json().get("data", {}).get("list", {}).get("vlist", []):
                pub_time = datetime.fromtimestamp(v["created"], tz=timezone.utc)
                tc = time_category(pub_time)
                if not tc: continue
                videos.append({"platform": "bilibili", "author_name": v["author"],
                    "author_url": f"https://space.bilibili.com/{v['mid']}",
                    "title": v["title"], "content": v.get("description", ""),
                    "url": f"https://www.bilibili.com/video/{v['bvid']}",
                    "cover_url": v.get("pic", ""), "publish_time": pub_time.isoformat(),
                    "time_category": tc, "likes_count": v.get("play", 0),
                    "comments_count": v.get("comment", 0)})
        except Exception as e: print(f"[B站] 视频获取失败 uid={uid}: {e}")
        return videos

# ═══ 小红书爬虫 (使用 Spider_XHS API) ═══
def _crawl_xiaohongshu(cookie):
    """小红书: 搜索凹凸世界关键词 → 按时间分类筛选"""
    print("  📕 小红书爬取中...")
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "xhs_crawler"))
        from apis.xhs_pc_apis import XHS_Apis
        xhs = XHS_Apis()
        total = 0
        # 搜索笔记: note_time: 1=一天内, 2=一周内, 3=半年内
        time_map = {1: "day1", 2: "week", 3: "month"}
        for note_time, cat in time_map.items():
            success, msg, notes = xhs.search_some_note("凹凸世界", 30, cookie, sort_type_choice=1, note_time=note_time)
            if not success:
                print(f"    搜索失败: {msg}")
                continue
            for note in notes:
                if note.get("model_type") != "note": continue
                nc = note.get("note_card", {})
                pub_time = datetime.fromtimestamp(nc.get("time", 0) / 1000, tz=timezone.utc) if nc.get("time") else None
                if not pub_time: continue
                tc = time_category(pub_time)
                display_title = nc.get("display_title", "") or nc.get("title", "") or nc.get("desc", "")
                if insert_feed({"platform": "xiaohongshu",
                    "author_name": nc.get("user", {}).get("nickname", "未知"),
                    "author_url": f"https://www.xiaohongshu.com/user/profile/{nc.get('user',{}).get('user_id','')}",
                    "title": display_title[:100], "content": nc.get("desc", "")[:200],
                    "url": f"https://www.xiaohongshu.com/explore/{note.get('id','')}",
                    "cover_url": nc.get("cover", {}).get("url_default", ""),
                    "publish_time": pub_time.isoformat(), "time_category": tc or cat,
                    "likes_count": nc.get("interact_info", {}).get("liked_count", 0)}):
                    total += 1
            time.sleep(0.5)
        print(f"  📕 小红书完成! 新增 {total} 条")
    except ImportError:
        print("  ⚠️ Spider_XHS未安装。请运行: pip install execjs loguru")
        print("     将 Spider_XHS-master 放入 crawler/xhs_crawler/")
    except Exception as e:
        print(f"  ❌ 小红书爬取失败: {e}")

# ═══ 微博爬虫 (复用 weibo_city_crawl + social_expand) ═══
def _extract_xsrf(cookie_str):
    """从Cookie提取XSRF-TOKEN"""
    for part in cookie_str.replace(' ','').split(';'):
        if '=' in part:
            k, v = part.split('=', 1)
            if k.strip().lower() == 'xsrf-token' or k.strip() == 'XSRF-TOKEN':
                return v.strip()
    return ''

def _weibo_get_following(cookie, uid, max_pages=5):
    """获取微博关注列表 — API: weibo.com/ajax/friendships/friends"""
    users = []
    xsrf = _extract_xsrf(cookie)
    for pg in range(1, max_pages + 1):
        try:
            r = requests.get(
                f'https://weibo.com/ajax/friendships/friends?uid={uid}&page={pg}',
                headers={'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json',
                         'Referer': f'https://weibo.com/u/{uid}', 'Cookie': cookie,
                         'X-XSRF-TOKEN': xsrf, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
                timeout=15)
            if r.status_code != 200: break
            data = r.json()
            for u in data.get('users', []):
                users.append({'uid': str(u['id']), 'name': u.get('screen_name', ''),
                              'desc': u.get('description', ''), 'url': f"https://weibo.com/u/{u['id']}"})
            if not data.get('users'): break
            time.sleep(0.4)
        except: break
    return users

def _weibo_get_posts(cookie, uid, max_pages=3):
    """获取用户最新微博（返回时间内所有帖子，不做内容筛选）"""
    posts = []
    for pg in range(1, max_pages + 1):
        try:
            r = requests.get(
                f'https://m.weibo.cn/api/container/getIndex?type=uid&value={uid}&containerid=107603{uid}&page={pg}',
                headers={'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
                         'Referer': f'https://m.weibo.cn/profile/{uid}', 'Cookie': cookie, 'X-Requested-With': 'XMLHttpRequest'},
                timeout=15)
            data = r.json()
            cards = data.get('data', {}).get('cards', [])
            for card in cards:
                mblog = card.get('mblog')
                if not mblog: continue
                created = mblog.get('created_at', '')
                try: pub_time = datetime.strptime(created, '%a %b %d %H:%M:%S +0800 %Y').replace(tzinfo=timezone.utc)
                except: continue
                tc = time_category(pub_time)
                if not tc: continue
                text = mblog.get('text', '') or ''
                text_clean = re.sub(r'<[^>]+>', '', text)
                pics = mblog.get('pics', [])
                posts.append({'platform': 'weibo',
                    'author_name': mblog.get('user', {}).get('screen_name', ''),
                    'author_url': f"https://weibo.com/u/{uid}",
                    'title': '', 'content': text_clean[:200],
                    'url': f"https://m.weibo.cn/detail/{mblog['id']}" if mblog.get('id') else '',
                    'cover_url': pics[0].get('url', '') if pics else '',
                    'publish_time': pub_time.isoformat(), 'time_category': tc,
                    'likes_count': mblog.get('attitudes_count', 0),
                    'comments_count': mblog.get('comments_count', 0)})
            if len(cards) < 10: break
            time.sleep(0.3)
        except: break
    return posts

def _crawl_weibo(cookie):
    """微博完整爬取：获取我的UID → 关注列表 → 筛选凹凸作者 → 拉最新微博"""
    print("  📢 微博爬取中...")
    try:
        # 获取自己的UID
        r = requests.get('https://weibo.com/ajax/profile/info',
                        headers={'Cookie': cookie, 'Referer': 'https://weibo.com/',
                                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}, timeout=10)
        my_uid = str(r.json().get('data', {}).get('user', {}).get('id', ''))
        if not my_uid: print("  ❌ Cookie失效"); return
        print(f"  👤 UID: {my_uid}")
        # 获取关注列表
        followings = _weibo_get_following(cookie, my_uid)
        print(f"  📋 关注 {len(followings)} 人")
        print(f"  📋 关注 {len(followings)} 人")
        print(f"  📥 Step1: 拉取作品...")
        all_posts = []
        for i, u in enumerate(followings):
            try:
                posts = _weibo_get_posts(cookie, u['uid'], max_pages=2)
                all_posts.extend(posts)
            except: pass
            if (i+1) % 30 == 0: print(f"    拉取进度 {i+1}/{len(followings)} 已收集{len(all_posts)}篇")
            time.sleep(0.15)
        print(f"  📥 拉取完成! 共 {len(all_posts)} 篇作品")
        print(f"  🔍 Step2: 筛选凹凸IP相关...")
        kept = 0; removed = 0
        for p in all_posts:
            if is_aotu_related(p.get('title','') + p.get('content','')):
                if insert_feed(p): kept += 1
            else: removed += 1
        print(f"  📢 微博完成! 保留{kept}篇 ✅  剔除{removed}篇 ❌")
    except Exception as e:
        print(f"  ❌ 微博爬取失败: {e}")

# ═══ 抖音爬虫 (复用 Douyin_Spider by cv-cat) ═══
# API: /aweme/v1/web/general/search/single/ 支持时间过滤 publish_time: 1=一天内 7=一周内 180=半年内
def _crawl_douyin(cookie):
    """抖音: 搜索凹凸世界关键词 → 按时间分类"""
    print("  🎵 抖音爬取中...")
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "douyin_crawler"))
        from dy_apis.douyin_api import DouyinAPI
        from builder.auth import DouyinAuth
        # 用Cookie创建认证对象
        auth = DouyinAuth(cookie)
        total = 0
        # publish_time: 1=1天, 7=1周, 180=半年
        time_map = {1: "day1", 7: "week", 180: "month"}
        for pt, cat in time_map.items():
            try:
                works = DouyinAPI.search_some_general_work(
                    auth, "凹凸世界", 30, sort_type="2", publish_time=str(pt))
                for w in works:
                    if w.get("aweme_type") != 0: continue  # 只取视频/图文
                    pub_time = datetime.fromtimestamp(w.get("create_time", 0), tz=timezone.utc) if w.get("create_time") else None
                    if not pub_time: continue
                    tc = time_category(pub_time)
                    author = w.get("author", {}) or {}
                    stats = w.get("statistics", {}) or {}
                    cover = w.get("video", {}).get("cover", {}) or {}
                    desc = w.get("desc", "") or ""
                    full_text = desc + " " + " ".join([t.get("title","") for t in (w.get("text_extra", []) or [])])
                    if not is_aotu_related(full_text): continue
                    aweme_id = w.get("aweme_id", "")
                    if insert_feed({"platform": "douyin",
                        "author_name": author.get("nickname", "未知"),
                        "author_url": f"https://www.douyin.com/user/{author.get('sec_uid','')}",
                        "title": desc[:100], "content": desc[:200],
                        "url": f"https://www.douyin.com/video/{aweme_id}" if aweme_id else "",
                        "cover_url": cover.get("url_list", [""])[0] if cover and cover.get("url_list") else "",
                        "publish_time": pub_time.isoformat(), "time_category": tc or cat,
                        "likes_count": stats.get("digg_count", 0),
                        "comments_count": stats.get("comment_count", 0)}): total += 1
                time.sleep(0.5)
            except Exception as e: print(f"    time={pt} 搜索失败: {e}")
        print(f"  🎵 抖音完成! 新增 {total} 条")
    except ImportError as e:
        print(f"  ⚠️ Douyin_Spider 未安装: {e}")
        print(f"     需要: pip install requests protobuf protobuf-to-dict beautifulsoup4")
        print(f"     以及: npm install (在 Douyin_Spider-main 目录)")
        print(f"     路径: C:\\Users\\14206\\Desktop\\抖音\\Douyin_Spider-main")
    except Exception as e:
        print(f"  ❌ 抖音爬取失败: {e}")

def _crawl_lofter(cookie):
    print("  ⚠️ Lofter爬虫待实现")

# ═══ 主流程 ═══
def _cookie_age_hours(acc):
    """检查Cookie多少小时前更新的"""
    updated = acc.get("updated_at")
    if not updated: return 999
    try:
        t = datetime.fromisoformat(updated.replace('Z', '+00:00'))
        return (datetime.now(timezone.utc) - t).total_seconds() / 3600
    except: return 999

def _mark_expired(acc_id, reason):
    """标记账号失效"""
    try:
        supabase_api(f"platform_accounts?id=eq.{acc_id}", "PATCH",
                     {"is_active": False, "content": f"expired:{reason}"})
    except: pass

def run_crawl():
    print(f"🚀 凹凸IP爬虫 v2.3 启动 {datetime.now()}")
    # 清理旧数据
    clean_old_feeds()
    # 读取时间筛选设置（默认week）
    time_filter = sys.argv[1] if len(sys.argv) > 1 else "week"
    print(f"⏱ 时间范围: {time_filter}")
    accounts = supabase_api("platform_accounts?is_active=eq.true&select=*")
    if not accounts:
        print("📭 无活跃账号")
        return
    total_new = 0
    new_inserts = 0
    for acc in accounts:
        platform, cookie, acc_id = acc["platform"], acc["cookie"], acc["id"]
        # 🔑 检查Cookie新鲜度
        hours = _cookie_age_hours(acc)
        print(f"\n🔍 {platform} (user: {acc['user_id'][:8]}...) [Cookie: {hours:.0f}h前]")
        if hours > 24:
            print(f"  ⏰ Cookie已过期({hours:.0f}h)，跳过，请重新登录")
            if hours > 72: _mark_expired(acc_id, f"{hours:.0f}h_old")
            continue
        elif hours > 12:
            print(f"  ⚠️ Cookie即将过期({hours:.0f}h)，建议重新登录")
        try:
            if platform == "bilibili":
                crawler = BilibiliCrawler(cookie)
                uid = crawler.get_my_uid()
                if not uid: print("  ❌ 登录失效"); continue
                followings = crawler.get_followings(uid)
                print(f"  📋 关注 {len(followings)} 人")
                # ── Step 1: 拉取所有人该时间段内的全部作品 ──
                print(f"  📥 Step1: 拉取作品...")
                all_posts = []
                for i, u in enumerate(followings):
                    try:
                        posts = crawler.get_user_videos(u["uid"], max_videos=15)
                        all_posts.extend(posts)
                    except: pass
                    if (i+1) % 50 == 0: print(f"    拉取进度 {i+1}/{len(followings)} 已收集{len(all_posts)}篇")
                    time.sleep(0.12)
                print(f"  📥 拉取完成! 共 {len(all_posts)} 篇作品")
                # ── Step 2: 筛除与凹凸世界无关的内容 ──
                print(f"  🔍 Step2: 筛选凹凸IP相关...")
                kept = 0; removed = 0
                for p in all_posts:
                    text = (p.get("title","") + p.get("content","")).lower()
                    if is_aotu_related(text):
                        if insert_feed(p): kept += 1
                    else:
                        removed += 1
                total_new += kept; new_inserts += kept
                print(f"  📺 B站完成! 保留{kept}篇 ✅  剔除{removed}篇 ❌")
            elif platform == "xiaohongshu":
                _crawl_xiaohongshu(cookie)
            elif platform == "weibo":
                _crawl_weibo(cookie)
            elif platform == "douyin":
                _crawl_douyin(cookie)
            elif platform == "lofter":
                _crawl_lofter(cookie)
        except Exception as e:
            print(f"  ❌ {platform} 失败: {e}")
    print(f"\n✅ 完成! 新增 {new_inserts} 条动态 (各平台共采集{total_new}条，去重后保留)")

if __name__ == "__main__":
    run_crawl()
