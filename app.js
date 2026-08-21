// =====================================================
// PROP DEMO V4 - COMPLETE APP.JS
// =====================================================
//
// Features:
// - Supabase Auth
// - Account activation
// - Coupon FRIENDS100
// - TradingView chart
// - Twelve Data live market price through Supabase Edge Function
// - Forex / Gold / Crypto symbols
// - Virtual BUY / SELL
// - Optional Stop Loss
// - Optional Take Profit
// - Automatic SL / TP close
// - Manual Close Trade
// - Live P&L
// - Open Positions
// - Trade History
// - Account Equity
// - Drawdown
// - Refresh page stays on current page
// - Virtual trading only
//
// =====================================================


// =====================================================
// SUPABASE
// =====================================================

import {
  createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


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

const FUNCTION_NAME =
  "clever-function";


// Live quote polling.
// Keep this around 10-15 seconds with a free API quota.
const MARKET_REFRESH_MS =
  10000;


// =====================================================
// ACCOUNT PLANS
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
// MARKET SYMBOLS
// =====================================================

const SYMBOLS = [

  // -----------------------------
  // FOREX
  // -----------------------------

  {
    symbol: "EUR/USD",
    tv: "FX:EURUSD",
    category: "Forex",
    name: "Euro / US Dollar"
  },

  {
    symbol: "GBP/USD",
    tv: "FX:GBPUSD",
    category: "Forex",
    name: "British Pound / US Dollar"
  },

  {
    symbol: "USD/JPY",
    tv: "FX:USDJPY",
    category: "Forex",
    name: "US Dollar / Japanese Yen"
  },

  {
    symbol: "USD/CHF",
    tv: "FX:USDCHF",
    category: "Forex",
    name: "US Dollar / Swiss Franc"
  },

  {
    symbol: "AUD/USD",
    tv: "FX:AUDUSD",
    category: "Forex",
    name: "Australian Dollar / US Dollar"
  },

  {
    symbol: "USD/CAD",
    tv: "FX:USDCAD",
    category: "Forex",
    name: "US Dollar / Canadian Dollar"
  },

  {
    symbol: "NZD/USD",
    tv: "FX:NZDUSD",
    category: "Forex",
    name: "New Zealand Dollar / US Dollar"
  },


  // -----------------------------
  // GOLD / METALS
  // -----------------------------

  {
    symbol: "XAU/USD",
    tv: "OANDA:XAUUSD",
    category: "Gold",
    name: "Gold / US Dollar"
  },

  {
    symbol: "XAG/USD",
    tv: "OANDA:XAGUSD",
    category: "Metals",
    name: "Silver / US Dollar"
  },


  // -----------------------------
  // CRYPTO
  // -----------------------------

  {
    symbol: "BTC/USD",
    tv: "COINBASE:BTCUSD",
    category: "Crypto",
    name: "Bitcoin / US Dollar"
  },

  {
    symbol: "ETH/USD",
    tv: "COINBASE:ETHUSD",
    category: "Crypto",
    name: "Ethereum / US Dollar"
  },

  {
    symbol: "SOL/USD",
    tv: "COINBASE:SOLUSD",
    category: "Crypto",
    name: "Solana / US Dollar"
  },

  {
    symbol: "XRP/USD",
    tv: "COINBASE:XRPUSD",
    category: "Crypto",
    name: "XRP / US Dollar"
  }

];


// =====================================================
// STATE
// =====================================================

let currentUser =
  null;

let currentAccount =
  null;

let selectedPlan =
  null;

let trades =
  [];

let marketTimer =
  null;

let currentMarket =
  null;

let lastTerminalSymbol =
  "EUR/USD";

let loginMode =
  false;


// =====================================================
// DOM HELPER
// =====================================================

function $(id) {

  return document.getElementById(id);

}


// =====================================================
// MONEY
// =====================================================

function money(value) {

  const number =
    Number(value || 0);

  return number.toLocaleString(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  );

}


// =====================================================
// NUMBER
// =====================================================

function safeNumber(
  value,
  fallback = 0
) {

  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {

    return fallback;

  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;

}


// =====================================================
// SYMBOL INFO
// =====================================================

function getSymbolInfo(
  symbol
) {

  return (
    SYMBOLS.find(
      item =>
        item.symbol === symbol
    )
    ||
    {
      symbol,
      tv: "",
      category: "Market",
      name: symbol
    }
  );

}


// =====================================================
// PRICE DECIMALS
// =====================================================

function priceDecimals(
  symbol
) {

  const s =
    String(symbol || "")
      .toUpperCase();


  if (
    s.includes("JPY")
  ) {

    return 3;

  }


  if (
    s.includes("XAU") ||
    s.includes("XAG")
  ) {

    return 2;

  }


  if (
    s.includes("BTC") ||
    s.includes("ETH") ||
    s.includes("SOL") ||
    s.includes("XRP")
  ) {

    return 2;

  }


  return 5;

}


// =====================================================
// FORMAT PRICE
// =====================================================

function formatPrice(
  value,
  symbol
) {

  const number =
    Number(value);


  if (
    !Number.isFinite(number)
  ) {

    return "-";

  }


  return number.toLocaleString(
    "en-US",
    {
      minimumFractionDigits:
        priceDecimals(symbol),

      maximumFractionDigits:
        priceDecimals(symbol)
    }
  );

}


// =====================================================
// MESSAGE
// =====================================================

function setMessage(
  id,
  message,
  success = false
) {

  const el =
    $(id);


  if (!el) {

    return;

  }


  el.textContent =
    message;


  el.style.color =
    success
      ? "var(--green)"
      : "var(--muted)";

}


// =====================================================
// PAGE STORAGE
// =====================================================

function pageStorageKey() {

  return currentUser
    ? `propdemo_page_${currentUser.id}`
    : "propdemo_page";

}


// =====================================================
// SHOW PAGE
// =====================================================

function showPage(
  pageId,
  save = true
) {

  document
    .querySelectorAll(".page")
    .forEach(
      page => {

        page.classList.remove(
          "active"
        );

      }
    );


  const page =
    $(pageId);


  if (!page) {

    return;

  }


  page.classList.add(
    "active"
  );


  if (save) {

    localStorage.setItem(
      pageStorageKey(),
      pageId
    );

  }


  if (
    pageId === "dashboard"
  ) {

    renderDashboard();

  }


  if (
    pageId === "terminal"
  ) {

    loadTerminal();

  }


  if (
    pageId === "home"
  ) {

    updateHomePrice();

  }

}


// =====================================================
// GET LAST PAGE
// =====================================================

function getLastPage() {

  const page =
    localStorage.getItem(
      pageStorageKey()
    );


  const valid =
    [
      "home",
      "accounts",
      "dashboard",
      "terminal"
    ];


  if (
    valid.includes(page)
  ) {

    return page;

  }


  return "home";

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

      showPage(
        "auth"
      );


      setMessage(
        "auth-msg",
        "Please login first."
      );


      return;

    }


    showPage(
      page
    );

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


// =====================================================
// AUTH TOGGLE
// =====================================================

$("auth-toggle")
  ?.addEventListener(
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
// SIGNUP / LOGIN
// =====================================================

$("auth-submit")
  ?.addEventListener(
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
              .signInWithPassword(
                {
                  email,
                  password
                }
              );


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
              .signUp(
                {
                  email,
                  password,

                  options: {
                    data: {
                      full_name:
                        name
                    }
                  }
                }
              );


          if (error) {

            throw error;

          }


          if (
            !data.session
          ) {

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

$("logout")
  ?.addEventListener(
    "click",
    async () => {

      if (marketTimer) {

        clearInterval(
          marketTimer
        );

        marketTimer =
          null;

      }


      await supabase
        .auth
        .signOut();


      currentUser =
        null;


      currentAccount =
        null;


      selectedPlan =
        null;


      trades =
        [];


      currentMarket =
        null;


      showPage(
        "auth"
      );


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
              ${plan.name}
            </p>

            <h3>
              ${plan.size}
            </h3>

            <div class="size">
              ${money(plan.balance)}
            </div>

            <div class="price">
              ${plan.price}
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


// =====================================================
// SELECT PLAN
// =====================================================

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


    if ($("selected-plan")) {

      $("selected-plan")
        .textContent =
        `${selectedPlan.name} — ${selectedPlan.size} — ${money(selectedPlan.balance)} virtual balance`;

    }


    $("coupon")
      ?.focus();

  }
);


// =====================================================
// ACTIVATE ACCOUNT
// =====================================================

$("activate")
  ?.addEventListener(
    "click",
    async () => {

      if (!currentUser) {

        showPage(
          "auth"
        );


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


      saveAccount();


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
        300
      );

    }
  );


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


// =====================================================
// ACCOUNT STORAGE
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

    currentAccount =
      null;

    return;

  }


  try {

    currentAccount =
      JSON.parse(
        raw
      );

  } catch {

    currentAccount =
      null;

  }

}


// =====================================================
// TRADE STORAGE
// =====================================================

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

    trades =
      [];

    return;

  }


  try {

    trades =
      JSON.parse(
        raw
      );


    if (!Array.isArray(trades)) {

      trades =
        [];

    }

  } catch {

    trades =
      [];

  }

}


// =====================================================
// DASHBOARD
// =====================================================

function renderDashboard() {

  const title =
    $("account-title");


  const status =
    $("account-status");


  if (!currentAccount) {

    if (title) {

      title.textContent =
        "No account";

    }


    if (status) {

      status.textContent =
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


  title.textContent =
    `${currentAccount.planName} Account`;


  status.textContent =
    currentAccount.status;


  $("balance").textContent =
    money(
      currentAccount.balance
    );


  $("equity").textContent =
    money(
      currentAccount.equity
    );


  $("pnl").textContent =
    money(
      currentAccount.pnl
    );


  $("dd").textContent =
    money(
      currentAccount.drawdown
    );


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


  $("status-detail").innerHTML = `

    <strong class="green">
      ACTIVE
    </strong>

    <br>

    Account:
    ${currentAccount.planName}

    <br>

    Virtual Balance:
    ${money(currentAccount.balance)}

  `;

}


// =====================================================
// TRADINGVIEW CHART
// =====================================================

function loadTradingViewChart(
  symbol = lastTerminalSymbol
) {

  const container =
    $("tradingview-widget");


  if (!container) {

    return;

  }


  const info =
    getSymbolInfo(
      symbol
    );


  container.innerHTML =
    "";


  container.style.position =
    "relative";


  container.style.width =
    "100%";


  container.style.height =
    "100%";


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


  script.async =
    true;


  script.innerHTML =
    JSON.stringify({

      autosize:
        true,

      symbol:
        info.tv,

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


  // Small virtual trading overlay.
  const overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "chart-trade-overlay";


  overlay.style.position =
    "absolute";


  overlay.style.top =
    "12px";


  overlay.style.left =
    "12px";


  overlay.style.zIndex =
    "10";


  overlay.style.pointerEvents =
    "none";


  overlay.style.background =
    "rgba(9,11,16,.88)";


  overlay.style.border =
    "1px solid #242b36";


  overlay.style.borderRadius =
    "10px";


  overlay.style.padding =
    "8px 10px";


  overlay.style.fontSize =
    "11px";


  overlay.style.color =
    "#eef2f7";


  overlay.innerHTML =
    `
      <div style="font-weight:800">
        ${symbol}
      </div>

      <div id="chart-overlay-price"
           style="color:#63d29a;margin-top:3px">
        Live: --
      </div>

      <div id="chart-overlay-pnl"
           style="margin-top:3px">
        P&L: --
      </div>
    `;


  container.appendChild(
    overlay
  );


  updateChartOverlay();

}


// =====================================================
// CHART OVERLAY
// =====================================================

function updateChartOverlay() {

  const priceEl =
    $("chart-overlay-price");

  const pnlEl =
    $("chart-overlay-pnl");


  if (!priceEl && !pnlEl) {

    return;

  }


  if (
    currentMarket &&
    currentMarket.price
  ) {

    if (priceEl) {

      priceEl.textContent =
        `Live: ${formatPrice(
          currentMarket.price,
          lastTerminalSymbol
        )}`;

    }

  }


  const open =
    trades.filter(
      trade =>
        trade.status ===
        "OPEN"
    );


  const relevant =
    open.filter(
      trade =>
        trade.symbol ===
        lastTerminalSymbol
    );


  const pnl =
    relevant.reduce(
      (
        sum,
        trade
      ) =>
        sum +
        safeNumber(
          trade.livePnl
        ),
      0
    );


  if (pnlEl) {

    pnlEl.textContent =
      `P&L: ${money(pnl)}`;


    pnlEl.style.color =
      pnl >= 0
        ? "var(--green)"
        : "var(--red)";

  }

}


// =====================================================
// GET MARKET PRICE
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
          "{}"

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


  const price =
    Number(
      data.price
    );


  if (
    !Number.isFinite(price)
  ) {

    throw new Error(
      "Invalid market price"
    );

  }


  return data;

}


// =====================================================
// CURRENT SYMBOL
// =====================================================

function getSelectedSymbol() {

  return (
    $("symbol")
      ?.value
    ||
    lastTerminalSymbol
    ||
    "EUR/USD"
  );

}


// =====================================================
// POPULATE SYMBOL SELECT
// =====================================================

function populateSymbols() {

  const select =
    $("symbol");


  if (!select) {

    return;

  }


  const current =
    select.value ||
    lastTerminalSymbol ||
    "EUR/USD";


  select.innerHTML = "";


  const groups = {};


  SYMBOLS.forEach(
    item => {

      if (!groups[item.category]) {

        groups[item.category] =
          [];

      }


      groups[item.category]
        .push(item);

    }
  );


  Object.entries(
    groups
  ).forEach(
    (
      [
        category,
        list
      ]
    ) => {

      const group =
        document.createElement(
          "optgroup"
        );


      group.label =
        category;


      list.forEach(
        item => {

          const option =
            document.createElement(
              "option"
            );


          option.value =
            item.symbol;


          option.textContent =
            `${item.symbol} — ${item.name}`;


          group.appendChild(
            option
          );

        }
      );


      select.appendChild(
        group
      );

    }
  );


  const exists =
    SYMBOLS.some(
      item =>
        item.symbol ===
        current
    );


  select.value =
    exists
      ? current
      : "EUR/USD";


  lastTerminalSymbol =
    select.value;

}


// =====================================================
// MARKET HEADER
// =====================================================

function renderMarketHeader(
  data
) {

  if (!data) {

    return;

  }


  const symbol =
    data.symbol ||
    lastTerminalSymbol;


  const price =
    Number(
      data.price
    );


  const change =
    safeNumber(
      data.percentChange
    );


  if ($("market-symbol")) {

    $("market-symbol")
      .textContent =
      symbol;

  }


  if ($("market-price")) {

    $("market-price")
      .textContent =
      formatPrice(
        price,
        symbol
      );

  }


  if ($("market-change")) {

    $("market-change")
      .textContent =
      `${change >= 0 ? "+" : ""}${change.toFixed(3)}%`;


    $("market-change").style.color =
      change >= 0
        ? "var(--green)"
        : "var(--red)";

  }


  if ($("market-status")) {

    $("market-status")
      .textContent =
      "● LIVE MARKET";


    $("market-status").style.color =
      "var(--green)";

  }


  if ($("home-price")) {

    $("home-price")
      .textContent =
      formatPrice(
        price,
        symbol
      );

  }


  updateChartOverlay();

}


// =====================================================
// MARKET UPDATE
// =====================================================

async function updateMarketPrice() {

  const symbol =
    getSelectedSymbol();


  try {

    const data =
      await getMarketPrice(
        symbol
      );


    currentMarket =
      data;


    renderMarketHeader(
      data
    );


    updateOpenTradePrices(
      symbol,
      Number(data.price)
    );


    checkStopLossTakeProfit();


    calculateAccount();


    saveTrades();

    saveAccount();


    renderOpenTrades();

    renderHistory();

    renderDashboard();


    return data;

  } catch (error) {

    console.error(
      "Market update error:",
      error
    );


    if ($("market-status")) {

      $("market-status")
        .textContent =
        "● MARKET ERROR";


      $("market-status").style.color =
        "var(--red)";

    }

  }

}


// =====================================================
// HOME PRICE
// =====================================================

async function updateHomePrice() {

  try {

    const data =
      await getMarketPrice(
        "EUR/USD"
      );


    if ($("home-price")) {

      $("home-price")
        .textContent =
        formatPrice(
          data.price,
          "EUR/USD"
        );

    }

  } catch (error) {

    console.error(
      error
    );

  }

}


// =====================================================
// POSITION P&L ENGINE
// =====================================================

function calculateTradePnl(
  trade,
  currentPrice
) {

  const entry =
    Number(
      trade.entry
    );


  const price =
    Number(
      currentPrice
    );


  const size =
    Number(
      trade.size
    );


  if (
    !Number.isFinite(entry) ||
    !Number.isFinite(price) ||
    !Number.isFinite(size)
  ) {

    return 0;

  }


  const side =
    trade.side;


  const symbol =
    trade.symbol;


  let difference =
    side === "BUY"
      ? price - entry
      : entry - price;


  // ---------------------------------------------
  // Gold / Silver
  // ---------------------------------------------

  if (
    symbol === "XAU/USD"
  ) {

    // Standard demo assumption:
    // 1 lot = 100 oz

    return (
      difference *
      size *
      100
    );

  }


  if (
    symbol === "XAG/USD"
  ) {

    // Standard demo assumption:
    // 1 lot = 5000 oz

    return (
      difference *
      size *
      5000
    );

  }


  // ---------------------------------------------
  // Crypto
  // ---------------------------------------------

  if (
    symbol.includes("BTC/") ||
    symbol.includes("ETH/") ||
    symbol.includes("SOL/") ||
    symbol.includes("XRP/")
  ) {

    return (
      difference *
      size
    );

  }


  // ---------------------------------------------
  // USD/JPY
  // ---------------------------------------------

  if (
    symbol === "USD/JPY"
  ) {

    return (
      difference *
      size *
      100000 /
      price
    );

  }


  // ---------------------------------------------
  // Other USD quoted FX
  // ---------------------------------------------

  if (
    symbol.endsWith("/USD")
  ) {

    return (
      difference *
      size *
      100000
    );

  }


  // ---------------------------------------------
  // Fallback
  // ---------------------------------------------

  return (
    difference *
    size *
    100000
  );

}


// =====================================================
// UPDATE OPEN TRADE PRICES
// =====================================================

function updateOpenTradePrices(
  symbol,
  price
) {

  trades.forEach(
    trade => {

      if (
        trade.status !==
        "OPEN"
      ) {

        return;

      }


      if (
        trade.symbol !==
        symbol
      ) {

        return;

      }


      trade.currentPrice =
        price;


      trade.livePnl =
        calculateTradePnl(
          trade,
          price
        );

    }
  );

}


// =====================================================
// CHECK SL / TP
// =====================================================

function checkStopLossTakeProfit() {

  let changed =
    false;


  trades.forEach(
    trade => {

      if (
        trade.status !==
        "OPEN"
      ) {

        return;

      }


      const price =
        Number(
          trade.currentPrice
        );


      if (
        !Number.isFinite(price)
      ) {

        return;

      }


      const sl =
        trade.stopLoss;


      const tp =
        trade.takeProfit;


      let reason =
        null;


      // -------------------------------------------
      // BUY
      // -------------------------------------------

      if (
        trade.side ===
        "BUY"
      ) {

        if (
          sl !== null &&
          sl !== undefined &&
          Number.isFinite(
            Number(sl)
          ) &&
          price <=
            Number(sl)
        ) {

          reason =
            "Stop Loss";

        }


        if (
          !reason &&
          tp !== null &&
          tp !== undefined &&
          Number.isFinite(
            Number(tp)
          ) &&
          price >=
            Number(tp)
        ) {

          reason =
            "Take Profit";

        }

      }


      // -------------------------------------------
      // SELL
      // -------------------------------------------

      if (
        trade.side ===
        "SELL"
      ) {

        if (
          sl !== null &&
          sl !== undefined &&
          Number.isFinite(
            Number(sl)
          ) &&
          price >=
            Number(sl)
        ) {

          reason =
            "Stop Loss";

        }


        if (
          !reason &&
          tp !== null &&
          tp !== undefined &&
          Number.isFinite(
            Number(tp)
          ) &&
          price <=
            Number(tp)
        ) {

          reason =
            "Take Profit";

        }

      }


      if (reason) {

        closeTradeInternal(
          trade.id,
          price,
          reason
        );


        changed =
          true;

      }

    }
  );


  if (changed) {

    saveTrades();

    calculateAccount();

    saveAccount();

    renderOpenTrades();

    renderHistory();

    renderDashboard();

  }

}


// =====================================================
// ACCOUNT CALCULATION
// =====================================================

function calculateAccount() {

  if (!currentAccount) {

    return;

  }


  const closedPnl =
    trades
      .filter(
        trade =>
          trade.status ===
          "CLOSED"
      )
      .reduce(
        (
          total,
          trade
        ) =>
          total +
          safeNumber(
            trade.realizedPnl
          ),
        0
      );


  const openPnl =
    trades
      .filter(
        trade =>
          trade.status ===
          "OPEN"
      )
      .reduce(
        (
          total,
          trade
        ) =>
          total +
          safeNumber(
            trade.livePnl
          ),
        0
      );


  currentAccount.pnl =
    closedPnl +
    openPnl;


  currentAccount.equity =
    currentAccount.balance +
    currentAccount.pnl;


  currentAccount.drawdown =
    Math.max(
      0,
      currentAccount.balance -
      currentAccount.equity
    );


  // -------------------------------------------
  // Risk rules
  // -------------------------------------------

  const maxDrawdownAmount =
    currentAccount.balance *
    (
      safeNumber(
        currentAccount.rules?.maxDrawdown,
        10
      ) /
      100
    );


  const dailyLossAmount =
    currentAccount.balance *
    (
      safeNumber(
        currentAccount.rules?.dailyLoss,
        5
      ) /
      100
    );


  if (
    currentAccount.drawdown >=
    maxDrawdownAmount
  ) {

    currentAccount.status =
      "FAILED";

  }


  if (
    currentAccount.pnl <=
    -dailyLossAmount
  ) {

    currentAccount.status =
      "FAILED";

  }


  const targetAmount =
    currentAccount.balance *
    (
      safeNumber(
        currentAccount.rules?.target,
        8
      ) /
      100
    );


  if (
    currentAccount.pnl >=
    targetAmount
  ) {

    currentAccount.status =
      "PASSED";

  }

}


// =====================================================
// EXECUTE TRADE
// =====================================================

async function executeTrade(
  side
) {

  if (!currentAccount) {

    setMessage(
      "trade-msg",
      "Activate an account first."
    );


    return;

  }


  if (
    currentAccount.status !==
    "ACTIVE"
  ) {

    setMessage(
      "trade-msg",
      `Account is ${currentAccount.status}. Trading is disabled.`
    );


    return;

  }


  const size =
    safeNumber(
      $("size")
        ?.value,
      0
    );


  const symbol =
    getSelectedSymbol();


  const slRaw =
    $("stop-loss")
      ?.value
      ?.trim()
    || "";


  const tpRaw =
    $("take-profit")
      ?.value
      ?.trim()
    || "";


  const stopLoss =
    slRaw === ""
      ? null
      : Number(slRaw);


  const takeProfit =
    tpRaw === ""
      ? null
      : Number(tpRaw);


  if (
    !size ||
    size <= 0
  ) {

    setMessage(
      "trade-msg",
      "Enter a valid position size."
    );


    return;

  }


  // -------------------------------------------
  // SL / TP number validation
  // -------------------------------------------

  if (
    stopLoss !== null &&
    !Number.isFinite(
      stopLoss
    )
  ) {

    setMessage(
      "trade-msg",
      "Enter a valid Stop Loss price."
    );


    return;

  }


  if (
    takeProfit !== null &&
    !Number.isFinite(
      takeProfit
    )
  ) {

    setMessage(
      "trade-msg",
      "Enter a valid Take Profit price."
    );


    return;

  }


  setMessage(
    "trade-msg",
    "Getting live market price..."
  );


  let market;


  try {

    market =
      await getMarketPrice(
        symbol
      );

  } catch (error) {

    console.error(
      error
    );


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


  if (
    !Number.isFinite(entry)
  ) {

    setMessage(
      "trade-msg",
      "Invalid market price."
    );


    return;

  }


  // -------------------------------------------
  // BUY validation
  // -------------------------------------------

  if (
    side ===
    "BUY"
  ) {

    if (
      stopLoss !== null &&
      stopLoss >= entry
    ) {

      setMessage(
        "trade-msg",
        `BUY Stop Loss must be below entry ${formatPrice(
          entry,
          symbol
        )}.`
      );


      return;

    }


    if (
      takeProfit !== null &&
      takeProfit <= entry
    ) {

      setMessage(
        "trade-msg",
        `BUY Take Profit must be above entry ${formatPrice(
          entry,
          symbol
        )}.`
      );


      return;

    }

  }


  // -------------------------------------------
  // SELL validation
  // -------------------------------------------

  if (
    side ===
    "SELL"
  ) {

    if (
      stopLoss !== null &&
      stopLoss <= entry
    ) {

      setMessage(
        "trade-msg",
        `SELL Stop Loss must be above entry ${formatPrice(
          entry,
          symbol
        )}.`
      );


      return;

    }


    if (
      takeProfit !== null &&
      takeProfit >= entry
    ) {

      setMessage(
        "trade-msg",
        `SELL Take Profit must be below entry ${formatPrice(
          entry,
          symbol
        )}.`
      );


      return;

    }

  }


  // -------------------------------------------
  // CREATE TRADE
  // -------------------------------------------

  const trade = {

    id:
      crypto.randomUUID
        ? crypto.randomUUID()
        : String(
            Date.now()
          ),

    side:
      side,

    symbol:
      symbol,

    size:
      size,

    entry:
      entry,

    currentPrice:
      entry,

    stopLoss:
      stopLoss,

    takeProfit:
      takeProfit,

    livePnl:
      0,

    realizedPnl:
      0,

    status:
      "OPEN",

    openedAt:
      new Date()
        .toISOString(),

    closedAt:
      null,

    closeReason:
      null

  };


  trades.unshift(
    trade
  );


  saveTrades();


  calculateAccount();


  saveAccount();


  renderOpenTrades();

  renderHistory();

  renderDashboard();

  updateChartOverlay();


  setMessage(
    "trade-msg",
    `${side} ${symbol} opened virtually at ${formatPrice(
      entry,
      symbol
    )}.`,
    true
  );


  // Immediately update price/P&L.
  currentMarket =
    market;


  updateOpenTradePrices(
    symbol,
    entry
  );


  updateChartOverlay();

}


// =====================================================
// BUY
// =====================================================

$("buy")
  ?.addEventListener(
    "click",
    () => {

      executeTrade(
        "BUY"
      );

    }
  );


// =====================================================
// SELL
// =====================================================

$("sell")
  ?.addEventListener(
    "click",
    () => {

      executeTrade(
        "SELL"
      );

    }
  );


// =====================================================
// CLOSE TRADE INTERNAL
// =====================================================

function closeTradeInternal(
  tradeId,
  price,
  reason = "Manual"
) {

  const trade =
    trades.find(
      item =>
        item.id ===
        tradeId
    );


  if (!trade) {

    return false;

  }


  if (
    trade.status !==
    "OPEN"
  ) {

    return false;

  }


  const exitPrice =
    Number(price);


  trade.currentPrice =
    exitPrice;


  trade.livePnl =
    calculateTradePnl(
      trade,
      exitPrice
    );


  trade.realizedPnl =
    trade.livePnl;


  trade.status =
    "CLOSED";


  trade.closedAt =
    new Date()
      .toISOString();


  trade.closeReason =
    reason;


  return true;

}


// =====================================================
// MANUAL CLOSE
// =====================================================

async function manualCloseTrade(
  tradeId
) {

  const trade =
    trades.find(
      item =>
        item.id ===
        tradeId
    );


  if (!trade) {

    return;

  }


  if (
    trade.status !==
    "OPEN"
  ) {

    return;

  }


  setMessage(
    "trade-msg",
    "Getting current exit price..."
  );


  try {

    const market =
      await getMarketPrice(
        trade.symbol
      );


    const price =
      Number(
        market.price
      );


    const closed =
      closeTradeInternal(
        trade.id,
        price,
        "Manual Close"
      );


    if (!closed) {

      return;

    }


    saveTrades();


    calculateAccount();


    saveAccount();


    renderOpenTrades();

    renderHistory();

    renderDashboard();

    updateChartOverlay();


    setMessage(
      "trade-msg",
      `${trade.symbol} ${trade.side} closed at ${formatPrice(
        price,
        trade.symbol
      )}. P&L ${money(
        trade.realizedPnl
      )}.`,
      true
    );

  } catch (error) {

    console.error(
      error
    );


    setMessage(
      "trade-msg",
      "Unable to get current market price."
    );

  }

}


// =====================================================
// CLOSE BUTTON
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


    manualCloseTrade(
      tradeId
    );

  }
);


// =====================================================
// OPEN TRADES CONTAINER
// =====================================================

function ensureOpenTradesContainer() {

  let container =
    $("open-trades");


  if (container) {

    return container;

  }


  const terminal =
    $("terminal");


  if (!terminal) {

    return null;

  }


  const history =
    $("history")
      ?.closest(
        ".panel"
      );


  container =
    document.createElement(
      "div"
    );


  container.id =
    "open-trades";


  container.className =
    "panel";


  container.innerHTML = `

    <div class="section-head compact">

      <div>

        <p class="eyebrow">
          POSITIONS
        </p>

        <h3>
          Open Trades
        </h3>

      </div>

    </div>

    <div id="open-trades-list"></div>

  `;


  if (history) {

    terminal.insertBefore(
      container,
      history
    );

  } else {

    terminal.appendChild(
      container
    );

  }


  return container;

}


// =====================================================
// RENDER OPEN TRADES
// =====================================================

function renderOpenTrades() {

  const container =
    ensureOpenTradesContainer();


  if (!container) {

    return;

  }


  let list =
    $("open-trades-list");


  if (!list) {

    return;

  }


  const open =
    trades.filter(
      trade =>
        trade.status ===
        "OPEN"
    );


  if (!open.length) {

    list.innerHTML = `

      <div class="history-empty">
        No open trades.
      </div>

    `;


    return;

  }


  list.innerHTML =
    open
      .map(
        trade => {

          const pnl =
            safeNumber(
              trade.livePnl
            );


          const pnlColor =
            pnl >= 0
              ? "var(--green)"
              : "var(--red)";


          return `

            <div
              class="open-trade-card"
              style="
                border:1px solid var(--border);
                border-radius:14px;
                padding:18px;
                margin-top:12px;
                background:#0d1118;
              "
            >

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  align-items:center;
                  gap:10px;
                "
              >

                <strong
                  style="font-size:22px"
                >
                  ${trade.symbol}
                </strong>


                <span
                  style="
                    padding:7px 10px;
                    border-radius:999px;
                    font-size:11px;
                    font-weight:800;
                    color:${
                      trade.side === "BUY"
                        ? "var(--green)"
                        : "var(--red)"
                    };
                    background:${
                      trade.side === "BUY"
                        ? "rgba(99,210,154,.12)"
                        : "rgba(255,107,122,.12)"
                    };
                  "
                >
                  ${trade.side}
                </span>

              </div>


              <div
                style="
                  display:grid;
                  grid-template-columns:1fr 1fr;
                  gap:14px;
                  margin-top:18px;
                "
              >

                <div>

                  <small class="muted">
                    Size
                  </small>

                  <strong
                    style="display:block;margin-top:4px"
                  >
                    ${trade.size}
                  </strong>

                </div>


                <div>

                  <small class="muted">
                    Entry
                  </small>

                  <strong
                    style="display:block;margin-top:4px"
                  >
                    ${formatPrice(
                      trade.entry,
                      trade.symbol
                    )}
                  </strong>

                </div>


                <div>

                  <small class="muted">
                    Current
                  </small>

                  <strong
                    style="display:block;margin-top:4px"
                  >
                    ${formatPrice(
                      trade.currentPrice,
                      trade.symbol
                    )}
                  </strong>

                </div>


                <div>

                  <small class="muted">
                    Stop Loss
                  </small>

                  <strong
                    style="display:block;margin-top:4px"
                  >
                    ${
                      trade.stopLoss === null ||
                      trade.stopLoss === undefined
                        ? "-"
                        : formatPrice(
                            trade.stopLoss,
                            trade.symbol
                          )
                    }
                  </strong>

                </div>


                <div>

                  <small class="muted">
                    Take Profit
                  </small>

                  <strong
                    style="display:block;margin-top:4px"
                  >
                    ${
                      trade.takeProfit === null ||
                      trade.takeProfit === undefined
                        ? "-"
                        : formatPrice(
                            trade.takeProfit,
                            trade.symbol
                          )
                    }
                  </strong>

                </div>

              </div>


              <div
                style="
                  margin-top:18px;
                  font-size:16px;
                "
              >

                <span class="muted">
                  Live P&L
                </span>


                <strong
                  style="
                    display:block;
                    margin-top:5px;
                    font-size:26px;
                    color:${pnlColor};
                  "
                >
                  ${pnl >= 0 ? "+" : ""}${money(pnl)}
                </strong>

              </div>


              <button
                class="secondary"
                data-close-trade="${trade.id}"
                style="
                  width:100%;
                  margin-top:16px;
                  color:var(--red);
                  border:1px solid rgba(255,107,122,.35);
                  background:rgba(255,107,122,.08);
                "
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


  const closed =
    trades.filter(
      trade =>
        trade.status ===
        "CLOSED"
    );


  if (!closed.length) {

    history.innerHTML = `

      <div class="history-empty">
        No closed trades yet.
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


    ${closed
      .map(
        trade => {

          const pnl =
            safeNumber(
              trade.realizedPnl
            );


          return `

            <div class="trade-row">

              <span>
                ${trade.side}
              </span>

              <span>
                ${trade.symbol}
              </span>

              <span>
                ${formatPrice(
                  trade.entry,
                  trade.symbol
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
// TERMINAL LOAD
// =====================================================

function loadTerminal() {

  populateSymbols();


  const select =
    $("symbol");


  if (select) {

    if (
      lastTerminalSymbol
    ) {

      const exists =
        Array.from(
          select.options
        ).some(
          option =>
            option.value ===
            lastTerminalSymbol
        );


      if (exists) {

        select.value =
          lastTerminalSymbol;

      }

    }

  }


  lastTerminalSymbol =
    getSelectedSymbol();


  loadTradingViewChart(
    lastTerminalSymbol
  );


  renderOpenTrades();

  renderHistory();


  updateMarketPrice();


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
// SYMBOL CHANGE
// =====================================================

$("symbol")
  ?.addEventListener(
    "change",
    () => {

      lastTerminalSymbol =
        $("symbol")
          .value;


      localStorage.setItem(
        "propdemo_last_symbol",
        lastTerminalSymbol
      );


      loadTradingViewChart(
        lastTerminalSymbol
      );


      updateMarketPrice();

    }
  );


// =====================================================
// SIDE SELECT
// =====================================================

$("side")
  ?.addEventListener(
    "change",
    () => {

      // No action needed.
      // BUY / SELL buttons remain direct.

    }
  );


// =====================================================
// ADD SL / TP INPUTS IF MISSING
// =====================================================

function ensureOrderInputs() {

  const orderPanel =
    document.querySelector(
      ".order-panel"
    );


  if (!orderPanel) {

    return;

  }


  // ---------------------------------------------
  // Stop Loss
  // ---------------------------------------------

  if (
    !$("stop-loss")
  ) {

    const labels =
      Array.from(
        orderPanel.querySelectorAll(
          "label"
        )
      );


    const sizeInput =
      $("size");


    if (sizeInput) {

      const wrapper =
        document.createElement(
          "div"
        );


      wrapper.innerHTML = `

        <label>
          Stop Loss
        </label>

        <input
          id="stop-loss"
          type="number"
          step="any"
          inputmode="decimal"
          placeholder="Optional"
        >

      `;


      sizeInput
        .parentNode
        .insertBefore(
          wrapper,
          sizeInput.nextSibling
        );

    }

  }


  // ---------------------------------------------
  // Take Profit
  // ---------------------------------------------

  if (
    !$("take-profit")
  ) {

    const sl =
      $("stop-loss");


    if (sl) {

      const wrapper =
        document.createElement(
          "div"
        );


      wrapper.innerHTML = `

        <label>
          Take Profit
        </label>

        <input
          id="take-profit"
          type="number"
          step="any"
          inputmode="decimal"
          placeholder="Optional"
        >

      `;


      sl
        .parentNode
        .insertAdjacentElement(
          "afterend",
          wrapper
        );

    }

  }

}


// =====================================================
// START APP
// =====================================================

async function startApp() {

  loadAccount();

  loadTrades();

  renderPlans();

  populateSymbols();

  ensureOrderInputs();


  if (currentAccount) {

    calculateAccount();

    saveAccount();


    const lastPage =
      getLastPage();


    // If terminal was open before refresh,
    // open terminal again instead of home.

    showPage(
      lastPage
    );


  } else {

    showPage(
      "home"
    );


    updateHomePrice();

  }

}


// =====================================================
// SESSION CHECK
// =====================================================

async function checkSession() {

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

}


// =====================================================
// AUTH STATE
// =====================================================

supabase
  .auth
  .onAuthStateChange(
    async (
      event,
      session
    ) => {

      currentUser =
        session?.user ||
        null;


      if (
        event ===
        "SIGNED_IN"
      ) {

        await startApp();

      }


      if (
        event ===
        "SIGNED_OUT"
      ) {

        currentUser =
          null;


        currentAccount =
          null;


        trades =
          [];


        if (marketTimer) {

          clearInterval(
            marketTimer
          );


          marketTimer =
            null;

        }


        showPage(
          "auth"
        );

      }

    }
  );


// =====================================================
// RESTORE LAST SYMBOL
// =====================================================

const storedSymbol =
  localStorage.getItem(
    "propdemo_last_symbol"
  );


if (
  SYMBOLS.some(
    item =>
      item.symbol ===
      storedSymbol
  )
) {

  lastTerminalSymbol =
    storedSymbol;

}


// =====================================================
// INITIALIZE
// =====================================================

updateAuthUI();

renderPlans();

ensureOrderInputs();

checkSession();
