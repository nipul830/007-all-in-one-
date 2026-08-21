// =====================================================
// PROP DEMO V4
// LIVE MARKET + VIRTUAL TRADING + OPEN POSITIONS
// =====================================================

import {
  createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


// =====================================================
// SUPABASE
// =====================================================

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);


// =====================================================
// CONFIG
// =====================================================

const FUNCTION_NAME = "clever-function";

const MARKET_REFRESH_MS = 15000;


// =====================================================
// PLANS
// =====================================================

const PLANS = [

  {
    id: "starter",
    name: "Starter",
    size: "$10K",
    balance: 10000,
    price: "$0 Demo",
    target: 8,
    dailyLoss: 5,
    drawdown: 10
  },

  {
    id: "pro",
    name: "Pro",
    size: "$25K",
    balance: 25000,
    price: "$0 Demo",
    target: 8,
    dailyLoss: 5,
    drawdown: 10
  },

  {
    id: "advanced",
    name: "Advanced",
    size: "$50K",
    balance: 50000,
    price: "$0 Demo",
    target: 10,
    dailyLoss: 5,
    drawdown: 10
  },

  {
    id: "elite",
    name: "Elite",
    size: "$100K",
    balance: 100000,
    price: "$0 Demo",
    target: 10,
    dailyLoss: 5,
    drawdown: 10
  }

];


// =====================================================
// SUPPORTED SYMBOLS
// =====================================================

const SYMBOLS = [

  {
    value: "EUR/USD",
    label: "EUR/USD",
    type: "forex",
    contract: 100000
  },

  {
    value: "GBP/USD",
    label: "GBP/USD",
    type: "forex",
    contract: 100000
  },

  {
    value: "USD/JPY",
    label: "USD/JPY",
    type: "forex",
    contract: 100000
  },

  {
    value: "USD/CHF",
    label: "USD/CHF",
    type: "forex",
    contract: 100000
  },

  {
    value: "AUD/USD",
    label: "AUD/USD",
    type: "forex",
    contract: 100000
  },

  {
    value: "USD/CAD",
    label: "USD/CAD",
    type: "forex",
    contract: 100000
  },

  {
    value: "NZD/USD",
    label: "NZD/USD",
    type: "forex",
    contract: 100000
  },

  {
    value: "XAU/USD",
    label: "XAU/USD",
    type: "gold",
    contract: 100
  },

  {
    value: "XAG/USD",
    label: "XAG/USD",
    type: "metal",
    contract: 5000
  },

  {
    value: "BTC/USD",
    label: "BTC/USD",
    type: "crypto",
    contract: 1
  },

  {
    value: "ETH/USD",
    label: "ETH/USD",
    type: "crypto",
    contract: 1
  },

  {
    value: "SOL/USD",
    label: "SOL/USD",
    type: "crypto",
    contract: 1
  }

];


// =====================================================
// STATE
// =====================================================

let currentUser = null;

let currentAccount = null;

let selectedPlan = null;

let trades = [];

let openTrades = [];

let marketPrices = {};

let marketTimer = null;

let currentPage = "auth";

let loginMode = false;


// =====================================================
// HELPERS
// =====================================================

function $(id) {
  return document.getElementById(id);
}


function money(value) {

  return Number(
    value || 0
  ).toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2
    }
  );

}


function number(value, decimals = 5) {

  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "0";
  }

  return n.toFixed(decimals);

}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function getSymbolInfo(symbol) {

  return (
    SYMBOLS.find(
      item =>
        item.value === symbol
    ) ||
    {
      value: symbol,
      label: symbol,
      type: "other",
      contract: 1
    }
  );

}


function getDecimals(symbol) {

  if (
    symbol === "USD/JPY"
  ) {
    return 3;
  }

  if (
    symbol === "BTC/USD" ||
    symbol === "ETH/USD" ||
    symbol === "SOL/USD"
  ) {
    return 2;
  }

  if (
    symbol === "XAU/USD"
  ) {
    return 2;
  }

  return 5;

}


function createId() {

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {

    return crypto.randomUUID();

  }

  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );

}


