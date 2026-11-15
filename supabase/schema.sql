-- 상품 테이블
create table if not exists products (
  id bigint generated always as identity primary key,
  name text not null,
  price integer not null,
  image_url text,
  description text
);

-- 주문 테이블
create table if not exists orders (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id),
  user_email text,
  product_id bigint not null references products(id),
  product_name text,
  amount integer,
  order_id text not null unique,          -- 토스에 넘기는 주문번호
  status text not null default 'PENDING', -- PENDING / PAID
  payment_key text,
  created_at timestamptz not null default now()
);

-- 주문 생성 시 가격·상품명·주문자를 서버에서 채움 (브라우저가 가격을 조작해도 무시)
create or replace function fill_order() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select name, price into new.product_name, new.amount from products where id = new.product_id;
  new.user_id := auth.uid();
  new.user_email := auth.jwt() ->> 'email';
  new.status := 'PENDING';
  new.payment_key := null;
  return new;
end $$;

drop trigger if exists fill_order_trigger on orders;
create trigger fill_order_trigger before insert on orders
for each row execute function fill_order();

-- 보안 규칙 (RLS)
alter table products enable row level security;
alter table orders enable row level security;

drop policy if exists "누구나 상품 조회" on products;
create policy "누구나 상품 조회" on products for select using (true);

drop policy if exists "본인 주문 또는 관리자 조회" on orders;
create policy "본인 주문 또는 관리자 조회" on orders for select to authenticated
  using (user_id = auth.uid() or (auth.jwt() ->> 'email') = 'admin@admin.com');

drop policy if exists "본인 주문 생성" on orders;
create policy "본인 주문 생성" on orders for insert to authenticated
  with check (user_id = auth.uid());
-- update 정책 없음: 결제 완료 처리는 서버 함수(service role)만 가능

-- 샘플 상품
insert into products (name, price, image_url, description)
select * from (values
  ('로고 머그컵', 12000, 'https://picsum.photos/seed/mug/400/300', '매일 쓰기 좋은 머그컵'),
  ('에코백', 15000, 'https://picsum.photos/seed/bag/400/300', '튼튼한 캔버스 에코백'),
  ('스티커 세트', 3000, 'https://picsum.photos/seed/sticker/400/300', '노트북에 붙이기 좋은 스티커 6종'),
  ('반팔 티셔츠', 25000, 'https://picsum.photos/seed/tshirt/400/300', '면 100% 반팔 티셔츠')
) as v(name, price, image_url, description)
where not exists (select 1 from products);
