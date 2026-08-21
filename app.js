// =====================================================
// PROP DEMO V4
// =====================================================

import {
  createClient
} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


// =====================================================
// SUPABASE
// =====================================================

const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth:{
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:true
      }
    }
  );


// =====================================================
// CONFIG
// =====================================================

const FUNCTION_NAME =
  "clever-function";


const PLANS = [

  {
    id:"starter",
    name:"Starter",
    size:"$10K",
    balance:10000,
    price:"$0 Demo",
    target:8,
    dailyLoss:5,
    drawdown:10
  },

  {
    id:"pro",
    name:"Pro",
    size:"$25K",
    balance:25000,
    price:"$0 Demo",
    target:8,
    dailyLoss:5,
    drawdown:10
  },

  {
    id:"advanced",
    name:"Advanced",
    size:"$50K",
    balance:50000,
    price:"$0 Demo",
    target:10,
    dailyLoss:5,
    drawdown:10
  },

  {
    id:"elite",
    name:"Elite",
    size:"$100K",
    balance:100000,
    price:"$0 Demo",
    target:10,
    dailyLoss:5,
    drawdown:10
  }

];


// =====================================================
// SYMBOLS
// =====================================================

const SYMBOLS = [

  // FOREX

  {
    symbol:"EUR/USD",
    category:"forex",
    tv:"FX:EURUSD"
  },

  {
    symbol:"GBP/USD",
    category:"forex",
    tv:"FX:GBPUSD"
  },

  {
    symbol:"USD/JPY",
    category:"forex",
    tv:"FX:USDJPY"
  },

  {
    symbol:"AUD/USD",
    category:"forex",
    tv:"FX:AUDUSD"
  },

  {
    symbol:"USD/CAD",
    category:"forex",
    tv:"FX:USDCAD"
  },

  {
    symbol:"USD/CHF",
    category:"forex",
    tv:"FX:USDCHF"
  },

  {
    symbol:"NZD/USD",
    category:"forex",
    tv:"FX:NZDUSD"
  },

  {
    symbol:"EUR/GBP",
    category:"forex",
    tv:"FX:EURGBP"
  },

  {
    symbol:"EUR/JPY",
    category:"forex",
    tv:"FX:EURJPY"
  },

  {
    symbol:"GBP/JPY",
    category:"forex",
    tv:"FX:GBPJPY"
  },

  // CRYPTO

  {
    symbol:"BTC/USD",
    category:"crypto",
    tv:"COINBASE:BTCUSD"
  },

  {
    symbol:"ETH/USD",
    category:"crypto",
    tv:"COINBASE:ETHUSD"
  },

  {
    symbol:"SOL/USD",
    category:"crypto",
    tv:"COINBASE:SOLUSD"
  },

  {
    symbol:"XRP/USD",
    category:"crypto",
    tv:"COINBASE:XRPUSD"
  },

  // METALS

  {
    symbol:"XAU/USD",
    category:"metals",
    tv:"OANDA:XAUUSD"
  },

  {
    symbol:"XAG/USD",
    category:"metals",
    tv:"OANDA:XAGUSD"
  }

];


// =====================================================
// STATE
// =====================================================

let currentUser = null;

let currentAccount = null;

let selectedPlan = null;

let trades = [];

let marketTimer = null;

let selectedSymbol =
  "EUR/USD";

let selectedCategory =
  "all";

let currentMarketPrice =
  null;

let previousMarketPrice =
  null;


// =====================================================
// HELPERS
// =====================================================

function $(id){

  return document.getElementById(id);

}


function money(value){

  return Number(
    value || 0
  ).toLocaleString(
    "en-US",
    {
      style:"currency",
      currency:"USD",
      minimumFractionDigits:2
    }
  );

}


function priceDecimals(symbol){

  if(
    symbol.includes("JPY")
  ){
    return 3;
  }

  if(
    symbol.includes("BTC") ||
    symbol.includes("ETH") ||
    symbol.includes("SOL") ||
    symbol.includes("XRP")
  ){
    return 2;
  }

  if(
    symbol.includes("XAU") ||
    symbol.includes("XAG")
  ){
    return 2;
  }

  return 5;

}