function showPage(pageId) {

  currentPage = pageId;

  document
    .querySelectorAll(".page")
    .forEach(
      page => {

        page.classList.remove(
          "active"
        );

      }
    );


  const page = $(pageId);

  if (page) {

    page.classList.add(
      "active"
    );

  }


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


function setMessage(
  id,
  message,
  success = false
) {

  const el = $(id);

  if (!el) {
    return;
  }

  el.textContent = message;

  el.style.color =
    success
      ? "var(--green)"
      : "var(--muted)";

}


// =====================================================
// STORAGE KEYS
// =====================================================

function accountStorageKey() {

  return currentUser
    ? `propdemo_account_${currentUser.id}`
    : "propdemo_account";

}


function tradesStorageKey() {

  return currentUser
    ? `propdemo_trades_${currentUser.id}`
    : "propdemo_trades";

}


function openTradesStorageKey() {

  return currentUser
    ? `propdemo_open_trades_${currentUser.id}`
    : "propdemo_open_trades";

}


// =====================================================
// STORAGE
// =====================================================

function saveAccount() {

  if (!currentAccount) {
    return;
  }

  localStorage.setItem(
    accountStorageKey(),
    JSON.stringify(
      currentAccount
    )
  );

}


function loadAccount() {

  const raw =
    localStorage.getItem(
      accountStorageKey()
    );

  if (!raw) {

    currentAccount = null;

    return;

  }

  try {

    currentAccount =
      JSON.parse(raw);

  } catch {

    currentAccount = null;

  }

}


function saveTrades() {

  localStorage.setItem(
    tradesStorageKey(),
    JSON.stringify(
      trades
    )
  );

}


function loadTrades() {

  const raw =
    localStorage.getItem(
      tradesStorageKey()
    );

  if (!raw) {

    trades = [];

    return;

  }

  try {

    trades =
      JSON.parse(raw);

  } catch {

    trades = [];

  }

}


function saveOpenTrades() {

  localStorage.setItem(
    openTradesStorageKey(),
    JSON.stringify(
      openTrades
    )
  );

}


function loadOpenTrades() {

  const raw =
    localStorage.getItem(
      openTradesStorageKey()
    );

  if (!raw) {

    openTrades = [];

    return;

  }

  try {

    openTrades =
      JSON.parse(raw);

  } catch {

    openTrades = [];

  }

}


// =====================================================
// NAVIGATION
// =====================================================

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "[data-page]"
      );

    if (!button) {
      return;
    }

    const page =
      button.dataset.page;

    if (
      !currentUser &&
      page !== "auth"
    ) {

      showPage("auth");

      setMessage(
        "auth-msg",
        "Please login first."
      );

      return;

    }

    showPage(page);

    if (
      page === "accounts"
    ) {

      renderPlans();

    }

    if (
      page === "dashboard"
    ) {

      renderDashboard();

    }

    if (
      page === "terminal"
    ) {

      loadTerminal();

    }

    if (
      page === "home"
    ) {

      updateHomePrice();

    }

  }
);


// =====================================================
// AUTH UI
// =====================================================

function updateAuthUI() {

  const title =
    $("auth-title");

  const submit =
    $("auth-submit");

  const toggle =
    $("auth-toggle");

  const fields =
    $("signup-fields");

  if (
    !title ||
    !submit ||
    !toggle ||
    !fields
  ) {
    return;
  }

  if (loginMode) {

    title.textContent =
      "Welcome back";

    submit.textContent =
      "Login";

    toggle.textContent =
      "Don't have an account? Create one";

    fields.style.display =
      "none";

  } else {

    title.textContent =
      "Create your trader account";

    submit.textContent =
      "Create account";

    toggle.textContent =
      "Already have an account? Login";

    fields.style.display =
      "block";

  }

}


$("auth-toggle")?.addEventListener(
  "click",
  () => {

    loginMode =
      !loginMode;

    setMessage(
      "auth-msg",
      ""
    );

    updateAuthUI();

  }
);


// =====================================================
// LOGIN / SIGNUP
// =====================================================

$("auth-submit")?.addEventListener(
  "click",
  async () => {

    const email =
      $("auth-email")
        ?.value
        .trim();

    const password =
      $("auth-password")
        ?.value;

    const name =
      $("auth-name")
        ?.value
        .trim();

    if (
      !email ||
      !password
    ) {

      setMessage(
        "auth-msg",
        "Email and password required."
      );

      return;

    }

    if (
      password.length < 6
    ) {

      setMessage(
        "auth-msg",
        "Password must be at least 6 characters."
      );

      return;

    }

    setMessage(
      "auth-msg",
      "Please wait..."
    );

    try {

      if (loginMode) {

        const {
          data,
          error
        } =
          await supabase
            .auth
            .signInWithPassword({
              email,
              password
            });

        if (error) {
          throw error;
        }

        currentUser =
          data.user;

        setMessage(
          "auth-msg",
          "Login successful.",
          true
        );

        await startApp();

      } else {

        const {
          data,
          error
        } =
          await supabase
            .auth
            .signUp({

              email,

              password,

              options: {
                data: {
                  full_name:
                    name
                }
              }

            });

        if (error) {
          throw error;
        }

        if (!data.session) {

          setMessage(
            "auth-msg",
            "Account created. Check your email to confirm your account.",
            true
          );

          return;

        }

        currentUser =
          data.user;

        await startApp();

      }

    } catch (error) {

      console.error(
        error
      );

      setMessage(
        "auth-msg",
        error.message ||
        "Authentication failed."
      );

    }

  }
);


// =====================================================
// LOGOUT
// =====================================================

$("logout")?.addEventListener(
  "click",
  async () => {

    if (marketTimer) {

      clearInterval(
        marketTimer
      );

      marketTimer = null;

    }

    await supabase
      .auth
      .signOut();

    currentUser = null;

    currentAccount = null;

    selectedPlan = null;

    trades = [];

    openTrades = [];

    marketPrices = {};

    showPage("auth");

    setMessage(
      "auth-msg",
      "Logged out."
    );

  }
);


// =====================================================
// ACCOUNT PLANS
// =====================================================

