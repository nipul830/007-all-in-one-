// =====================================================
// PROP DEMO V3
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
// STATE
// =====================================================

let currentUser = null;

let currentAccount = null;

let selectedPlan = null;

let trades = [];

let marketTimer = null;


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


function showPage(pageId){

  document
    .querySelectorAll(".page")
    .forEach(page => {

      page.classList.remove(
        "active"
      );

    });


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


    showPage(
      page
    );


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
// AUTH MODE
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


        if(
          !data.session
        ){

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


    if(
      marketTimer
    ){

      clearInterval(
        marketTimer
      );

      marketTimer =
        null;

    }


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

function renderPlans(){

  const grid =
    $("account-grid");


  if(!grid){

    return;

  }


  grid.innerHTML =
    PLANS
      .map(plan => `

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

      `)
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
// ACTIVATE ACCOUNT
// =====================================================

$("activate")?.addEventListener(
  "click",
  async () => {

    if(!currentUser){

      showPage(
        "auth"
      );

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

        showPage(
          "dashboard"
        );

      },
      500
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
// TRADINGVIEW
// =====================================================

function loadTradingViewChart(){

  const container =
    $("tradingview-widget");


  if(!container){

    return;

  }


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

      autosize:
        true,

      symbol:
        "FX:EURUSD",

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


// =====================================================
// SUPABASE EDGE FUNCTION
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

        method:
          "POST",

        headers:{

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
// MARKET PRICE UPDATE
// =====================================================

async function updateMarketPrice(){

  const symbol =
    $("symbol")
      ?.value ||
    "EUR/USD";


  const priceEl =
    $("market-price");


  const changeEl =
    $("market-change");


  const statusEl =
    $("market-status");


  try{

    const data =
      await getMarketPrice(
        symbol
      );


    const price =
      Number(
        data.price
      );


    const change =
      Number(
        data.percentChange ||
        0
      );


    if(priceEl){

      priceEl.textContent =
        price.toFixed(5);

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
        price.toFixed(5);

    }


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
        Number(
          data.price
        ).toFixed(5);

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

  loadTradingViewChart();

  updateMarketPrice();

  renderHistory();


  if(marketTimer){

    clearInterval(
      marketTimer
    );

  }


  marketTimer =
    setInterval(
      updateMarketPrice,
      60000
    );

}


// =====================================================
// SYMBOL CHANGE
// =====================================================

$("symbol")?.addEventListener(
  "change",
  () => {

    updateMarketPrice();

  }
);


// =====================================================
// VIRTUAL TRADE
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


  const simulatedPnl =
    Number(
      $("trade-pnl")
        ?.value
    );


  const symbol =
    $("symbol")
      ?.value ||
    "EUR/USD";


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


  if(
    !Number.isFinite(
      simulatedPnl
    )
  ){

    setMessage(
      "trade-msg",
      "Enter a valid simulated P&L."
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
        symbol
      );

  }catch(error){

    setMessage(
      "trade-msg",
      "Market data unavailable. Try again."
    );

    return;

  }


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

      Number(
        market.price
      ),

    pnl:

      simulatedPnl,

    time:

      new Date()
        .toISOString()

  };


  trades.unshift(
    trade
  );


  currentAccount.pnl +=
    simulatedPnl;


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

  renderHistory();


  setMessage(
    "trade-msg",

    `${side} ${symbol} order executed virtually at ${Number(
      market.price
    ).toFixed(5)}.`,

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
// TRADE HISTORY
// =====================================================

function renderHistory(){

  const history =
    $("history");


  if(!history){

    return;

  }


  if(!trades.length){

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
        trade => `

          <div class="trade-row">

            <span>
              ${trade.side}
            </span>

            <span>
              ${trade.symbol}
            </span>

            <span>
              ${Number(
                trade.entry
              ).toFixed(5)}
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
// CHECK SESSION
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
