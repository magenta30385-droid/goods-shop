# ARCH.md — 세부 구조

## 전체 그림
```
[브라우저: GitHub Pages의 HTML/JS]
     │  supabase-js (anon 키)
     ├──────────────► [Supabase Auth]   회원가입 / 로그인
     ├──────────────► [Supabase DB]     products, orders (RLS로 보호)
     ├──────────────► [토스 결제창]      카드 결제 (테스트)
     └──────────────► [Edge Function: confirm-payment]
                              │  service_role 키, 토스 시크릿 키
                              ├──► 토스 결제 승인 API
                              └──► orders.status = 'PAID'
```

## 폴더
```
goods-shop/
├─ index.html, login.html, orders.html, admin.html, success.html, fail.html
├─ css/style.css          공통 스타일
├─ images/*.svg           상품 이미지 (products.image_url 에서 상대경로로 참조)
├─ js/config.js           Supabase URL, anon 키, 토스 클라이언트 키, 관리자 이메일 (공개 값만)
├─ js/common.js           Supabase 연결(sb), getUser, requireLogin, isAdmin, won, renderNav
└─ supabase/
   ├─ schema.sql                         테이블 + 트리거 + RLS + 샘플 상품
   └─ functions/confirm-payment/index.ts 결제 승인 서버 함수
```
외부 라이브러리는 CDN으로 불러옵니다.
- `@supabase/supabase-js@2.45.4` (jsdelivr)
- 토스 결제 SDK v2 `https://js.tosspayments.com/v2/standard`

## DB 테이블
**products** — id, name, price, image_url, description

**orders** — id, user_id, user_email, product_id, product_name, amount, order_id(토스 주문번호, unique), status(`PENDING`/`PAID`), payment_key, created_at

트리거 `fill_order`: 주문 insert 시 product_name·amount를 products에서, user_id·user_email을 로그인 정보에서 채우고 status를 PENDING으로 고정 → 브라우저가 가격을 조작할 수 없음.

## 보안 규칙 (RLS)
| 테이블 | 동작 | 허용 대상 |
|---|---|---|
| products | 조회 | 누구나 |
| orders | 조회 | 본인 주문, 또는 이메일이 admin@admin.com |
| orders | 생성 | 로그인한 본인 |
| orders | 수정 | 정책 없음 → Edge Function(service_role)만 가능 |

관리자 판별은 로그인 토큰(JWT)의 email 값으로 합니다. 관리자 계정은 Supabase Auth에 미리 생성되어 있습니다.

## 결제 흐름
1. index.html [구매하기] → `orders`에 insert (order_id만 보냄, 금액은 트리거가 채움)
2. 토스 결제창 `requestPayment` (금액 = DB에 저장된 amount)
3. 결제 성공 → 토스가 `success.html?paymentKey=..&orderId=..&amount=..`로 이동
4. success.html → `confirm-payment` 함수 호출 (로그인 토큰 자동 첨부)
5. 함수: 본인 주문인지, 금액이 DB와 같은지 확인 → 토스 `/v1/payments/confirm` 호출 → 성공 시 status=PAID
6. 실패 시 토스가 `fail.html?code=..&message=..`로 이동

## 키 관리
| 키 | 위치 | 공개 여부 |
|---|---|---|
| Supabase anon 키 | js/config.js | 공개 OK (RLS가 보호) |
| 토스 클라이언트 키 (test_ck_) | js/config.js | 공개 OK |
| 토스 시크릿 키 (test_sk_) | Supabase Secrets `TOSS_SECRET_KEY` | 비공개 |
| Supabase service_role 키 | Edge Function 환경변수 (자동) | 비공개 |
| Supabase 관리 토큰 | PC 사용자 환경변수 `SUPABASE_ACCESS_TOKEN` | 비공개 |

## 배포
- 화면: GitHub 저장소 `goods-shop` → GitHub Pages (main 브랜치 루트)
- DB 변경: `supabase/schema.sql`을 Supabase SQL 편집기 또는 관리 API로 실행
- 함수 변경: Supabase 관리 API `functions/deploy`로 재배포