function renderPlans() {

  const grid =
    $("account-grid");

  if (!grid) {
    return;
  }

  grid.innerHTML =
    PLANS
      .map(
        plan => `

          <div class="account panel">

            <p class="eyebrow">
              ${escapeHTML(plan.name)}
            </p>

            <h3>
              ${escapeHTML(plan.size)}
            </h3>

            <div class="size">
              ${money(plan.balance)}
            </div>

            <div class="price">
              ${escapeHTML(plan.price)}
            </div>

            <ul>

              <li>
                Profit Target:
                ${plan.target}%
              </li>

              <li>
                Daily Loss:
                ${plan.dailyLoss}%
              </li>

              <li>
                Max Drawdown:
                ${plan.drawdown}%
              </li>

              <li>
                Real Market Data
              </li>

              <li>
                Virtual Trading
              </li>

            </ul>

            <button
              class="primary"
              data-select-plan="${plan.id}"
            >
              Select Account
            </button>

          </div>

        `
      )
      .join("");

}


document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "[data-select-plan]"
      );

    if (!button) {
      return;
    }

    const planId =
      button.dataset.selectPlan;

    selectedPlan =
      PLANS.find(
        plan =>
          plan.id ===
          planId
      );

    if (!selectedPlan) {
      return;
    }

    $("coupon-box")
      ?.classList
      .remove("hidden");

    const selected =
      $("selected-plan");

    if (selected) {

      selected.textContent =
        `${selectedPlan.name} — ${selectedPlan.size} — ${money(selectedPlan.balance)} virtual balance`;

    }

    $("coupon")
      ?.focus();

  }
);


// =====================================================
// ACTIVATE ACCOUNT
// =====================================================

$("activate")?.addEventListener(
  "click",
  async () => {

    if (!currentUser) {

      showPage("auth");

      return;

    }

    if (!selectedPlan) {

      setMessage(
        "coupon-msg",
        "Select an account first."
      );

      return;

    }

    const coupon =
      $("coupon")
        ?.value
        .trim()
        .toUpperCase();

    if (
      coupon !==
      "FRIENDS100"
    ) {

      setMessage(
        "coupon-msg",
        "Invalid coupon code."
      );

      return;

    }

    currentAccount = {

      planId:
        selectedPlan.id,

      planName:
        selectedPlan.name,

      balance:
        selectedPlan.balance,

      equity:
        selectedPlan.balance,

      pnl:
        0,

      drawdown:
        0,

      status:
        "ACTIVE",

      activatedAt:
        new Date()
          .toISOString(),

      rules: {

        target:
          selectedPlan.target,

        dailyLoss:
          selectedPlan.dailyLoss,

        maxDrawdown:
          selectedPlan.drawdown

      }

    };

    trades = [];

    openTrades = [];

    saveAccount();
    saveTrades();
    saveOpenTrades();

    setMessage(
      "coupon-msg",
      "Account activated successfully!",
      true
    );

    renderDashboard();

    setTimeout(
      () => {

        showPage(
          "dashboard"
        );

      },
      400
    );

  }
);


// =====================================================
// DASHBOARD
// =====================================================

function calculateUnrealizedPnL() {

  return openTrades.reduce(
    (
      total,
      trade
    ) => {

      return (
        total +
        getTradePnL(
          trade
        )
      );

    },
    0
  );

}


function refreshAccountEquity() {

  if (!currentAccount) {
    return;
  }

  const unrealized =
    calculateUnrealizedPnL();

  currentAccount.equity =
    currentAccount.balance +
    currentAccount.pnl +
    unrealized;

  currentAccount.drawdown =
    Math.max(
      0,
      currentAccount.balance -
      currentAccount.equity
    );

  saveAccount();

}


function renderDashboard() {

  if (!currentAccount) {

    if ($("account-title")) {
      $("account-title").textContent =
        "No account";
    }

    if ($("account-status")) {
      $("account-status").textContent =
        "INACTIVE";
    }

    if ($("balance")) {
      $("balance").textContent =
        "$0.00";
    }

    if ($("equity")) {
      $("equity").textContent =
        "$0.00";
    }

    if ($("pnl")) {
      $("pnl").textContent =
        "$0.00";
    }

    if ($("dd")) {
      $("dd").textContent =
        "$0.00";
    }

    if ($("rules")) {

      $("rules").innerHTML = `
        <p class="muted">
          Activate an account to see your rules.
        </p>
      `;

    }

    if ($("status-detail")) {

      $("status-detail").textContent =
        "Activate an account to start.";

    }

    return;

  }

  refreshAccountEquity();

  if ($("account-title")) {

    $("account-title").textContent =
      `${currentAccount.planName} Account`;

  }

  if ($("account-status")) {

    $("account-status").textContent =
      currentAccount.status;

  }

  if ($("balance")) {

    $("balance").textContent =
      money(
        currentAccount.balance
      );

  }

  if ($("equity")) {

    $("equity").textContent =
      money(
        currentAccount.equity
      );

  }

  if ($("pnl")) {

    $("pnl").textContent =
      money(
        currentAccount.pnl +
        calculateUnrealizedPnL()
      );

  }

  if ($("dd")) {

    $("dd").textContent =
      money(
        currentAccount.drawdown
      );

  }

  if ($("rules")) {

    $("rules").innerHTML = `

      <div class="rule">

        <span>
          Profit Target
        </span>

        <b>
          ${currentAccount.rules.target}%
        </b>

      </div>

      <div class="rule">

        <span>
          Daily Loss Limit
        </span>

        <b>
          ${currentAccount.rules.dailyLoss}%
        </b>

      </div>

      <div class="rule">

        <span>
          Maximum Drawdown
        </span>

        <b>
          ${currentAccount.rules.maxDrawdown}%
        </b>

      </div>

      <div class="rule">

        <span>
          Trading Mode
        </span>

        <b class="green">
          VIRTUAL
        </b>

      </div>

    `;

  }

  if ($("status-detail")) {

    $("status-detail").innerHTML = `

      <strong class="green">
        ACTIVE
      </strong>

      <br>

      Account:
      ${escapeHTML(
        currentAccount.planName
      )}

      <br>

      Virtual Balance:
      ${money(
        currentAccount.balance
      )}

      <br>

      Open Positions:
      ${openTrades.length}

    `;

  }

}


