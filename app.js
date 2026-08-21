// =====================================================
// PROP DEMO V4
// LIVE MARKET + TRADINGVIEW + SL/TP + LIVE P&L
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

const MARKET_REFRESH_MS =
  8000;


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
// SYMBOL CONFIG
// =====================================================

const SYMBOLS = {

  "EUR/USD":{
    tradingView:"FX:EURUSD",
    decimals:5
  },

  "GBP/USD":{
    tradingView:"FX:GBPUSD",
    decimals:5
  },

  "USD/JPY":{
    tradingView:"FX:USDJPY",
    decimals:3
  },

  "USD/CHF":{
    tradingView:"FX:USDCHF",
    decimals:5
  },

  "AUD/USD":{
    tradingView:"FX:AUDUSD",
    decimals:5
  },

  "USD/CAD":{
    tradingView:"FX:USDCAD",
    decimals:5
  },

  "XAU/USD":{
    tradingView:"OANDA:XAUUSD",
    decimals:2
  },

  "BTC/USD":{
    tradingView:"BINANCE:BTCUSDT",
    decimals:2
  },

  "ETH/USD":{
    tradingView:"BINANCE:ETHUSDT",
    decimals:2
  },

  "SOL/USD":{
    tradingView:"BINANCE:SOLUSDT",
    decimals:3
  }

};


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

let lastMarketData =
  null;

let chartLoadedFor =
  null;

let loginMode =
  false;


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


function safeNumber(
  value,
  fallback = 0
){

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;

}


function symbolDecimals(
  symbol
){

  return (
    SYMBOLS[symbol]?.decimals ||
    5
  );

}


function formatPrice(
  price,
  symbol
){

  const decimals =
    symbolDecimals(
      symbol
    );

  return safeNumber(
    price
  ).toFixed(
    decimals
  );

}


function showPage(
  pageId
){

  document
    .querySelectorAll(
      ".page"
    )
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

    localStorage.setItem(
      "propdemo_last_page",
      pageId
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


    if(page === "dashboard"){
      renderDashboard();
    }


    if(page === "terminal"){
      loadTerminal();
    }


    if(page === "accounts"){
      renderPlans();
    }


    if(page === "home"){
      updateHomePrice();
    }

  }
);


// =====================================================
// AUTH UI
// =====================================================

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


    if(password.length < 6){

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


        setMessage(
          "auth-msg",
          "Login successful.",
          true
        );


        await startApp();

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
            "Account created. Check your email to confirm your account.",
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


    if(marketTimer){

      clearInterval(
        marketTimer
      );

      marketTimer =
        null;

    }


    localStorage.removeItem(
      "propdemo_last_page"
    );


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
// PLANS
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
          plan.id === planId
      );


    if(!selectedPlan){
      return;
    }


    $("coupon-box")
      ?.classList
      .remove("hidden");


    $("selected-plan").textContent =
      `${selectedPlan.name} — ${selectedPlan.size} — ${money(selectedPlan.balance)} virtual balance`;


    $("coupon")?.focus();

  }
);


// =====================================================
// ACTIVATE ACCOUNT
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


    if(coupon !== "FRIENDS100"){

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

        showPage(
          "dashboard"
        );

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
      JSON.parse(
        raw
      );

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
      JSON.parse(
        raw
      );

  }catch{

    trades =
      [];

  }


  if(!Array.isArray(trades)){
    trades = [];
  }

}


// =====================================================
// DASHBOARD
// =====================================================

