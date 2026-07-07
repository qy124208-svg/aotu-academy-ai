-- ═══ Supabase Edge Function: bilibili-qr ═══
-- 去 Supabase → Edge Functions → New Function → 粘贴以下代码
-- Function name: bilibili-qr
-- ═══ 复制以下全部代码到 Edge Function ═══

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ircabforurlovrpbvbas.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "你的Supabase秘密API粘贴在这里";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, qrcode_key } = await req.json();

    if (action === "generate") {
      // 调用B站生成二维码API
      const r = await fetch("https://passport.bilibili.com/x/passport-login/web/qrcode/generate", {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      const d = await r.json();
      if (d.code !== 0) throw new Error("B站二维码生成失败: " + JSON.stringify(d));

      // qr_url 是B站自己的二维码图片链接（可不跨域直接显示）
      return new Response(JSON.stringify({
        qrcode_key: d.data.qrcode_key,
        qr_url: d.data.url
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (action === "poll") {
      if (!qrcode_key) throw new Error("缺少qrcode_key");

      const r = await fetch("https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=" + qrcode_key, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
      });
      const d = await r.json();

      if (d.code === 0) {
        // 登录成功！提取cookie
        const setCookie = r.headers.get("set-cookie") || "";
        const sessdata = (setCookie.match(/SESSDATA=([^;]+)/) || [])[1] || "";
        const bili_jct = (setCookie.match(/bili_jct=([^;]+)/) || [])[1] || "";
        const dedeuserid = (setCookie.match(/DedeUserID=([^;]+)/) || [])[1] || "";

        // 用cookie获取用户信息
        let nickname = "B站用户", face = "";
        if (sessdata) {
          try {
            const ur = await fetch("https://api.bilibili.com/x/web-interface/nav", {
              headers: { "Cookie": "SESSDATA=" + sessdata + ";", "User-Agent": "Mozilla/5.0" }
            });
            const ud = await ur.json();
            if (ud.data && ud.data.uname) {
              nickname = ud.data.uname;
              face = ud.data.face || "";
            }
          } catch (e) {}
        }

        // 存到Supabase — 方便爬虫使用
        const fullCookie = "SESSDATA=" + sessdata + "; bili_jct=" + bili_jct + "; DedeUserID=" + dedeuserid + ";";
        if (dedeuserid) {
          const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          await supabase.from("platform_accounts").upsert({
            user_id: "bili_" + dedeuserid,
            platform: "bilibili",
            cookie: fullCookie,
            is_active: true,
            updated_at: new Date().toISOString()
          }, { onConflict: "user_id,platform" });
        }

        return new Response(JSON.stringify({
          status: "confirmed",
          bili_uid: dedeuserid,
          nickname: nickname,
          face: face,
          sessdata: sessdata,
          bili_jct: bili_jct
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      } else {
        // 未确认 / 未扫码 / 过期
        return new Response(JSON.stringify({
          status: d.code === 86101 ? "waiting" : d.code === 86090 ? "scanned" : d.code === 86038 ? "expired" : "error",
          code: d.code,
          message: d.message || ""
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