// =====================================================
// TRADINGVIEW CHART
// =====================================================

function loadTradingViewChart() {

  const container =
    $("tradingview-widget");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.className =
    "tradingview-widget-container";

  wrapper.style.width =
    "100%";

  wrapper.style.height =
    "100%";

  const widget =
    document.createElement(
      "div"
    );

  widget.className =
    "tradingview-widget-container__widget";

  widget.style.width =
    "100%";

  widget.style.height =
    "100%";

  wrapper.appendChild(
    widget
  );

  container.appendChild(
    wrapper
  );

  const script =
    document.createElement(
      "script"
    );

  script.src =
    "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

  script.async = true;

  script.innerHTML =
    JSON.stringify({

      autosize:
        true,

      symbol:
        getTradingViewSymbol(
          $("symbol")?.value ||
          "EUR/USD"
        ),

      interval:
        "5",

      timezone:
        "Etc/UTC",

      theme:
        "dark",

      style:
        "1",

      locale:
        "en",

      allow_symbol_change:
        true,

      hide_top_toolbar:
        false,

      hide_legend:
        false,

      save_image:
        false,

      calendar:
        false,

      support_host:
        "https://www.tradingview.com"

    });

  wrapper.appendChild(
    script
  );

}


function getTradingViewSymbol(
  symbol
) {

  const map = {

    "EUR/USD":
      "FX:EURUSD",

    "GBP/USD":
      "FX:GBPUSD",

    "USD/JPY":
      "FX:USDJPY",

    "USD/CHF":
      "FX:USDCHF",

    "AUD/USD":
      "FX:AUDUSD",

    "USD/CAD":
      "FX:USDCAD",

    "NZD/USD":
      "FX:NZDUSD",

    "XAU/USD":
      "OANDA:XAUUSD",

    "XAG/USD":
      "OANDA:XAGUSD",

    "BTC/USD":
      "COINBASE:BTCUSD",

    "ETH/USD":
      "COINBASE:ETHUSD",

    "SOL/USD":
      "COINBASE:SOLUSD"

  };

  return (
    map[symbol] ||
    "FX:EURUSD"
  );

}


// =====================================================
// CHART FULLSCREEN
// =====================================================

function enableChartFullscreen() {

  const container =
    $("tradingview-widget");

  if (!container) {
    return;
  }

  const chartBox =
    container.closest(
      ".chart"
    );

  if (!chartBox) {
    return;
  }

  if (
    $("chart-fullscreen")
  ) {
    return;
  }

  const button =
    document.createElement(
      "button"
    );

  button.id =
    "chart-fullscreen";

  button.className =
    "secondary";

  button.textContent =
    "⛶ Full Screen";

  button.style.marginBottom =
    "10px";

  button.addEventListener(
    "click",
    async () => {

      if (
        !document.fullscreenElement
      ) {

        try {

          await chartBox.requestFullscreen();

        } catch {

          chartBox.classList.toggle(
            "chart-expanded"
          );

        }

      } else {

        await document.exitFullscreen();

      }

    }
  );

  chartBox.parentElement
    ?.insertBefore(
      button,
      chartBox
    );

}


// =====================================================
// SUPABASE EDGE FUNCTION
// =====================================================

