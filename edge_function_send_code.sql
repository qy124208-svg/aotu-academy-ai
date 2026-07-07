-- ═══ Supabase Edge Function: send-code ═══
-- 去 Supabase → Edge Functions → send-code → Code → 粘贴以下代码 → Save changes
-- ═══ 复制以下全部代码到 Edge Function ═══

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ircabforurlovrpbvbas.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "你的Supabase秘密API粘贴在这里";
const RESEND_KEY = "你的Resend_API_Key粘贴在这里";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    // 校验邮箱
    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "请输入有效的邮箱地址" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 生成6位验证码
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // 使用 service_role 连接数据库
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. 清理该邮箱的旧验证码
    await supabase.from("login_codes").delete().eq("email", email);

    // 2. 存入新验证码
    const { error: dbError } = await supabase
      .from("login_codes")
      .insert({ email, code, expires_at: expiresAt });

    if (dbError) {
      console.error("DB insert error:", dbError);
      return new Response(
        JSON.stringify({ error: "验证码存储失败，请稍后重试" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. 通过 Resend 发送邮件
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "好梦论坛 <noreply@resend.dev>",
        to: email,
        subject: "好梦论坛 · 登录验证码",
        html: `<h2>🌙 好梦论坛</h2>
               <h1 style="font-size:32px;letter-spacing:8px;color:#6c5ce7">${code}</h1>
               <p>6位验证码，<strong>10分钟内</strong>有效</p>
               <p style="color:#999;font-size:12px">如果这不是你本人的操作，请忽略此邮件。</p>`,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend API error:", errText);
      return new Response(
        JSON.stringify({ error: "邮件发送失败，请检查邮箱是否正确" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 成功
    return new Response(
      JSON.stringify({ success: true, message: "验证码已发送" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(
      JSON.stringify({ error: "服务器内部错误" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
