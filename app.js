import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.publishableKey
);

const plans = [
  { id: "10k", size: 10000, target: 8, daily: 4, maxdd: 8, price: 499 },
  { id: "25k", size: 25000, target: 8, daily: 4, maxdd: 8, price: 999 },
  { id: "50k", size: 50000, target: 10, daily: 5, maxdd: 10, price: 1999 },
  { id: "100k", size: 100000, target: 10, daily: 5, maxdd: 10, price: 3499 }
];

let user = null;
let account = null;
let trades = [];
let signupMode = true;

const $ = id => document.getElementById(id);

const money = value =>
  "$" + Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

function showPage(id) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  const page = $(id);
  if (page) page.classList.add("active");
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    if (!user) {
      showPage("auth");
      return;
    }

    showPage(button.dataset.page);
    updateDashboard();
  });
});

async function loadAccount() {
  if (!user) return;

  const { data, error } = await supabase
    .from("accounts")
    .select("*, account_plans(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  if (!data) {
    account = null;
    trades = [];
    return;
  }

  account = {
    id: data.id,
    accountNumber: data.account_number,
    size: Number(data.balance),
    balance: Number(data.balance),
    equity: Number(data.equity),
    target: Number(data.account_plans.profit_target_pct),
    daily: Number(data.account_plans.daily_loss_pct),
    maxdd: Number(data.account_plans.max_drawdown_pct),
    status: data.status,
    reason: data.breach_reason
  };

  const result = await supabase
    .from("trades")
    .select("*")
    .eq("account_id", account.id)
    .order("opened_at", { ascending: false });

  trades = (result.data || []).map(trade => ({
    side: trade.side,
    size: Number(trade.quantity),
    pnl: Number(trade.pnl),
    time: trade.opened_at
  }));

  await checkRules();
  updateDashboard();
}

function renderPlans() {
  $("account-grid").innerHTML = plans.map(plan => `
    <div class="account panel">
      <div class="eyebrow">DEMO ACCOUNT</div>

      <div class="size">$${plan.size / 1000}K</div>

      <div class="price">
        ₹${plan.price.toLocaleString()}
        <span class="muted">display price</span>
      </div>

      <ul>
        <li>Target ${plan.target}%</li>
        <li>Daily loss ${plan.daily}%</li>
        <li>Max drawdown ${plan.maxdd}%</li>
      </ul>

      <button class="primary choose" data-id="${plan.id}">
        Choose Account
      </button>
    </div>
  `).join("");

  document.querySelectorAll(".choose").forEach(button => {
    button.addEventListener("click", () => {
      if (!user) {
        showPage("auth");
        return;
      }

      const plan = plans.find(x => x.id === button.dataset.id);

      $("coupon-box").classList.remove("hidden");
      $("coupon-box").dataset.id = plan.id;

      $("selected-plan").textContent =
        `Selected: $${plan.size / 1000}K account — ₹${plan.price.toLocaleString()}`;

      $("coupon-msg").textContent = "";
      $("coupon").value = "";
      $("coupon").focus();
    });
  });
}

$("activate").addEventListener("click", async () => {
  if (!user) {
    showPage("auth");
    return;
  }

  const planId = $("coupon-box").dataset.id;
  const plan = plans.find(x => x.id === planId);

  if (!plan) {
    $("coupon-msg").textContent = "Please select an account first.";
    return;
  }

  const code = $("coupon").value.trim().toUpperCase();

  if (!code) {
    $("coupon-msg").textContent = "Enter a coupon code.";
    return;
  }

  const { data: coupon, error: couponError } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();

  if (couponError || !coupon) {
    $("coupon-msg").textContent =
      "Invalid coupon. Try FRIENDS100.";
    return;
  }

  if (Number(coupon.discount_pct) !== 100) {
    $("coupon-msg").textContent =
      "This demo requires a 100% coupon.";
    return;
  }

  const { data: dbPlan, error: planError } = await supabase
    .from("account_plans")
    .select("*")
    .eq("size", plan.size)
    .eq("active", true)
    .maybeSingle();

  if (planError || !dbPlan) {
    $("coupon-msg").textContent =
      "Account plan is unavailable.";
    return;
  }

  const accountNumber =
    "007-" + Math.floor(100000 + Math.random() * 900000);

  const { data: newAccount, error: accountError } =
    await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        plan_id: dbPlan.id,
        account_number: accountNumber,
        balance: dbPlan.size,
        equity: dbPlan.size,
        status: "ACTIVE"
      })
      .select()
      .single();

  if (accountError) {
    $("coupon-msg").textContent = accountError.message;
    return;
  }

  await supabase
    .from("coupon_redemptions")
    .insert({
      coupon_id: coupon.id,
      user_id: user.id,
      account_id: newAccount.id
    });

  $("coupon-msg").textContent =
    "100% discount applied. Account activated.";

  await loadAccount();
  showPage("dashboard");
});

function totalPnl() {
  return trades.reduce(
    (total, trade) => total + Number(trade.pnl),
    0
  );
}

async function checkRules() {
  if (!account) return;

  const pnl = totalPnl();
  const equity = account.balance + pnl;

  const today = new Date().toDateString();

  const dailyPnl = trades
    .filter(trade => new Date(trade.time).toDateString() === today)
    .reduce(
      (total, trade) => total + Number(trade.pnl),
      0
    );

  const maxLoss =
    account.size * (account.maxdd / 100);

  const dailyLoss =
    account.size * (account.daily / 100);

  const target =
    account.size * (account.target / 100);

  let status = account.status;
  let reason = account.reason;

  if (equity <= account.size - maxLoss) {
    status = "BREACHED";
    reason = "Maximum drawdown limit reached";
  } else if (dailyPnl <= -dailyLoss) {
    status = "BREACHED";
    reason = "Daily loss limit reached";
  } else if (pnl >= target) {
    status = "PASSED";
    reason = "Profit target reached";
  }

  account.equity = equity;
  account.status = status;
  account.reason = reason;

  await supabase
    .from("accounts")
    .update({
      equity,
      status,
      breach_reason: reason || null
    })
    .eq("id", account.id)
    .eq("user_id", user.id);
}