async function getMarketPrice(
  symbol = "EUR/USD"
) {

  const endpoint =
    `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`;

  const response =
    await fetch(
      `${endpoint}?symbol=${encodeURIComponent(symbol)}`,
      {

        method:
          "POST",

        headers: {

          "Content-Type":
            "application/json",

          "apikey":
            SUPABASE_PUBLISHABLE_KEY,

          "Authorization":
            `Bearer ${SUPABASE_PUBLISHABLE_KEY}`

        },

        body:
          "{}",

        cache:
          "no-store"

      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    data.success === false
  ) {

    throw new Error(
      data.error ||
      "Market data unavailable"
    );

  }

  return data;

}


// =====================================================
// PRICE HELPERS
// =====================================================

function getCurrentPrice(
  symbol
) {

  return Number(
    marketPrices[symbol]
      ?.price
  );

}


function getTradePnL(
  trade
) {

  const current =
    getCurrentPrice(
      trade.symbol
    );

  const entry =
    Number(
      trade.entry
    );

  const size =
    Number(
      trade.size
    );

  if (
    !Number.isFinite(current) ||
    !Number.isFinite(entry) ||
    !Number.isFinite(size)
  ) {

    return 0;

  }

  const info =
    getSymbolInfo(
      trade.symbol
    );

  const difference =
    trade.side === "BUY"
      ? current - entry
      : entry - current;

  return (
    difference *
    size *
    info.contract
  );

}


// =====================================================
// UPDATE MARKET PRICE
// =====================================================

async function updateOneMarketPrice(
  symbol
) {

  try {

    const data =
      await getMarketPrice(
        symbol
      );

    marketPrices[symbol] = {

      ...data,

      price:
        Number(
          data.price
        ),

      percentChange:
        Number(
          data.percentChange ||
          0
        )

    };

    return data;

  } catch (error) {

    console.error(
      `Market error ${symbol}:`,
      error
    );

    return null;

  }

}


async function updateMarketPrice() {

  const selected =
    $("symbol")
      ?.value ||
    "EUR/USD";

  const needed =
    new Set();

  needed.add(
    selected
  );

  openTrades.forEach(
    trade => {

      needed.add(
        trade.symbol
      );

    }
  );

  const symbols =
    [...needed];

  /*
   * Sequential requests are intentional.
   * Twelve Data free plans have request limits.
   */

  for (
    const symbol
    of symbols
  ) {

    await updateOneMarketPrice(
      symbol
    );

  }

  updateMarketUI();

  checkStopLossTakeProfit();

  renderOpenTrades();

  refreshAccountEquity();

  renderDashboard();

  renderChartPnL();

}


function updateMarketUI() {

  const symbol =
    $("symbol")
      ?.value ||
    "EUR/USD";

  const data =
    marketPrices[symbol];

  if (!data) {
    return;
  }

  const price =
    Number(
      data.price
    );

  const change =
    Number(
      data.percentChange ||
      0
    );

  const decimals =
    getDecimals(
      symbol
    );

  if ($("market-price")) {

    $("market-price").textContent =
      Number.isFinite(price)
        ? price.toFixed(
            decimals
          )
        : "Unavailable";

  }

  if ($("market-change")) {

    $("market-change").textContent =
      `${change >= 0 ? "+" : ""}${change.toFixed(3)}%`;

    $("market-change").style.color =
      change >= 0
        ? "var(--green)"
        : "var(--red)";

  }

  if ($("market-symbol")) {

    $("market-symbol").textContent =
      data.symbol ||
      symbol;

  }

  if ($("market-status")) {

    $("market-status").textContent =
      "● LIVE MARKET";

    $("market-status").style.color =
      "var(--green)";

  }

  if ($("home-price")) {

    $("home-price").textContent =
      price.toFixed(
        decimals
      );

  }

}


// =====================================================
// HOME PRICE
// =====================================================

async function updateHomePrice() {

  const symbol =
    "EUR/USD";

  const data =
    await updateOneMarketPrice(
      symbol
    );

  if (!data) {
    return;
  }

  if ($("home-price")) {

    $("home-price").textContent =
      Number(
        data.price
      ).toFixed(
        getDecimals(symbol)
      );

  }

}


// =====================================================
// SYMBOL SELECT
// =====================================================

function populateSymbols() {

  const select =
    $("symbol");

  if (!select) {
    return;
  }

  const current =
    select.value ||
    "EUR/USD";

  select.innerHTML =
    SYMBOLS
      .map(
        item => `

          <option
            value="${escapeHTML(
              item.value
            )}"
          >
            ${escapeHTML(
              item.label
            )}
          </option>

        `
      )
      .join("");

  select.value =
    SYMBOLS.some(
      item =>
        item.value === current
    )
      ? current
      : "EUR/USD";

}


$("symbol")?.addEventListener(
  "change",
  async () => {

    loadTradingViewChart();

    await updateMarketPrice();

  }
);


// =====================================================
// TERMINAL
// =====================================================

function loadTerminal() {

  populateSymbols();

  loadTradingViewChart();

  enableChartFullscreen();

  updateMarketPrice();

  renderOpenTrades();

  renderHistory();

  renderChartPnL();

  if (marketTimer) {

    clearInterval(
      marketTimer
    );

  }

  marketTimer =
    setInterval(
      updateMarketPrice,
      MARKET_REFRESH_MS
    );

}


// =====================================================
// ORDER INPUTS
// =====================================================

function getOrderValues() {

  const symbol =
    $("symbol")
      ?.value ||
    "EUR/USD";

  const size =
    Number(
      $("size")
        ?.value
    );

  const slRaw =
    $("stop-loss")
      ?.value
      ?.trim();

  const tpRaw =
    $("take-profit")
      ?.value
      ?.trim();

  const sideSelect =
    $("side")
      ?.value;

  return {

    symbol,

    size,

    sl:
      slRaw
        ? Number(slRaw)
        : null,

    tp:
      tpRaw
        ? Number(tpRaw)
        : null,

    side:
      sideSelect === "SELL"
        ? "SELL"
        : "BUY"

  };

}


// =====================================================
// SL / TP VALIDATION
// =====================================================

function validateStops(
  side,
  entry,
  sl,
  tp
) {

  if (
    sl !== null &&
    !Number.isFinite(sl)
  ) {

    return "Invalid Stop Loss.";

  }

  if (
    tp !== null &&
    !Number.isFinite(tp)
  ) {

    return "Invalid Take Profit.";

  }

  if (
    side === "BUY"
  ) {

    if (
      sl !== null &&
      sl >= entry
    ) {

      return "For BUY, Stop Loss must be below entry price.";

    }

    if (
      tp !== null &&
      tp <= entry
    ) {

      return "For BUY, Take Profit must be above entry price.";

    }

  } else {

    if (
      sl !== null &&
      sl <= entry
    ) {

      return "For SELL, Stop Loss must be above entry price.";

    }

    if (
      tp !== null &&
      tp >= entry
    ) {

      return "For SELL, Take Profit must be below entry price.";

    }

  }

  return null;

}


// =====================================================
// OPEN VIRTUAL TRADE
// =====================================================

async function executeTrade(
  forcedSide = null
) {

  if (!currentAccount) {

    setMessage(
      "trade-msg",
      "Activate an account first."
    );

    return;

  }

  const order =
    getOrderValues();

  const side =
    forcedSide ||
    order.side;

  if (
    !Number.isFinite(
      order.size
    ) ||
    order.size <= 0
  ) {

    setMessage(
      "trade-msg",
      "Enter a valid position size."
    );

    return;

  }

  setMessage(
    "trade-msg",
    "Getting live market price..."
  );

  const market =
    await updateOneMarketPrice(
      order.symbol
    );

  if (!market) {

    setMessage(
      "trade-msg",
      "Market data unavailable. Try again."
    );

    return;

  }

  const entry =
    Number(
      market.price
    );

  const stopError =
    validateStops(
      side,
      entry,
      order.sl,
      order.tp
    );

  if (stopError) {

    setMessage(
      "trade-msg",
      stopError
    );

    return;

  }

  const trade = {

    id:
      createId(),

    side,

    symbol:
      order.symbol,

    size:
      order.size,

    entry,

    sl:
      order.sl,

    tp:
      order.tp,

    current:
      entry,

    unrealizedPnl:
      0,

    openedAt:
      new Date()
        .toISOString(),

    status:
      "OPEN"

  };

  openTrades.unshift(
    trade
  );

  saveOpenTrades();

  renderOpenTrades();

  renderChartPnL();

  refreshAccountEquity();

  renderDashboard();

  setMessage(
    "trade-msg",

    `${side} ${order.symbol} opened at ${entry.toFixed(
      getDecimals(
        order.symbol
      )
    )}.`,

    true
  );

}


// =====================================================
// BUY / SELL
// =====================================================

$("buy")?.addEventListener(
  "click",
  () => {

    executeTrade(
      "BUY"
    );

  }
);


$("sell")?.addEventListener(
  "click",
  () => {

    executeTrade(
      "SELL"
    );

  }
);


// =====================================================
// STOP LOSS / TAKE PROFIT
// =====================================================

function checkStopLossTakeProfit() {

  if (!openTrades.length) {
    return;
  }

  const toClose = [];

  openTrades.forEach(
    trade => {

      const price =
        getCurrentPrice(
          trade.symbol
        );

      if (
        !Number.isFinite(price)
      ) {
        return;
      }

      trade.current =
        price;

      trade.unrealizedPnl =
        getTradePnL(
          trade
        );

      let reason =
        null;

      if (
        trade.side === "BUY"
      ) {

        if (
          trade.sl !== null &&
          price <= trade.sl
        ) {

          reason =
            "STOP LOSS";

        } else if (
          trade.tp !== null &&
          price >= trade.tp
        ) {

          reason =
            "TAKE PROFIT";

        }

      } else {

        if (
          trade.sl !== null &&
          price >= trade.sl
        ) {

          reason =
            "STOP LOSS";

        } else if (
          trade.tp !== null &&
          price <= trade.tp
        ) {

          reason =
            "TAKE PROFIT";

        }

      }

      if (reason) {

        toClose.push({
          id:
            trade.id,
          reason
        });

      }

    }
  );

  toClose.forEach(
    item => {

      closeTrade(
        item.id,
        item.reason
      );

    }
  );

}


// =====================================================
// CLOSE TRADE
// =====================================================

function closeTrade(
  tradeId,
  reason = "MANUAL CLOSE"
) {

  const index =
    openTrades.findIndex(
      trade =>
        trade.id ===
        tradeId
    );

  if (index === -1) {
    return;
  }

  const trade =
    openTrades[index];

  const current =
    getCurrentPrice(
      trade.symbol
    );

  const exit =
    Number.isFinite(current)
      ? current
      : Number(
          trade.current ||
          trade.entry
        );

  trade.current =
    exit;

  const pnl =
    getTradePnL(
      trade
    );

  const closedTrade = {

    id:
      trade.id,

    side:
      trade.side,

    symbol:
      trade.symbol,

    size:
      trade.size,

    entry:
      trade.entry,

    exit,

    sl:
      trade.sl,

    tp:
      trade.tp,

    pnl,

    closeReason:
      reason,

    openedAt:
      trade.openedAt,

    closedAt:
      new Date()
        .toISOString(),

    status:
      "CLOSED"

  };

  trades.unshift(
    closedTrade
  );

  currentAccount.pnl +=
    pnl;

  openTrades.splice(
    index,
    1
  );

  saveTrades();

  saveOpenTrades();

  refreshAccountEquity();

  renderOpenTrades();

  renderHistory();

  renderDashboard();

  renderChartPnL();

  setMessage(
    "trade-msg",
    `${trade.side} ${trade.symbol} closed at ${number(
      exit,
      getDecimals(
        trade.symbol
      )
    )} | ${reason} | ${pnl >= 0 ? "+" : ""}${money(pnl)}`,
    pnl >= 0
  );

}


// =====================================================
// CLOSE BUTTON EVENT
// =====================================================

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "[data-close-trade]"
      );

    if (!button) {
      return;
    }

    const tradeId =
      button.dataset.closeTrade;

    closeTrade(
      tradeId,
      "MANUAL CLOSE"
    );

  }
);


