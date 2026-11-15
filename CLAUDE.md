# CLAUDE.md

굿즈를 판매하는 작은 웹사이트입니다. 세부 구조는 [ARCH.md](ARCH.md)를 보세요.

## 목표
- 사용자가 회원가입 후 상품을 구매할 수 있다
- 사용자는 자기 결제 내역을 볼 수 있다
- 관리자(admin@admin.com)는 모든 사람의 결제 내역을 볼 수 있다
- 결제는 토스페이먼츠 **테스트 모드** (실제 돈이 나가지 않음)

## 기술
- 화면: HTML / CSS / JavaScript (빌드 도구 없음) → GitHub Pages로 호스팅
- 인증·DB: Supabase (프로젝트 ref: `lzqolvrpppiftgyfufey`, 서울 리전)
- 결제 승인: Supabase Edge Function `confirm-payment`
- 결제: 토스페이먼츠 결제창 SDK v2, 토스 공식 문서의 공개 테스트 키

## 페이지
| 파일 | 내용 |
|---|---|
| login.html | 회원가입 / 로그인 |
| index.html | 상품 목록, 구매 |
| orders.html | 내 결제 내역 |
| admin.html | 관리자: 전체 결제 내역 |
| success.html / fail.html | 결제 후 돌아오는 페이지 |

## 계정
- 관리자: `admin@admin.com` / `superadmin`
- 회원가입 시 이메일 인증 없음 (Supabase `mailer_autoconfirm = true`)

## 테스트 결제
테스트 모드라 결제창에서 아무 카드사나 선택해 진행하면 실제 출금 없이 승인됩니다.

## 작업 규칙
- 코드는 가능한 단순하게 유지
- 요청하지 않은 기능은 임의로 넣지 않기
- 비밀 키(토스 시크릿 키, Supabase service_role 키)는 절대 브라우저 코드(js/)에 넣지 않기
- Supabase 관리 토큰은 사용자 환경변수 `SUPABASE_ACCESS_TOKEN`에 있음 (저장소에 커밋 금지)
- DB 구조를 바꾸면 `supabase/schema.sql`과 ARCH.md도 함께 수정