function updateDashboard() {
  if (!account) return;

  const pnl = totalPnl();

  const drawdown = Math.max(
    0,
    account.size - account.equity
  );

  $("account-title").textContent =
    `$${account.size / 1000}K Account`;

  $("account-status").textContent =
    account.status;

  $("balance").textContent =
    money(account.balance);

  $("equity").textContent =
    money(account.equity);

  $("pnl").textContent =
    money(pnl);

  $("dd").textContent =
    money(drawdown);

  $("rules").innerHTML = `
    <div class="rule">
      <span>Profit Target</span>
      <b>${account.target}%</b>
    </div>

    <div class="rule">
      <span>Daily Loss Limit</span>
      <b>${account.daily}%</b>
    </div>

    <div class="rule">
      <span>Max Drawdown</span>
      <b>${account.maxdd}%</b>
    </div>
  `;

  $("status-detail").textContent =
    account.status === "ACTIVE"
      ? "Account is active. Trade within the rules."
      : `${account.status}: ${account.reason || ""}`;

  $("buy").disabled =
    account.status !== "ACTIVE";

  $("sell").disabled =
    account.status !== "ACTIVE";

  renderHistory();
}

async function addTrade(side) {
  if (!account) {
    $("trade-msg").textContent =
      "Activate an account first.";
    return;
  }

  if (account.status !== "ACTIVE") {
    $("trade-msg").textContent =
      "Trading locked: " + account.status;
    return;
  }

  let pnl =
    Number($("trade-pnl").value) || 0;

  if (side === "SELL") {
    pnl = -pnl;
  }

  const quantity =
    Number($("size").value) || 0.1;

  const { data, error } =
    await supabase
      .from("trades")
      .insert({
        account_id: account.id,
        symbol: "EURUSD",
        side,
        quantity,
        pnl,
        status: "CLOSED"
      })
      .select()
      .single();

  if (error) {
    $("trade-msg").textContent =
      error.message;
    return;
  }

  trades.unshift({
    side,
    size: quantity,
    pnl,
    time: data.opened_at
  });

  await checkRules();
  updateDashboard();

  $("trade-msg").textContent =
    `${side} trade recorded. P&L ${money(pnl)}.`;
}

$("buy").addEventListener(
  "click",
  () => addTrade("BUY")
);

$("sell").addEventListener(
  "click",
  () => addTrade("SELL")
);

function renderHistory() {
  if (!trades.length) {
    $("history").innerHTML =
      "No trades yet.";
    return;
  }

  $("history").innerHTML =
    trades.slice(0, 20).map(trade => `
      <div class="trade-row">
        <span>${trade.side}</span>
        <span>${trade.size}</span>
        <span>${money(trade.pnl)}</span>
        <span>${new Date(trade.time).toLocaleTimeString()}</span>
      </div>
    `).join("");
}

$("auth-toggle").addEventListener("click", () => {
  signupMode = !signupMode;

  $("auth-title").textContent =
    signupMode
      ? "Create your trader account"
      : "Welcome back";

  $("signup-fields").style.display =
    signupMode ? "block" : "none";

  $("auth-submit").textContent =
    signupMode ? "Create account" : "Login";

  $("auth-toggle").textContent =
    signupMode
      ? "Already have an account? Login"
      : "Need an account? Register";

  $("auth-msg").textContent = "";
});

$("auth-submit").addEventListener(
  "click",
  async () => {

    const email =
      $("auth-email").value.trim();

    const password =
      $("auth-password").value;

    if (!email || password.length < 6) {
      $("auth-msg").textContent =
        "Enter a valid email and a password of at least 6 characters.";
      return;
    }

    if (signupMode) {

      const name =
        $("auth-name").value.trim();

      const { error } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name
            }
          }
        });

      if (error) {
        $("auth-msg").textContent =
          error.message;
        return;
      }

      $("auth-msg").textContent =
        "Registration successful. Check your email if confirmation is enabled.";

      signupMode = false;

      $("signup-fields").style.display =
        "none";

      $("auth-title").textContent =
        "Welcome back";

      $("auth-submit").textContent =
        "Login";

    } else {

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        $("auth-msg").textContent =
          error.message;
        return;
      }

      user = data.user;

      await loadAccount();

      showPage("home");
    }
  }
);

$("logout").addEventListener(
  "click",
  async () => {
    await supabase.auth.signOut();

    user = null;
    account = null;
    trades = [];

    showPage("auth");
  }
);

async function boot() {

  renderPlans();
  createCandles();

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {

    user = session.user;

    await loadAccount();

    showPage("home");

  } else {

    showPage("auth");
  }

  supabase.auth.onAuthStateChange(
    async (_event, session) => {

      if (session) {

        user = session.user;

        await loadAccount();

        showPage("home");

      } else {

        user = null;
        account = null;
        trades = [];

        showPage("auth");
      }
    }
  );
}

function createCandles() {

  let html = "";

  for (let i = 0; i < 55; i++) {

    const height =
      25 + Math.random() * 130;

    html += `
      <div
        class="candle"
        style="height:${height}px">
      </div>
    `;
  }

  $("candles").innerHTML = html;
}

boot();