// =====================================================
// OPEN POSITIONS
// =====================================================

function renderOpenTrades() {

  const container =
    $("open-trades");

  if (!container) {

    /*
     * If your HTML uses another ID,
     * create:
     *
     * <div id="open-trades"></div>
     *
     */

    return;

  }

  if (!openTrades.length) {

    container.innerHTML = `

      <div class="history-empty">

        <span>
          0 OPEN
        </span>

        <p>
          No open trades.
        </p>

      </div>

    `;

    return;

  }

  container.innerHTML =
    openTrades
      .map(
        trade => {

          const price =
            getCurrentPrice(
              trade.symbol
            );

          const current =
            Number.isFinite(price)
              ? price
              : trade.current;

          const pnl =
            getTradePnL(
              trade
            );

          const decimals =
            getDecimals(
              trade.symbol
            );

          const pnlClass =
            pnl >= 0
              ? "var(--green)"
              : "var(--red)";

          return `

            <div
              class="open-trade-card"
              data-trade-id="${escapeHTML(
                trade.id
              )}"
            >

              <div class="open-trade-top">

                <div>

                  <h3>
                    ${escapeHTML(
                      trade.symbol
                    )}
                  </h3>

                  <span
                    class="${
                      trade.side === "BUY"
                        ? "trade-buy"
                        : "trade-sell"
                    }"
                  >
                    ${trade.side}
                  </span>

                </div>

                <strong
                  style="color:${pnlClass}"
                >
                  ${
                    pnl >= 0
                      ? "+"
                      : ""
                  }${money(pnl)}
                </strong>

              </div>


              <div class="open-trade-grid">

                <div>

                  <span>
                    Size
                  </span>

                  <b>
                    ${trade.size}
                  </b>

                </div>


                <div>

                  <span>
                    Entry
                  </span>

                  <b>
                    ${number(
                      trade.entry,
                      decimals
                    )}
                  </b>

                </div>


                <div>

                  <span>
                    Current
                  </span>

                  <b>
                    ${number(
                      current,
                      decimals
                    )}
                  </b>

                </div>


                <div>

                  <span>
                    Stop Loss
                  </span>

                  <b>
                    ${
                      trade.sl !== null &&
                      trade.sl !== undefined
                        ? number(
                            trade.sl,
                            decimals
                          )
                        : "-"
                    }
                  </b>

                </div>


                <div>

                  <span>
                    Take Profit
                  </span>

                  <b>
                    ${
                      trade.tp !== null &&
                      trade.tp !== undefined
                        ? number(
                            trade.tp,
                            decimals
                          )
                        : "-"
                    }
                  </b>

                </div>


                <div>

                  <span>
                    Status
                  </span>

                  <b class="green">
                    OPEN
                  </b>

                </div>

              </div>


              <div class="live-pnl">

                <span>
                  Live P&L
                </span>

                <strong
                  style="color:${pnlClass}"
                >
                  ${
                    pnl >= 0
                      ? "+"
                      : ""
                  }${money(pnl)}
                </strong>

              </div>


              <button
                class="close-trade"
                data-close-trade="${escapeHTML(
                  trade.id
                )}"
              >
                Close Trade
              </button>

            </div>

          `;

        }
      )
      .join("");

}


