// 모든 페이지에서 같이 쓰는 코드
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 현재 로그인한 사용자 (없으면 null)
async function getUser() {
  const { data } = await sb.auth.getSession();
  return data.session ? data.session.user : null;
}

// 로그인 안 했으면 로그인 페이지로 보냄
async function requireLogin() {
  const user = await getUser();
  if (!user) location.href = "login.html";
  return user;
}

function isAdmin(user) {
  return !!user && user.email === ADMIN_EMAIL;
}

// 12000 → "12,000원"
function won(n) {
  return Number(n).toLocaleString("ko-KR") + "원";
}

function statusText(s) {
  return s === "PAID" ? "결제 완료" : "결제 대기";
}

// 상단 메뉴 그리기
async function renderNav() {
  const user = await getUser();
  let html = '<a href="index.html" class="logo">굿즈샵</a><span class="menu">';
  if (user) {
    html += '<a href="orders.html">내 결제 내역</a>';
    if (isAdmin(user)) html += '<a href="admin.html">관리자</a>';
    html += `<span class="email">${user.email}</span><a href="#" id="logout">로그아웃</a>`;
  } else {
    html += '<a href="login.html">로그인 / 회원가입</a>';
  }
  html += "</span>";
  document.getElementById("nav").innerHTML = html;

  const logout = document.getElementById("logout");
  if (logout) {
    logout.onclick = async (e) => {
      e.preventDefault();
      await sb.auth.signOut();
      location.href = "index.html";
    };
  }
}