function formatPrice(
  price,
  symbol = selectedSymbol
){

  return Number(
    price || 0
  ).toFixed(
    priceDecimals(symbol)
  );

}


function showPage(pageId){

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

  if(page){
    page.classList.add(
      "active"
    );
  }

}


function setMessage(
  id,
  message,
  success = false
){

  const el =
    $(id);

  if(!el){
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
// NAVIGATION
// =====================================================

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "[data-page]"
      );

    if(!button){
      return;
    }

    const page =
      button.dataset.page;

    if(
      !currentUser &&
      page !== "auth"
    ){

      showPage("auth");

      setMessage(
        "auth-msg",
        "Please login first."
      );

      return;

    }

    showPage(page);

    if(
      page === "dashboard"
    ){

      renderDashboard();

    }

    if(
      page === "terminal"
    ){

      loadTerminal();

    }

    if(
      page === "home"
    ){

      updateHomePrice();

    }

  }
);


// =====================================================
// AUTH
// =====================================================

let loginMode = false;


function updateAuthUI(){

  const title =
    $("auth-title");

  const submit =
    $("auth-submit");

  const toggle =
    $("auth-toggle");

  const fields =
    $("signup-fields");

  if(
    !title ||
    !submit ||
    !toggle ||
    !fields
  ){
    return;
  }

  if(loginMode){

    title.textContent =
      "Welcome back";

    submit.textContent =
      "Login";

    toggle.textContent =
      "Don't have an account? Create one";

    fields.style.display =
      "none";

  }else{

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

    if(
      !email ||
      !password
    ){

      setMessage(
        "auth-msg",
        "Email and password required."
      );

      return;

    }

    if(
      password.length < 6
    ){

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

    try{

      if(loginMode){

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

        if(error){
          throw error;
        }

        currentUser =
          data.user;

        await startApp();

        setMessage(
          "auth-msg",
          "Login successful.",
          true
        );

      }else{

        const {
          data,
          error
        } =
          await supabase
            .auth
            .signUp({

              email,

              password,

              options:{
                data:{
                  full_name:
                    name
                }
              }

            });

        if(error){
          throw error;
        }

        if(!data.session){

          setMessage(
            "auth-msg",
            "Account created. Check your email to confirm.",
            true
          );

          return;

        }

        currentUser =
          data.user;

        await startApp();

      }

    }catch(error){

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

    stopMarketTimer();

    showPage(
      "auth"
    );

  }
);


// =====================================================
// ACCOUNT PLANS
// =====================================================

function renderPlans(){

  const grid =
    $("account-grid");

  if(!grid){
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


document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "[data-select-plan]"
      );

    if(!button){
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

    if(!selectedPlan){
      return;
    }

    $("coupon-box")
      ?.classList
      .remove("hidden");

    $("selected-plan")
      .textContent =
      `${selectedPlan.name} — ${selectedPlan.size} — ${money(selectedPlan.balance)} virtual balance`;

    $("coupon")
      ?.focus();

  }
);


// =====================================================
// ACTIVATE
// =====================================================

$("activate")?.addEventListener(
  "click",
  async () => {

    if(!currentUser){

      showPage("auth");

      return;

    }

    if(!selectedPlan){

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

    if(
      coupon !==
      "FRIENDS100"
    ){

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

      rules:{

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
        showPage("dashboard");
      },
      400
    );

  }
);


// =====================================================
// STORAGE
// =====================================================

function accountStorageKey(){

  return currentUser
    ? `propdemo_account_${currentUser.id}`
    : "propdemo_account";

}


function tradesStorageKey(){

  return currentUser
    ? `propdemo_trades_${currentUser.id}`
    : "propdemo_trades";

}


function saveAccount(){

  if(!currentAccount){
    return;
  }

  localStorage.setItem(
    accountStorageKey(),
    JSON.stringify(
      currentAccount
    )
  );

}


function loadAccount(){

  const raw =
    localStorage.getItem(
      accountStorageKey()
    );

  if(!raw){

    currentAccount =
      null;

    return;

  }

  try{

    currentAccount =
      JSON.parse(raw);

  }catch{

    currentAccount =
      null;

  }

}


function saveTrades(){

  localStorage.setItem(
    tradesStorageKey(),
    JSON.stringify(
      trades
    )
  );

}


function loadTrades(){

  const raw =
    localStorage.getItem(
      tradesStorageKey()
    );

  if(!raw){

    trades =
      [];

    return;

  }

  try{

    trades =
      JSON.parse(raw);

  }catch{

    trades =
      [];

  }

}


// =====================================================
// DASHBOARD
// =====================================================

function renderDashboard(){

  if(!currentAccount){

    $("account-title").textContent =
      "No account";

    $("account-status").textContent =
      "INACTIVE";

    $("balance").textContent =
      "$0.00";

    $("equity").textContent =
      "$0.00";

    $("pnl").textContent =
      "$0.00";

    $("dd").textContent =
      "$0.00";

    $("rules").innerHTML = `
      <p class="muted">
        Activate an account to see your rules.
      </p>
    `;

    $("status-detail").textContent =
      "Activate an account to start.";

    return;

  }

  $("account-title").textContent =
    `${currentAccount.planName} Account`;

  $("account-status").textContent =
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
      <span>Profit Target</span>
      <b>
        ${currentAccount.rules.target}%
      </b>
    </div>

    <div class="rule">
      <span>Daily Loss Limit</span>
      <b>
        ${currentAccount.rules.dailyLoss}%
      </b>
    </div>

    <div class="rule">
      <span>Maximum Drawdown</span>
      <b>
        ${currentAccount.rules.maxDrawdown}%
      </b>
    </div>

    <div class="rule">
      <span>Trading Mode</span>
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
// SYMBOL UI
// =====================================================

function renderSymbolSelect(){

  const select =
    $("symbol");

  if(!select){
    return;
  }

  select.innerHTML =
    SYMBOLS
      .map(
        item => `
          <option
            value="${item.symbol}"
          >
            ${item.symbol}
          </option>
        `
      )
      .join("");

  select.value =
    selectedSymbol;

}


function renderSymbolList(){

  const list =
    $("symbol-list");

  if(!list){
    return;
  }

  const search =
    (
      $("symbol-search")
        ?.value ||
      ""
    )
      .trim()
      .toLowerCase();

  const filtered =
    SYMBOLS.filter(
      item => {

        const categoryMatch =
          selectedCategory === "all" ||
          item.category ===
            selectedCategory;

        const searchMatch =
          !search ||
          item.symbol
            .toLowerCase()
            .includes(search);

        return (
          categoryMatch &&
          searchMatch
        );

      }
    );

  list.innerHTML =
    filtered
      .map(
        item => `

          <button
            class="
              symbol-chip
              ${
                item.symbol ===
                selectedSymbol
                  ? "active"
                  : ""
              }
            "
            data-symbol="${item.symbol}"
          >
            ${item.symbol}
          </button>

        `
      )
      .join("");

}


document.addEventListener(
  "click",
  event => {

    const category =
      event.target.closest(
        "[data-category]"
      );

    if(category){

      selectedCategory =
        category.dataset.category;

      document
        .querySelectorAll(
          ".category-btn"
        )
        .forEach(
          btn => {
            btn.classList.toggle(
              "active",
              btn === category
            );
          }
        );

      renderSymbolList();

      return;

    }

    const symbolButton =
      event.target.closest(
        "[data-symbol]"
      );

    if(symbolButton){

      selectSymbol(
        symbolButton.dataset.symbol
      );

    }

  }
);


$("symbol-search")
  ?.addEventListener(
    "input",
    renderSymbolList
  );


// =====================================================
// SELECT SYMBOL
// =====================================================

function selectSymbol(symbol){

  const exists =
    SYMBOLS.find(
      item =>
        item.symbol ===
        symbol
    );

  if(!exists){
    return;
  }

  selectedSymbol =
    symbol;

  const select =
    $("symbol");

  if(select){
    select.value =
      symbol;
  }

  renderSymbolList();

  loadTradingViewChart();

  updateMarketPrice();

}


// =====================================================
// TRADINGVIEW
// =====================================================

function loadTradingViewChart(){

  const container =
    $("tradingview-widget");

  if(!container){
    return;
  }

  const config =
    SYMBOLS.find(
      item =>
        item.symbol ===
        selectedSymbol
    );

  const tvSymbol =
    config?.tv ||
    "FX:EURUSD";

  container.innerHTML =
    "";

  const wrapper =
    document.createElement(
      "div"
    );

  wrapper.style.width =
    "100%";

  wrapper.style.height =
    "100%";

  wrapper.className =
    "tradingview-widget-container";

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

      autosize:true,

      symbol:
        tvSymbol,

      interval:"5",

      timezone:"Etc/UTC",

      theme:"dark",

      style:"1",

      locale:"en",

      allow_symbol_change:true,

      hide_top_toolbar:false,

      hide_legend:false,

      save_image:false,

      calendar:false,

      support_host:
        "https://www.tradingview.com"

    });

  wrapper.appendChild(
    script
  );

}


// =====================================================
// MARKET API
// =====================================================

async function getMarketPrice(
  symbol = selectedSymbol
){

  const endpoint =
    `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`;

  const response =
    await fetch(
      `${endpoint}?symbol=${encodeURIComponent(symbol)}`,
      {
        method:"POST",

        headers:{
          "Content-Type":
            "application/json",

          "apikey":
            SUPABASE_PUBLISHABLE_KEY,

          "Authorization":
            `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        },

        body:"{}"
      }
    );

  const data =
    await response.json();

  if(
    !response.ok ||
    data.success === false
  ){

    throw new Error(
      data.error ||
      "Market data unavailable"
    );

  }

  return data;

}


// =====================================================
// P&L CALCULATION
// =====================================================

function calculatePnl(
  trade,
  currentPrice
){

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

  if(
    !Number.isFinite(entry) ||
    !Number.isFinite(price)
  ){
    return 0;
  }

  /*
    Demo P&L model.

    Forex:
    price difference × position size ×
    100,000 notional.

    Crypto/metals use a simplified
    contract multiplier.
  */

  let multiplier =
    100000;

  if(
    trade.symbol.includes("BTC") ||
    trade.symbol.includes("ETH") ||
    trade.symbol.includes("SOL") ||
    trade.symbol.includes("XRP")
  ){
    multiplier = 1;
  }

  if(
    trade.symbol.includes("XAU") ||
    trade.symbol.includes("XAG")
  ){
    multiplier = 100;
  }

  const difference =
    trade.side === "BUY"
      ? price - entry
      : entry - price;

  return (
    difference *
    size *
    multiplier
  );

}


// =====================================================
// MARKET PRICE UPDATE
// =====================================================

async function updateMarketPrice(){

  try{

    const data =
      await getMarketPrice(
        selectedSymbol
      );

    const price =
      Number(
        data.price
      );

    if(
      !Number.isFinite(price)
    ){
      throw new Error(
        "Invalid market price"
      );
    }

    previousMarketPrice =
      currentMarketPrice;

    currentMarketPrice =
      price;

    $("market-symbol")
      .textContent =
      data.symbol ||
      selectedSymbol;

    $("market-price")
      .textContent =
      formatPrice(
        price,
        selectedSymbol
      );

    const change =
      Number(
        data.percentChange ||
        0
      );

    $("market-change")
      .textContent =
      `${change >= 0 ? "+" : ""}${change.toFixed(3)}%`;

    $("market-change")
      .style.color =
      change >= 0
        ? "var(--green)"
        : "var(--red)";

    $("market-status")
      .textContent =
      "● LIVE MARKET";

    $("market-status")
      .style.color =
      "var(--green)";

    $("home-price")
      .textContent =
      formatPrice(
        price,
        selectedSymbol
      );

    updateOpenTrades(
      price
    );

  }catch(error){

    console.error(
      "Market data error:",
      error
    );

    $("market-status")
      .textContent =
      "● OFFLINE";

    $("market-status")
      .style.color =
      "var(--red)";

    $("market-price")
      .textContent =
      "Unavailable";

  }

}


// =====================================================
// HOME
// =====================================================

async function updateHomePrice(){

  try{

    const data =
      await getMarketPrice(
        "EUR/USD"
      );

    $("home-price")
      .textContent =
      formatPrice(
        data.price,
        "EUR/USD"
      );

  }catch(error){

    console.error(
      error
    );

  }

}


// =====================================================
// OPEN TRADE
// =====================================================

async function executeTrade(
  side
){

  if(!currentAccount){

    setMessage(
      "trade-msg",
      "Activate an account first."
    );

    return;

  }

  const size =
    Number(
      $("size")
        ?.value
    );

  const stopLossValue =
    $("stop-loss")
      ?.value
      .trim();

  const takeProfitValue =
    $("take-profit")
      ?.value
      .trim();

  if(
    !size ||
    size <= 0
  ){

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

  let market;

  try{

    market =
      await getMarketPrice(
        selectedSymbol
      );

  }catch(error){

    console.error(
      error
    );

    setMessage(
      "trade-msg",
      "Market data unavailable."
    );

    return;

  }

  const entry =
    Number(
      market.price
    );

  const stopLoss =
    stopLossValue
      ? Number(
          stopLossValue
        )
      : null;

  const takeProfit =
    takeProfitValue
      ? Number(
          takeProfitValue
        )
      : null;


  if(
    stopLoss !== null &&
    !Number.isFinite(
      stopLoss
    )
  ){

    setMessage(
      "trade-msg",
      "Invalid Stop Loss."
    );

    return;

  }


  if(
    takeProfit !== null &&
    !Number.isFinite(
      takeProfit
    )
  ){

    setMessage(
      "trade-msg",
      "Invalid Take Profit."
    );

    return;

  }


  if(side === "BUY"){

    if(
      stopLoss !== null &&
      stopLoss >= entry
    ){

      setMessage(
        "trade-msg",
        "BUY Stop Loss must be below entry."
      );

      return;

    }

    if(
      takeProfit !== null &&
      takeProfit <= entry
    ){

      setMessage(
        "trade-msg",
        "BUY Take Profit must be above entry."
      );

      return;

    }

  }


  if(side === "SELL"){

    if(
      stopLoss !== null &&
      stopLoss <= entry
    ){

      setMessage(
        "trade-msg",
        "SELL Stop Loss must be above entry."
      );

      return;

    }

    if(
      takeProfit !== null &&
      takeProfit >= entry
    ){

      setMessage(
        "trade-msg",
        "SELL Take Profit must be below entry."
      );

      return;

    }

  }


  const trade = {

    id:
      crypto.randomUUID
        ? crypto.randomUUID()
        : String(
            Date.now()
          ),

    side,

    symbol:
      selectedSymbol,

    size,

    entry,

    stopLoss,

    takeProfit,

    status:
      "OPEN",

    openedAt:
      new Date()
        .toISOString(),

    closePrice:null,

    realizedPnl:0

  };


  trades.unshift(
    trade
  );

  saveTrades();

  setMessage(
    "trade-msg",

    `${side} ${selectedSymbol} opened at ${formatPrice(entry, selectedSymbol)}.`,

    true
  );

  renderOpenTrades(
    currentMarketPrice ||
    entry
  );

  renderHistory();

}


// =====================================================
// CLOSE TRADE
// =====================================================

async function closeTrade(
  tradeId,
  reason = "MANUAL"
){

  const trade =
    trades.find(
      item =>
        item.id ===
        tradeId
    );

  if(
    !trade ||
    trade.status !==
      "OPEN"
  ){
    return;
  }

  setMessage(
    "trade-msg",
    "Getting closing price..."
  );

  let market;

  try{

    market =
      await getMarketPrice(
        trade.symbol
      );

  }catch(error){

    setMessage(
      "trade-msg",
      "Could not get closing price."
    );

    return;

  }

  const closePrice =
    Number(
      market.price
    );

  const pnl =
    calculatePnl(
      trade,
      closePrice
    );

  trade.status =
    "CLOSED";

  trade.closePrice =
    closePrice;

  trade.realizedPnl =
    pnl;

  trade.closeReason =
    reason;

  trade.closedAt =
    new Date()
      .toISOString();

  currentAccount.pnl +=
    pnl;

  currentAccount.equity =
    currentAccount.balance +
    currentAccount.pnl;

  currentAccount.drawdown =
    Math.max(
      0,
      currentAccount.balance -
      currentAccount.equity
    );

  saveAccount();

  saveTrades();

  renderDashboard();

  renderOpenTrades(
    closePrice
  );

  renderHistory();

  setMessage(
    "trade-msg",
    `${trade.symbol} closed at ${formatPrice(closePrice, trade.symbol)} | P&L ${pnl >= 0 ? "+" : ""}${money(pnl)}`,
    pnl >= 0
  );

}


// =====================================================
// SL / TP CHECK
// =====================================================

async function checkStops(
  price
){

  const openTrades =
    trades.filter(
      trade =>
        trade.status ===
        "OPEN" &&
        trade.symbol ===
        selectedSymbol
    );

  for(
    const trade of openTrades
  ){

    if(
      trade.stopLoss !== null
    ){

      if(
        trade.side === "BUY" &&
        price <=
          trade.stopLoss
      ){

        await closeTrade(
          trade.id,
          "STOP LOSS"
        );

        continue;

      }

      if(
        trade.side === "SELL" &&
        price >=
          trade.stopLoss
      ){

        await closeTrade(
          trade.id,
          "STOP LOSS"
        );

        continue;

      }

    }


    if(
      trade.takeProfit !== null
    ){

      if(
        trade.side === "BUY" &&
        price >=
          trade.takeProfit
      ){

        await closeTrade(
          trade.id,
          "TAKE PROFIT"
        );

        continue;

      }

      if(
        trade.side === "SELL" &&
        price <=
          trade.takeProfit
      ){

        await closeTrade(
          trade.id,
          "TAKE PROFIT"
        );

      }

    }

  }

}


// =====================================================
// OPEN TRADE UI
// =====================================================

function renderOpenTrades(
  price = currentMarketPrice
){

  const container =
    $("open-trades");

  if(!container){
    return;
  }

  const openTrades =
    trades.filter(
      trade =>
        trade.status ===
        "OPEN"
    );

  if(!openTrades.length){

    container.innerHTML = `
      <div class="history-empty">
        No open trades.
      </div>
    `;

    return;

  }

  container.innerHTML =
    openTrades
      .map(
        trade => {

          const livePnl =
            price &&
            trade.symbol ===
              selectedSymbol
              ? calculatePnl(
                  trade,
                  price
                )
              : 0;

          return `

            <div
              class="position-card"
            >

              <div
                class="position-top"
              >

                <span
                  class="position-symbol"
                >
                  ${trade.symbol}
                </span>

                <span
                  class="
                    position-side
                    ${
                      trade.side
                        .toLowerCase()
                    }
                  "
                >
                  ${trade.side}
                </span>

              </div>


              <div
                class="position-grid"
              >

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
                    ${formatPrice(
                      trade.entry,
                      trade.symbol
                    )}
                  </b>
                </div>


                <div>
                  <span>
                    SL
                  </span>

                  <b>
                    ${
                      trade.stopLoss === null
                        ? "-"
                        : formatPrice(
                            trade.stopLoss,
                            trade.symbol
                          )
                    }
                  </b>
                </div>


                <div>
                  <span>
                    TP
                  </span>

                  <b>
                    ${
                      trade.takeProfit === null
                        ? "-"
                        : formatPrice(
                            trade.takeProfit,
                            trade.symbol
                          )
                    }
                  </b>
                </div>

              </div>


              <div
                class="position-top"
                style="margin-top:12px"
              >

                <span>
                  Live P&L
                </span>

                <strong
                  style="
                    color:
                    ${
                      livePnl >= 0
                        ? "var(--green)"
                        : "var(--red)"
                    };
                  "
                >
                  ${
                    livePnl >= 0
                      ? "+"
                      : ""
                  }${money(livePnl)}
                </strong>

              </div>


              <button
                class="close-trade"
                data-close-trade="${trade.id}"
              >
                Close Trade
              </button>

            </div>

          `;

        }
      )
      .join("");

}


document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "[data-close-trade]"
      );

    if(!button){
      return;
    }

    closeTrade(
      button.dataset.closeTrade
    );

  }
);


// =====================================================
// HISTORY
// =====================================================

function renderHistory(){

  const history =
    $("history");

  if(!history){
    return;
  }

  const closed =
    trades.filter(
      trade =>
        trade.status ===
        "CLOSED"
    );

  if(!closed.length){

    history.innerHTML = `
      <div class="history-empty">
        No closed trades yet.
      </div>
    `;

    return;

  }

  history.innerHTML = `

    <div class="trade-row">

      <b>Side</b>

      <b>Symbol</b>

      <b>Entry</b>

      <b>Exit</b>

      <b>P&L</b>

    </div>

    ${
      closed
        .map(
          trade => `

            <div
              class="trade-row"
            >

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

              <span>
                ${formatPrice(
                  trade.closePrice,
                  trade.symbol
                )}
              </span>

              <span
                style="
                  color:
                  ${
                    trade.realizedPnl >= 0
                      ? "var(--green)"
                      : "var(--red)"
                  };
                "
              >
                ${
                  trade.realizedPnl >= 0
                    ? "+"
                    : ""
                }${money(
                  trade.realizedPnl
                )}
              </span>

            </div>

          `
        )
        .join("")
    }

  `;

}


// =====================================================
// UPDATE OPEN TRADES
// =====================================================

function updateOpenTrades(
  price
){

  renderOpenTrades(
    price
  );

  checkStops(
    price
  );

}


// =====================================================
// TERMINAL
// =====================================================

function loadTerminal(){

  renderSymbolSelect();

  renderSymbolList();

  loadTradingViewChart();

  updateMarketPrice();

  renderOpenTrades(
    currentMarketPrice
  );

  renderHistory();

  startMarketTimer();

}


function startMarketTimer(){

  stopMarketTimer();

  /*
    Free API friendly polling.
    This is not tick-by-tick.
  */

  marketTimer =
    setInterval(
      updateMarketPrice,
      60000
    );

}


function stopMarketTimer(){

  if(marketTimer){

    clearInterval(
      marketTimer
    );

    marketTimer =
      null;

  }

}


// =====================================================
// SELECT CHANGE
// =====================================================

$("symbol")?.addEventListener(
  "change",
  event => {

    selectSymbol(
      event.target.value
    );

  }
);


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
// START APP
// =====================================================

async function startApp(){

  loadAccount();

  loadTrades();

  renderPlans();

  if(currentAccount){

    showPage(
      "dashboard"
    );

    renderDashboard();

  }else{

    showPage(
      "home"
    );

    updateHomePrice();

  }

}


// =====================================================
// SESSION
// =====================================================

async function checkSession(){

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

  if(currentUser){

    await startApp();

  }else{

    showPage(
      "auth"
    );

  }

}


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

      if(
        event ===
        "SIGNED_IN"
      ){

        await startApp();

      }

      if(
        event ===
        "SIGNED_OUT"
      ){

        stopMarketTimer();

        showPage(
          "auth"
        );

      }

    }
  );


// =====================================================
// INIT
// =====================================================

updateAuthUI();

renderPlans();

renderSymbolSelect();

renderSymbolList();

checkSession();