// =====================================================
// TRADE HISTORY
// =====================================================

function renderHistory() {

  const history =
    $("history");

  if (!history) {
    return;
  }

  if (!trades.length) {

    history.innerHTML = `

      <div class="history-empty">
        No trades yet.
      </div>

    `;

    return;

  }

  history.innerHTML = `

    <div class="trade-row">

      <b>
        Side
      </b>

      <b>
        Symbol
      </b>

      <b>
        Entry
      </b>

      <b>
        P&L
      </b>

    </div>


    ${trades
      .map(
        trade => {

          const pnl =
            Number(
              trade.pnl ||
              0
            );

          return `

            <div class="trade-row">

              <span>
                ${escapeHTML(
                  trade.side
                )}
              </span>

              <span>
                ${escapeHTML(
                  trade.symbol
                )}
              </span>

              <span>
                ${number(
                  trade.entry,
                  getDecimals(
                    trade.symbol
                  )
                )}
              </span>

              <span
                style="
                  color:
                  ${
                    pnl >= 0
                      ? "var(--green)"
                      : "var(--red)"
                  }
                "
              >

                ${
                  pnl >= 0
                    ? "+"
                    : ""
                }${money(pnl)}

              </span>

            </div>

          `;

        }
      )
      .join("")}

  `;

}


