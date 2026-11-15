// 토스 결제 승인 함수 (Supabase Edge Function)
// 브라우저에서 { paymentKey, orderId, amount } 를 받아
// 1) DB 주문 금액과 비교 → 2) 토스 승인 API 호출 → 3) 주문을 PAID 로 변경
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const { paymentKey, orderId, amount } = await req.json();

  // 관리자 권한(service role)으로 DB 접근
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 요청한 사용자 확인
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const { data: userData } = await db.auth.getUser(token);
  if (!userData.user) return reply({ message: "로그인이 필요합니다." }, 401);

  // 주문 확인 (본인 주문 + 금액 일치)
  const { data: order } = await db.from("orders").select("*").eq("order_id", orderId).single();
  if (!order || order.user_id !== userData.user.id) return reply({ message: "주문을 찾을 수 없습니다." }, 404);
  if (order.status === "PAID") return reply({ message: "이미 결제된 주문입니다.", order });
  if (order.amount !== Number(amount)) return reply({ message: "결제 금액이 주문 금액과 다릅니다." }, 400);

  // 토스 결제 승인 요청
  const secretKey = Deno.env.get("TOSS_SECRET_KEY")!;
  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(secretKey + ":"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
  });
  const toss = await res.json();
  if (!res.ok) return reply({ message: toss.message ?? "결제 승인 실패" }, 400);

  // 주문 상태를 결제 완료로 변경
  const { data: updated } = await db.from("orders")
    .update({ status: "PAID", payment_key: paymentKey })
    .eq("order_id", orderId).select().single();

  return reply({ message: "결제 완료", order: updated });
});