function renderDashboard(){

  const title =
    $("account-title");

  const status =
    $("account-status");


  if(!currentAccount){

    if(title){
      title.textContent =
        "No account";
    }

    if(status){
      status.textContent =
        "INACTIVE";
    }

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
// TRADINGVIEW SYMBOL
// =====================================================

function getTradingViewSymbol(
  symbol
){

  return (
    SYMBOLS[symbol]?.tradingView ||
    "FX:EURUSD"
  );

}


// =====================================================
// TRADINGVIEW CHART
// =====================================================

function loadTradingViewChart(
  symbol
){

  const container =
    $("tradingview-widget");


  if(!container){
    return;
  }


  if(
    chartLoadedFor === symbol &&
    container.querySelector(
      "iframe"
    )
  ){

    return;

  }


  chartLoadedFor =
    symbol;


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
        getTradingViewSymbol(
          symbol
        ),

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
// SUPABASE MARKET FUNCTION
// =====================================================

async function getMarketPrice(
  symbol = "EUR/USD"
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

function calculateTradePnl(
  trade,
  price
){

  const entry =
    safeNumber(
      trade.entry
    );

  const current =
    safeNumber(
      price
    );

  const size =
    safeNumber(
      trade.size
    );


  /*
   * Virtual demo calculation.
   *
   * Forex:
   * price difference × size × 100000
   *
   * This is a simulation, not broker P&L.
   */

  let multiplier =
    100000;


  if(
    trade.symbol === "XAU/USD"
  ){

    multiplier =
      100;

  }


  if(
    trade.symbol === "BTC/USD" ||
    trade.symbol === "ETH/USD"
  ){

    multiplier =
      1;

  }


  if(
    trade.symbol === "SOL/USD"
  ){

    multiplier =
      1;

  }


  let pnl;


  if(
    trade.side === "BUY"
  ){

    pnl =
      (
        current -
        entry
      ) *
      size *
      multiplier;

  }else{

    pnl =
      (
        entry -
        current
      ) *
      size *
      multiplier;

  }


  return pnl;

}


// =====================================================
// SL / TP CHECK
// =====================================================

function checkStopLossTakeProfit(
  trade,
  price
){

  if(
    trade.status !== "OPEN"
  ){

    return null;

  }


  const current =
    safeNumber(
      price
    );


  const sl =
    safeNumber(
      trade.stopLoss,
      NaN
    );


  const tp =
    safeNumber(
      trade.takeProfit,
      NaN
    );


  if(
    trade.side === "BUY"
  ){

    if(
      Number.isFinite(sl) &&
      current <= sl
    ){

      return "STOP LOSS";

    }


    if(
      Number.isFinite(tp) &&
      current >= tp
    ){

      return "TAKE PROFIT";

    }

  }


  if(
    trade.side === "SELL"
  ){

    if(
      Number.isFinite(sl) &&
      current >= sl
    ){

      return "STOP LOSS";

    }


    if(
      Number.isFinite(tp) &&
      current <= tp
    ){

      return "TAKE PROFIT";

    }

  }


  return null;

}


// =====================================================
// UPDATE ACCOUNT EQUITY FROM OPEN TRADES
// =====================================================

function updateAccountFromOpenTrades(){

  if(!currentAccount){
    return;
  }


  let floating =
    0;


  trades
    .filter(
      trade =>
        trade.status === "OPEN"
    )
    .forEach(
      trade => {

        if(
          Number.isFinite(
            Number(
              trade.livePnl
            )
          )
        ){

          floating +=
            Number(
              trade.livePnl
            );

        }

      }
    );


  currentAccount.equity =
    currentAccount.balance +
    currentAccount.pnl +
    floating;


  currentAccount.drawdown =
    Math.max(
      0,
      currentAccount.balance -
      currentAccount.equity
    );


  saveAccount();

}


// =====================================================
// CHART P&L
// =====================================================

function updateChartPnL(
  marketPrice = null
){

  const box =
    $("chart-pnl");


  if(!box){
    return;
  }


  const symbol =
    $("symbol")
      ?.value;


  const openTrades =
    trades.filter(
      trade =>
        trade.status === "OPEN" &&
        (
          !symbol ||
          trade.symbol === symbol
        )
    );


  if(!openTrades.length){

    box.classList.add(
      "hidden"
    );

    return;

  }


  const trade =
    openTrades[0];


  const price =
    safeNumber(
      marketPrice ??
      trade.currentPrice ??
      trade.entry
    );


  const pnl =
    calculateTradePnl(
      trade,
      price
    );


  trade.currentPrice =
    price;

  trade.livePnl =
    pnl;


  const sideEl =
    $("chart-pnl-side");

  const symbolEl =
    $("chart-pnl-symbol");

  const valueEl =
    $("chart-pnl-value");

  const entryEl =
    $("chart-pnl-entry");

  const currentEl =
    $("chart-pnl-current");

  const slEl =
    $("chart-pnl-sl");

  const tpEl =
    $("chart-pnl-tp");


  if(sideEl){

    sideEl.textContent =
      trade.side;

    sideEl.style.color =
      trade.side === "BUY"
        ? "var(--green)"
        : "var(--red)";

  }


  if(symbolEl){

    symbolEl.textContent =
      trade.symbol;

  }


  if(valueEl){

    valueEl.textContent =
      `${pnl >= 0 ? "+" : ""}${money(pnl)}`;

    valueEl.classList.toggle(
      "loss",
      pnl < 0
    );

  }


  if(entryEl){

    entryEl.textContent =
      formatPrice(
        trade.entry,
        trade.symbol
      );

  }


  if(currentEl){

    currentEl.textContent =
      formatPrice(
        price,
        trade.symbol
      );

  }


  if(slEl){

    slEl.textContent =
      trade.stopLoss
        ? formatPrice(
            trade.stopLoss,
            trade.symbol
          )
        : "-";

  }


  if(tpEl){

    tpEl.textContent =
      trade.takeProfit
        ? formatPrice(
            trade.takeProfit,
            trade.symbol
          )
        : "-";

  }


  box.classList.remove(
    "hidden"
  );

}


// =====================================================
// OPEN POSITIONS
// =====================================================

function renderOpenTrades(){

  const container =
    $("open-trades");

  const count =
    $("open-count");


  if(!container){
    return;
  }


  const openTrades =
    trades.filter(
      trade =>
        trade.status === "OPEN"
    );


  if(count){

    count.textContent =
      `${openTrades.length} OPEN`;

  }


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

          const pnl =
            safeNumber(
              trade.livePnl
            );


          const pnlClass =
            pnl >= 0
              ? "profit"
              : "loss";


          return `

            <div class="position-card">

              <div class="position-head">

                <div class="position-symbol">
                  ${trade.symbol}
                </div>

                <span
                  class="position-side ${
                    trade.side === "BUY"
                      ? "buy"
                      : "sell"
                  }"
                >
                  ${trade.side}
                </span>

              </div>


              <div class="position-details">

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
                      trade.stopLoss
                        ? formatPrice(
                            trade.stopLoss,
                            trade.symbol
                          )
                        : "-"
                    }
                  </b>

                </div>


                <div>

                  <span>
                    TP
                  </span>

                  <b>
                    ${
                      trade.takeProfit
                        ? formatPrice(
                            trade.takeProfit,
                            trade.symbol
                          )
                        : "-"
                    }
                  </b>

                </div>

              </div>


              <div
                class="position-pnl ${pnlClass}"
              >
                Live P&L:
                ${pnl >= 0 ? "+" : ""}
                ${money(pnl)}
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


// =====================================================
// MANUAL CLOSE
// =====================================================

async function closeTrade(
  tradeId,
  reason = "MANUAL CLOSE"
){

  const trade =
    trades.find(
      item =>
        item.id === tradeId
    );


  if(
    !trade ||
    trade.status !== "OPEN"
  ){

    return;

  }


  let price =
    safeNumber(
      trade.currentPrice,
      trade.entry
    );


  try{

    const market =
      await getMarketPrice(
        trade.symbol
      );


    price =
      safeNumber(
        market.price,
        price
      );

  }catch(error){

    console.warn(
      "Close price refresh failed:",
      error
    );

  }


  const pnl =
    calculateTradePnl(
      trade,
      price
    );


  trade.currentPrice =
    price;

  trade.livePnl =
    pnl;

  trade.pnl =
    pnl;

  trade.status =
    "CLOSED";

  trade.closeReason =
    reason;

  trade.closePrice =
    price;

  trade.closeTime =
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

  renderOpenTrades();

  renderHistory();


  updateChartPnL();

  setMessage(
    "trade-msg",
    `${trade.side} ${trade.symbol} closed at ${formatPrice(price, trade.symbol)} (${reason}). P&L ${pnl >= 0 ? "+" : ""}${money(pnl)}.`,
    pnl >= 0
  );

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


    if(!button){
      return;
    }


    closeTrade(
      button.dataset.closeTrade,
      "MANUAL CLOSE"
    );

  }
);


// =====================================================
// MARKET UPDATE
// =====================================================

async function updateMarketPrice(){

  const symbol =
    $("symbol")
      ?.value ||
    "EUR/USD";


  try{

    const data =
      await getMarketPrice(
        symbol
      );


    lastMarketData =
      data;


    const price =
      safeNumber(
        data.price
      );


    const change =
      safeNumber(
        data.percentChange
      );


    const priceEl =
      $("market-price");

    const changeEl =
      $("market-change");

    const statusEl =
      $("market-status");


    if(priceEl){

      priceEl.textContent =
        formatPrice(
          price,
          symbol
        );

    }


    if(changeEl){

      changeEl.textContent =
        `${change >= 0 ? "+" : ""}${change.toFixed(3)}%`;

      changeEl.style.color =
        change >= 0
          ? "var(--green)"
          : "var(--red)";

    }


    if(statusEl){

      statusEl.textContent =
        "● LIVE MARKET";

      statusEl.style.color =
        "var(--green)";

    }


    const symbolEl =
      $("market-symbol");


    if(symbolEl){

      symbolEl.textContent =
        data.symbol ||
        symbol;

    }


    const homePrice =
      $("home-price");


    if(homePrice){

      homePrice.textContent =
        formatPrice(
          price,
          symbol
        );

    }


    const homeSymbol =
      $("home-symbol");


    if(homeSymbol){

      homeSymbol.textContent =
        symbol;

    }


    /*
     * Update every open trade belonging
     * to this symbol.
     */

    const symbolTrades =
      trades.filter(
        trade =>
          trade.status === "OPEN" &&
          trade.symbol === symbol
      );


    for(
      const trade
      of symbolTrades
    ){

      trade.currentPrice =
        price;

      trade.livePnl =
        calculateTradePnl(
          trade,
          price
        );


      const trigger =
        checkStopLossTakeProfit(
          trade,
          price
        );


      if(trigger){

        await closeTrade(
          trade.id,
          trigger
        );

      }

    }


    saveTrades();

    updateAccountFromOpenTrades();

    renderOpenTrades();

    updateChartPnL(
      price
    );


    return data;

  }catch(error){

    console.error(
      "Market price error:",
      error
    );


    if(priceEl){

      priceEl.textContent =
        "Unavailable";

    }


    if(changeEl){

      changeEl.textContent =
        "Offline";

    }


    if(statusEl){

      statusEl.textContent =
        "● OFFLINE";

      statusEl.style.color =
        "var(--red)";

    }

  }

}


// =====================================================
// HOME PRICE
// =====================================================

async function updateHomePrice(){

  try{

    const data =
      await getMarketPrice(
        "EUR/USD"
      );


    const homePrice =
      $("home-price");


    if(homePrice){

      homePrice.textContent =
        formatPrice(
          data.price,
          "EUR/USD"
        );

    }

  }catch(error){

    console.error(
      error
    );

  }

}


// =====================================================
// TERMINAL
// =====================================================

function loadTerminal(){

  const symbol =
    $("symbol")
      ?.value ||
    "EUR/USD";


  loadTradingViewChart(
    symbol
  );


  updateMarketPrice();


  renderOpenTrades();

  renderHistory();


  if(marketTimer){

    clearInterval(
      marketTimer
    );

  }


  /*
   * Twelve Data free plan has a rate limit.
   * 8 seconds keeps the polling close to
   * the allowed free rate.
   */

  marketTimer =
    setInterval(
      updateMarketPrice,
      MARKET_REFRESH_MS
    );

}


// =====================================================
// SYMBOL CHANGE
// =====================================================

$("symbol")?.addEventListener(
  "change",
  () => {

    const symbol =
      $("symbol")
        .value;


    chartLoadedFor =
      null;


    loadTradingViewChart(
      symbol
    );


    updateMarketPrice();

  }
);


// =====================================================
// BUY / SELL
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
    safeNumber(
      $("size")
        ?.value
    );


  const symbol =
    $("symbol")
      ?.value ||
    "EUR/USD";


  const stopLoss =
    safeNumber(
      $("stop-loss")
        ?.value,
      NaN
    );


  const takeProfit =
    safeNumber(
      $("take-profit")
        ?.value,
      NaN
    );


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


  /*
   * Validate SL / TP direction.
   */

  if(
    side === "BUY"
  ){

    if(
      Number.isFinite(stopLoss) &&
      Number.isFinite(takeProfit)
    ){

      if(
        stopLoss >= takeProfit
      ){

        setMessage(
          "trade-msg",
          "For BUY, Stop Loss must be below Take Profit."
        );

        return;

      }

    }

  }


  setMessage(
    "trade-msg",
    "Getting live market price..."
  );


  let market;


  try{

    market =
      await getMarketPrice(
        symbol
      );

  }catch(error){

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
    safeNumber(
      market.price
    );


  /*
   * Basic SL / TP validation
   */

  if(side === "BUY"){

    if(
      Number.isFinite(stopLoss) &&
      stopLoss >= entry
    ){

      setMessage(
        "trade-msg",
        "BUY Stop Loss must be below entry price."
      );

      return;

    }


    if(
      Number.isFinite(takeProfit) &&
      takeProfit <= entry
    ){

      setMessage(
        "trade-msg",
        "BUY Take Profit must be above entry price."
      );

      return;

    }

  }


  if(side === "SELL"){

    if(
      Number.isFinite(stopLoss) &&
      stopLoss <= entry
    ){

      setMessage(
        "trade-msg",
        "SELL Stop Loss must be above entry price."
      );

      return;

    }


    if(
      Number.isFinite(takeProfit) &&
      takeProfit >= entry
    ){

      setMessage(
        "trade-msg",
        "SELL Take Profit must be below entry price."
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

    symbol,

    size,

    entry,

    currentPrice:
      entry,

    stopLoss:
      Number.isFinite(
        stopLoss
      )
        ? stopLoss
        : null,

    takeProfit:
      Number.isFinite(
        takeProfit
      )
        ? takeProfit
        : null,

    pnl:0,

    livePnl:0,

    status:"OPEN",

    time:
      new Date()
        .toISOString(),

    closeTime:null,

    closeReason:null,

    closePrice:null

  };


  trades.unshift(
    trade
  );


  saveTrades();

  renderOpenTrades();

  renderHistory();


  updateChartPnL(
    entry
  );


  setMessage(
    "trade-msg",
    `${side} ${symbol} order opened virtually at ${formatPrice(entry, symbol)}.`,
    true
  );


  /*
   * Reset SL/TP fields after opening.
   */

  $("stop-loss").value =
    "";

  $("take-profit").value =
    "";


  /*
   * Immediately check whether
   * the current price already triggers
   * SL/TP.
   */

  const trigger =
    checkStopLossTakeProfit(
      trade,
      entry
    );


  if(trigger){

    await closeTrade(
      trade.id,
      trigger
    );

  }

}


// =====================================================
// BUY
// =====================================================

$("buy")?.addEventListener(
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

$("sell")?.addEventListener(
  "click",
  () => {

    executeTrade(
      "SELL"
    );

  }
);


// =====================================================
// TRADE HISTORY
// =====================================================

function renderHistory(){

  const history =
    $("history");


  if(!history){
    return;
  }


  const closedTrades =
    trades.filter(
      trade =>
        trade.status === "CLOSED"
    );


  if(!closedTrades.length){

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
        Exit
      </b>

      <b>
        P&L
      </b>

    </div>


    ${closedTrades
      .map(
        trade => `

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
                  trade.pnl >= 0
                    ? "var(--green)"
                    : "var(--red)"
                }
              "
            >
              ${
                trade.pnl >= 0
                  ? "+"
                  : ""
              }${money(
                trade.pnl
              )}
            </span>

          </div>

        `
      )
      .join("")}

  `;

}


// =====================================================
// FULLSCREEN CHART
// =====================================================

$("chart-fullscreen")
  ?.addEventListener(
    "click",
    () => {

      const chart =
        $("chart-screen");


      if(!chart){
        return;
      }


      chart.classList.toggle(
        "fullscreen"
      );


      const button =
        $("chart-fullscreen");


      if(
        chart.classList.contains(
          "fullscreen"
        )
      ){

        button.textContent =
          "✕ Exit Full Screen";

      }else{

        button.textContent =
          "⛶ Full Screen";

      }

    }
  );


// =====================================================
// ESCAPE FULLSCREEN
// =====================================================

document.addEventListener(
  "keydown",
  event => {

    if(
      event.key !== "Escape"
    ){
      return;
    }


    const chart =
      $("chart-screen");


    if(
      chart?.classList.contains(
        "fullscreen"
      )
    ){

      chart.classList.remove(
        "fullscreen"
      );


      $("chart-fullscreen").textContent =
        "⛶ Full Screen";

    }

  }
);


// =====================================================
// START APP
// =====================================================

async function startApp(){

  loadAccount();

  loadTrades();

  renderPlans();

  renderOpenTrades();

  renderHistory();


  const savedPage =
    localStorage.getItem(
      "propdemo_last_page"
    );


  if(currentAccount){

    if(
      savedPage &&
      [
        "home",
        "accounts",
        "dashboard",
        "terminal"
      ].includes(savedPage)
    ){

      showPage(
        savedPage
      );

      if(
        savedPage ===
        "terminal"
      ){

        loadTerminal();

      }

    }else{

      showPage(
        "dashboard"
      );

      renderDashboard();

    }

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

renderPlans();

checkSession();