// =====================================================
// CHART P&L OVERLAY
// =====================================================

function renderChartPnL() {

  const chart =
    $("tradingview-widget");

  if (!chart) {
    return;
  }

  let overlay =
    $("chart-pnl-overlay");

  if (!overlay) {

    overlay =
      document.createElement(
        "div"
      );

    overlay.id =
      "chart-pnl-overlay";

    overlay.style.position =
      "absolute";

    overlay.style.top =
      "18px";

    overlay.style.left =
      "18px";

    overlay.style.zIndex =
      "20";

    overlay.style.padding =
      "10px 14px";

    overlay.style.border =
      "1px solid var(--border)";

    overlay.style.borderRadius =
      "10px";

    overlay.style.background =
      "rgba(9,11,16,.88)";

    overlay.style.backdropFilter =
      "blur(8px)";

    overlay.style.fontSize =
      "12px";

    overlay.style.pointerEvents =
      "none";

    const parent =
      chart.parentElement;

    if (parent) {

      parent.style.position =
        "relative";

      parent.appendChild(
        overlay
      );

    }

  }

  const symbol =
    $("symbol")
      ?.value ||
    "EUR/USD";

  const related =
    openTrades.filter(
      trade =>
        trade.symbol ===
        symbol
    );

  if (!related.length) {

    overlay.innerHTML = `
      <b>
        ${escapeHTML(symbol)}
      </b>
      <br>
      <span style="color:var(--muted)">
        No open position
      </span>
    `;

    return;

  }

  const pnl =
    related.reduce(
      (
        total,
        trade
      ) =>
        total +
        getTradePnL(
          trade
        ),
      0
    );

  const color =
    pnl >= 0
      ? "var(--green)"
      : "var(--red)";

  overlay.innerHTML = `

    <b>
      ${escapeHTML(symbol)}
    </b>

    <br>

    <span>
      Live P&L:
    </span>

    <strong
      style="color:${color}"
    >
      ${
        pnl >= 0
          ? "+"
          : ""
      }${money(pnl)}
    </strong>

  `;

}


// =====================================================
// RISK CHECK
// =====================================================

function checkAccountRules() {

  if (!currentAccount) {
    return;
  }

  const balance =
    Number(
      currentAccount.balance
    );

  if (
    balance <= 0
  ) {
    return;
  }

  const pnlPercent =
    (
      currentAccount.pnl /
      balance
    ) *
    100;

  const drawdownPercent =
    (
      currentAccount.drawdown /
      balance
    ) *
    100;

  if (
    drawdownPercent >=
    Number(
      currentAccount.rules
        .maxDrawdown
    )
  ) {

    currentAccount.status =
      "FAILED";

    saveAccount();

  }

  if (
    pnlPercent >=
    Number(
      currentAccount.rules
        .target
    )
  ) {

    currentAccount.status =
      "PASSED";

    saveAccount();

  }

}


// =====================================================
// START APP
// =====================================================

async function startApp() {

  loadAccount();

  loadTrades();

  loadOpenTrades();

  renderPlans();

  /*
   * Rebuild live values after refresh.
   */

  openTrades.forEach(
    trade => {

      trade.current =
        Number(
          trade.current ||
          trade.entry
        );

      trade.unrealizedPnl =
        0;

    }
  );

  if (currentAccount) {

    showPage(
      "dashboard"
    );

    renderDashboard();

  } else {

    showPage(
      "home"
    );

    updateHomePrice();

  }

}


// =====================================================
// CHECK SESSION
// =====================================================

async function checkSession() {

  try {

    const {
      data
    } =
      await supabase
        .auth
        .getSession();

    currentUser =
      data.session?.user ||
      null;

    renderPlans();

    if (currentUser) {

      await startApp();

    } else {

      showPage(
        "auth"
      );

    }

  } catch (error) {

    console.error(
      "Session error:",
      error
    );

    showPage(
      "auth"
    );

  }

}


// =====================================================
// AUTH STATE
// =====================================================

supabase
  .auth
  .onAuthStateChange(
    (
      event,
      session
    ) => {

      currentUser =
        session?.user ||
        null;

      if (
        event ===
        "SIGNED_OUT"
      ) {

        currentAccount =
          null;

        trades = [];

        openTrades = [];

        showPage(
          "auth"
        );

      }

    }
  );


// =====================================================
// INITIALIZE
// =====================================================

updateAuthUI();

populateSymbols();

renderPlans();

checkSession();


// =====================================================
// KEEP OPEN POSITIONS ALIVE
// =====================================================

setInterval(
  () => {

    if (
      currentUser &&
      currentAccount &&
      openTrades.length
    ) {

      checkStopLossTakeProfit();

      renderOpenTrades();

      renderChartPnL();

      refreshAccountEquity();

      checkAccountRules();

    }

  },
  1000
);


// =====================================================
// PAGE VISIBILITY
// =====================================================

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState ===
      "visible"
    ) {

      if (
        currentUser &&
        currentPage ===
        "terminal"
      ) {

        updateMarketPrice();

      }

    }

  }
);
