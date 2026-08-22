// =====================================================
// 007 LIVE CUSTOM CHART
// =====================================================


// =====================================================
// CONFIG
// =====================================================

const SUPABASE_FUNCTION =
  "clever-function";

const DEFAULT_SYMBOL =
  "EUR/USD";

const DEFAULT_INTERVAL =
  "5min";


// =====================================================
// ELEMENTS
// =====================================================

const chartScreen =
  document.getElementById(
    "chart-screen"
  );

const chartElement =
  document.getElementById(
    "chart"
  );

const symbolSelect =
  document.getElementById(
    "symbol"
  );

const marketSymbol =
  document.getElementById(
    "market-symbol"
  );

const marketStatus =
  document.getElementById(
    "market-status"
  );

const currentSymbolElement =
  document.getElementById(
    "chart-current-symbol"
  );

const chartMessage =
  document.getElementById(
    "chart-message"
  );

const fullscreenButton =
  document.getElementById(
    "chart-fullscreen"
  );

const pineButton =
  document.getElementById(
    "pine-editor"
  );

const pinePanel =
  document.getElementById(
    "pine-panel"
  );

const pineClose =
  document.getElementById(
    "pine-close"
  );

const pineCode =
  document.getElementById(
    "pine-code"
  );

const pineRun =
  document.getElementById(
    "pine-run"
  );

const pineClear =
  document.getElementById(
    "pine-clear"
  );

const pineStatus =
  document.getElementById(
    "pine-status"
  );


// =====================================================
// STATE
// =====================================================

let chart = null;

let candleSeries = null;

let candles = [];

let currentSymbol =
  DEFAULT_SYMBOL;

let indicatorLines = [];

let currentMarkers = [];

let refreshTimer = null;


// =====================================================
// STORAGE
// =====================================================

const SCRIPT_KEY =
  "007_pine_script";

const SYMBOL_KEY =
  "007_chart_symbol";


// =====================================================
// SYMBOL STORAGE
// =====================================================

function loadSavedSymbol(){

  return (
    localStorage.getItem(
      SYMBOL_KEY
    ) ||
    DEFAULT_SYMBOL
  );

}


function saveSymbol(
  symbol
){

  localStorage.setItem(
    SYMBOL_KEY,
    symbol
  );

}


// =====================================================
// SCRIPT STORAGE
// =====================================================

function loadSavedScript(){

  const saved =
    localStorage.getItem(
      SCRIPT_KEY
    );

  if(saved !== null){

    pineCode.value =
      saved;

  }

}


function saveScript(){

  localStorage.setItem(
    SCRIPT_KEY,
    pineCode.value
  );

}


// =====================================================
// CHART CREATE
// =====================================================

function createChart(){

  if(
    !chartElement
  ){

    throw new Error(
      "Chart element missing"
    );

  }


  if(
    typeof LightweightCharts ===
    "undefined"
  ){

    throw new Error(
      "Chart library failed to load"
    );

  }


  chart =
    LightweightCharts.createChart(
      chartElement,
      {

        layout:{
          background:{
            color:"#090b10"
          },

          textColor:"#8e98a8"
        },


        grid:{
          vertLines:{
            color:"#151b24"
          },

          horzLines:{
            color:"#151b24"
          }
        },


        rightPriceScale:{
          borderColor:"#242b36"
        },


        timeScale:{
          borderColor:"#242b36",

          timeVisible:true,

          secondsVisible:false
        },


        crosshair:{
          mode:
            LightweightCharts
              .CrosshairMode
              .Normal
        },


        handleScroll:{
          mouseWheel:true,

          pressedMouseMove:true,

          horzTouchDrag:true,

          vertTouchDrag:true
        },


        handleScale:{
          mouseWheel:true,

          pinch:true,

          axisPressedMouseMove:true
        }

      }
    );


  candleSeries =
    chart.addCandlestickSeries({

      upColor:
        "#63d29a",

      downColor:
        "#ff6b7a",

      borderUpColor:
        "#63d29a",

      borderDownColor:
        "#ff6b7a",

      wickUpColor:
        "#63d29a",

      wickDownColor:
        "#ff6b7a"

    });


  const observer =
    new ResizeObserver(
      () => {

        resizeChart();

      }
    );


  observer.observe(
    chartElement
  );

}


// =====================================================
// RESIZE
// =====================================================

function resizeChart(){

  if(
    !chart ||
    !chartElement
  ){

    return;

  }


  const width =
    chartElement.clientWidth;

  const height =
    chartElement.clientHeight;


  if(
    width <= 0 ||
    height <= 0
  ){

    return;

  }


  chart.resize(
    width,
    height
  );

}


// =====================================================
// MARKET API
// =====================================================

async function getCandles(
  symbol
){

  if(
    typeof SUPABASE_URL ===
    "undefined"
  ){

    throw new Error(
      "SUPABASE_URL missing"
    );

  }


  if(
    typeof SUPABASE_PUBLISHABLE_KEY ===
    "undefined"
  ){

    throw new Error(
      "SUPABASE_PUBLISHABLE_KEY missing"
    );

  }


  const endpoint =
    `${SUPABASE_URL}/functions/v1/${SUPABASE_FUNCTION}`;


  const url =
    `${endpoint}?symbol=${encodeURIComponent(symbol)}` +
    `&interval=${encodeURIComponent(DEFAULT_INTERVAL)}` +
    `&outputsize=300`;


  const response =
    await fetch(
      url,
      {

        method:
          "GET",

        headers:{

          "apikey":
            SUPABASE_PUBLISHABLE_KEY,

          "Authorization":
            `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,

          "Content-Type":
            "application/json"

        },

        cache:
          "no-store"

      }
    );


  const text =
    await response.text();


  let data;


  try{

    data =
      JSON.parse(
        text
      );

  }catch{

    throw new Error(
      `Invalid Supabase response (${response.status})`
    );

  }


  if(
    !response.ok
  ){

    throw new Error(
      data?.error ||
      data?.message ||
      `Market request failed (${response.status})`
    );

  }


  if(
    data.success === false
  ){

    throw new Error(
      data.error ||
      "Market data request failed"
    );

  }


  if(
    !Array.isArray(
      data.candles
    )
  ){

    throw new Error(
      "No candles received from Supabase"
    );

  }


  return data;

}


// =====================================================
// NORMALIZE CANDLES
// =====================================================

function normalizeCandles(
  rows
){

  return rows

    .map(
      row => {

        let time =
          Number(
            row.timestamp
          );


        if(
          !Number.isFinite(
            time
          )
        ){

          time =
            Math.floor(
              new Date(
                row.datetime
              ).getTime() /
              1000
            );

        }


        if(
          time > 10000000000
        ){

          time =
            Math.floor(
              time / 1000
            );

        }


        return {

          time,

          open:
            Number(
              row.open
            ),

          high:
            Number(
              row.high
            ),

          low:
            Number(
              row.low
            ),

          close:
            Number(
              row.close
            )

        };

      }
    )

    .filter(
      candle =>

        Number.isFinite(
          candle.time
        ) &&

        Number.isFinite(
          candle.open
        ) &&

        Number.isFinite(
          candle.high
        ) &&

        Number.isFinite(
          candle.low
        ) &&

        Number.isFinite(
          candle.close
        )

    )

    .sort(
      (
        a,
        b
      ) =>
        a.time -
        b.time
    );

}


// =====================================================
// LOAD MARKET
// =====================================================

async function loadMarket(){

  showMessage(
    "Loading market data..."
  );


  setMarketStatus(
    "● CONNECTING",
    true
  );


  try{

    const data =
      await getCandles(
        currentSymbol
      );


    const normalized =
      normalizeCandles(
        data.candles
      );


    if(
      normalized.length ===
      0
    ){

      throw new Error(
        "No valid candles received"
      );

    }


    candles =
      normalized;


    candleSeries.setData(
      candles
    );


    updateSymbolUI(
      currentSymbol
    );


    hideMessage();


    chart.timeScale()
      .fitContent();


    applyIndicatorScript();


  }catch(error){

    console.error(
      "LOAD MARKET ERROR:",
      error
    );


    setMarketStatus(
      "● ERROR",
      false
    );


    showMessage(
      error.message ||
      "Market data failed"
    );

  }

}


// =====================================================
// REFRESH
// =====================================================

async function refreshMarket(){

  try{

    const data =
      await getCandles(
        currentSymbol
      );


    const normalized =
      normalizeCandles(
        data.candles
      );


    if(
      normalized.length ===
      0
    ){

      return;

    }


    candles =
      normalized;


    candleSeries.setData(
      candles
    );


    setMarketStatus(
      "● LIVE",
      true
    );


    hideMessage();


    applyIndicatorScript();


  }catch(error){

    console.error(
      "REFRESH ERROR:",
      error
    );


    setMarketStatus(
      "● DATA ERROR",
      false
    );

  }

}


// =====================================================
// UI
// =====================================================

function updateSymbolUI(
  symbol
){

  if(
    marketSymbol
  ){

    marketSymbol.textContent =
      symbol;

  }


  if(
    currentSymbolElement
  ){

    currentSymbolElement.textContent =
      symbol;

  }


  setMarketStatus(
    "● LIVE",
    true
  );

}


function setMarketStatus(
  text,
  live
){

  if(
    !marketStatus
  ){

    return;

  }


  marketStatus.textContent =
    text;


  marketStatus.style.color =
    live
      ? "var(--green)"
      : "var(--red)";

}


function showMessage(
  text
){

  if(
    !chartMessage
  ){

    return;

  }


  chartMessage.textContent =
    text;


  chartMessage.classList.remove(
    "hidden"
  );

}


function hideMessage(){

  chartMessage?.classList.add(
    "hidden"
  );

}


// =====================================================
// MATH
// =====================================================

function sma(
  values,
  length
){

  const result =
    new Array(
      values.length
    ).fill(
      null
    );


  if(
    length <= 0
  ){

    return result;

  }


  for(
    let i =
      length - 1;

    i <
      values.length;

    i++
  ){

    let sum =
      0;

    let valid =
      true;


    for(
      let j =
        i - length + 1;

      j <= i;

      j++
    ){

      if(
        values[j] ===
          null ||
        values[j] ===
          undefined
      ){

        valid =
          false;

        break;

      }


      sum +=
        Number(
          values[j]
        );

    }


    if(valid){

      result[i] =
        sum /
        length;

    }

  }


  return result;

}


// =====================================================
// EMA
// =====================================================

function ema(
  values,
  length
){

  const result =
    new Array(
      values.length
    ).fill(
      null
    );


  if(
    values.length <
    length
  ){

    return result;

  }


  let sum =
    0;


  for(
    let i =
      0;

    i <
      length;

    i++
  ){

    sum +=
      Number(
        values[i]
      );

  }


  let previous =
    sum /
    length;


  result[
    length - 1
  ] =
    previous;


  const multiplier =
    2 /
    (
      length +
      1
    );


  for(
    let i =
      length;

    i <
      values.length;

    i++
  ){

    previous =
      (
        values[i] -
        previous
      ) *
      multiplier +
      previous;


    result[i] =
      previous;

  }


  return result;

}


// =====================================================
// RSI
// =====================================================

function rsi(
  values,
  length
){

  const result =
    new Array(
      values.length
    ).fill(
      null
    );


  if(
    values.length <=
    length
  ){

    return result;

  }


  let gains =
    0;

  let losses =
    0;


  for(
    let i =
      1;

    i <= length;

    i++
  ){

    const change =
      values[i] -
      values[i - 1];


    if(
      change >= 0
    ){

      gains +=
        change;

    }else{

      losses +=
        Math.abs(
          change
        );

    }

  }


  let avgGain =
    gains /
    length;

  let avgLoss =
    losses /
    length;


  result[length] =
    avgLoss === 0
      ? 100
      : 100 -
        (
          100 /
          (
            1 +
            avgGain /
            avgLoss
          )
        );


  for(
    let i =
      length + 1;

    i <
      values.length;

    i++
  ){

    const change =
      values[i] -
      values[i - 1];


    const gain =
      Math.max(
        change,
        0
      );


    const loss =
      Math.max(
        -change,
        0
      );


    avgGain =
      (
        (
          avgGain *
          (
            length - 1
          )
        ) +
        gain
      ) /
      length;


    avgLoss =
      (
        (
          avgLoss *
          (
            length - 1
          )
        ) +
        loss
      ) /
      length;


    result[i] =
      avgLoss === 0
        ? 100
        : 100 -
          (
            100 /
            (
              1 +
              avgGain /
              avgLoss
            )
          );

  }


  return result;

}


// =====================================================
// CROSSOVER
// =====================================================

function crossover(
  a,
  b
){

  const result =
    new Array(
      a.length
    ).fill(
      false
    );


  for(
    let i =
      1;

    i <
      a.length;

    i++
  ){

    if(
      a[i] === null ||
      b[i] === null ||
      a[i - 1] === null ||
      b[i - 1] === null
    ){

      continue;

    }


    result[i] =
      a[i] >
      b[i] &&
      a[i - 1] <=
      b[i - 1];

  }


  return result;

}


// =====================================================
// CROSSUNDER
// =====================================================

function crossunder(
  a,
  b
){

  const result =
    new Array(
      a.length
    ).fill(
      false
    );


  for(
    let i =
      1;

    i <
      a.length;

    i++
  ){

    if(
      a[i] === null ||
      b[i] === null ||
      a[i - 1] === null ||
      b[i - 1] === null
    ){

      continue;

    }


    result[i] =
      a[i] <
      b[i] &&
      a[i - 1] >=
      b[i - 1];

  }


  return result;

}


// =====================================================
// PARSER HELPERS
// =====================================================

function getSeries(
  name,
  context
){

  if(
    context.vars[name] !==
    undefined
  ){

    return context.vars[name];

  }


  if(
    context[name] !==
    undefined
  ){

    return context[name];

  }


  throw new Error(
    `Unknown variable: ${name}`
  );

}


// =====================================================
// EXPRESSION
// =====================================================

function evaluateExpression(
  expression,
  context
){

  let expr =
    expression
      .trim()
      .replace(
        /\/\/.*$/g,
        ""
      )
      .trim();


  if(
    expr ===
    "close"
  ){

    return context.close;

  }


  if(
    expr ===
    "open"
  ){

    return context.open;

  }


  if(
    expr ===
    "high"
  ){

    return context.high;

  }


  if(
    expr ===
    "low"
  ){

    return context.low;

  }


  let match =
    expr.match(
      /^ta\.(sma|ema|rsi)\s*\(\s*([a-zA-Z_]\w*)\s*,\s*(\d+)\s*\)$/
    );


  if(match){

    const fn =
      match[1];

    const source =
      getSeries(
        match[2],
        context
      );


    const length =
      Number(
        match[3]
      );


    if(
      fn ===
      "sma"
    ){

      return sma(
        source,
        length
      );

    }


    if(
      fn ===
      "ema"
    ){

      return ema(
        source,
        length
      );

    }


    if(
      fn ===
      "rsi"
    ){

      return rsi(
        source,
        length
      );

    }

  }


  match =
    expr.match(
      /^ta\.(crossover|crossunder)\s*\(\s*([a-zA-Z_]\w*)\s*,\s*([a-zA-Z_]\w*)\s*\)$/
    );


  if(match){

    const a =
      getSeries(
        match[2],
        context
      );

    const b =
      getSeries(
        match[3],
        context
      );


    return match[1] ===
      "crossover"

      ? crossover(
          a,
          b
        )

      : crossunder(
          a,
          b
        );

  }


  if(
    /^[-+]?\d*\.?\d+$/.test(
      expr
    )
  ){

    return Number(
      expr
    );

  }


  if(
    context.vars[expr] !==
    undefined
  ){

    return context.vars[
      expr
    ];

  }


  throw new Error(
    `Unsupported expression: ${expr}`
  );

}


// =====================================================
// CLEAR INDICATORS
// =====================================================

function clearIndicators(){

  if(
    !chart
  ){

    return;

  }


  for(
    const series of
      indicatorLines
  ){

    try{

      chart.removeSeries(
        series
      );

    }catch{}

  }


  indicatorLines =
    [];


  currentMarkers =
    [];


  if(
    candleSeries
  ){

    candleSeries.setMarkers(
      []
    );

  }

}


// =====================================================
// ADD LINE
// =====================================================

function addIndicatorLine(
  values,
  color
){

  const line =
    chart.addLineSeries({

      color:
        color ||
        "#7c8cff",

      lineWidth:
        2,

      priceLineVisible:
        false,

      lastValueVisible:
        true

    });


  const data =
    [];


  for(
    let i =
      0;

    i <
      candles.length;

    i++
  ){

    const value =
      values[i];


    if(
      value ===
        null ||
      value ===
        undefined ||
      !Number.isFinite(
        Number(value)
      )
    ){

      continue;

    }


    data.push({

      time:
        candles[i].time,

      value:
        Number(value)

    });

  }


  line.setData(
    data
  );


  indicatorLines.push(
    line
  );

}


// =====================================================
// ADD SIGNALS
// =====================================================

function addSignalMarkers(
  values,
  type
){

  for(
    let i =
      0;

    i <
      values.length;

    i++
  ){

    if(
      values[i] !==
      true
    ){

      continue;

    }


    if(
      !candles[i]
    ){

      continue;

    }


    currentMarkers.push({

      time:
        candles[i].time,

      position:
        type === "buy"
          ? "belowBar"
          : "aboveBar",

      color:
        type === "buy"
          ? "#63d29a"
          : "#ff6b7a",

      shape:
        type === "buy"
          ? "arrowUp"
          : "arrowDown",

      text:
        type === "buy"
          ? "BUY"
          : "SELL"

    });

  }


  currentMarkers.sort(
    (
      a,
      b
    ) =>
      a.time -
      b.time
  );


  candleSeries.setMarkers(
    currentMarkers
  );

}


// =====================================================
// PINE SCRIPT ENGINE
// =====================================================

function applyIndicatorScript(){

  if(
    !candles.length ||
    !candleSeries
  ){

    return;

  }


  clearIndicators();


  const code =
    pineCode.value.trim();


  if(
    !code
  ){

    setPineStatus(
      "Script is empty.",
      false
    );

    return;

  }


  saveScript();


  try{

    const close =
      candles.map(
        candle =>
          candle.close
      );


    const open =
      candles.map(
        candle =>
          candle.open
      );


    const high =
      candles.map(
        candle =>
          candle.high
      );


    const low =
      candles.map(
        candle =>
          candle.low
      );


    const context = {

      close,

      open,

      high,

      low,

      vars:{

        close,

        open,

        high,

        low

      }

    };


    const lines =
      code.split(
        "\n"
      );


    for(
      const originalLine
      of lines
    ){

      const line =
        originalLine
          .trim();


      if(
        !line
      ){

        continue;

      }


      if(
        line.startsWith(
          "//"
        )
      ){

        continue;

      }


      if(
        line.startsWith(
          "indicator("
        )
      ){

        continue;

      }


      if(
        line.startsWith(
          "strategy("
        )
      ){

        continue;

      }


      if(
        line.startsWith(
          "@version"
        )
      ){

        continue;

      }


      const plotShapeMatch =
        line.match(
          /^plotshape\s*\(\s*([a-zA-Z_]\w*)/
        );


      if(
        plotShapeMatch
      ){

        const values =
          getSeries(
            plotShapeMatch[1],
            context
          );


        if(
          !Array.isArray(
            values
          )
        ){

          throw new Error(
            "plotshape requires a condition"
          );

        }


        const type =
          /crossunder|sell/i.test(
            line
          )
            ? "sell"
            : "buy";


        addSignalMarkers(
          values,
          type
        );


        continue;

      }


      const plotMatch =
        line.match(
          /^plot\s*\(\s*(.+?)\s*(?:,.*)?\)$/
        );


      if(
        plotMatch
      ){

        const values =
          evaluateExpression(
            plotMatch[1],
            context
          );


        if(
          !Array.isArray(
            values
          )
        ){

          throw new Error(
            "plot requires a series"
          );

        }


        addIndicatorLine(
          values
        );


        continue;

      }


      const assignment =
        line.match(
          /^([a-zA-Z_]\w*)\s*=\s*(.+)$/
        );


      if(
        assignment
      ){

        const variable =
          assignment[1];

        const expression =
          assignment[2];


        const value =
          evaluateExpression(
            expression,
            context
          );


        context.vars[
          variable
        ] =
          value;


        continue;

      }


      throw new Error(
        `Unsupported Pine line: ${line}`
      );

    }


    setPineStatus(
      "Indicator applied successfully.",
      true
    );


  }catch(error){

    console.error(
      "Pine error:",
      error
    );


    clearIndicators();


    setPineStatus(
      error.message ||
      "Pine compilation error.",
      false
    );

  }

}


// =====================================================
// PINE UI
// =====================================================

pineButton?.addEventListener(
  "click",
  () => {

    pinePanel.classList.add(
      "open"
    );


    pinePanel.setAttribute(
      "aria-hidden",
      "false"
    );

  }
);


pineClose?.addEventListener(
  "click",
  () => {

    pinePanel.classList.remove(
      "open"
    );


    pinePanel.setAttribute(
      "aria-hidden",
      "true"
    );

  }
);


pineRun?.addEventListener(
  "click",
  () => {

    saveScript();

    applyIndicatorScript();

  }
);


pineClear?.addEventListener(
  "click",
  () => {

    pineCode.value =
      "";

    saveScript();

    clearIndicators();


    setPineStatus(
      "Script cleared.",
      true
    );

  }
);


pineCode?.addEventListener(
  "input",
  () => {

    saveScript();

  }
);


// =====================================================
// SYMBOL CHANGE
// =====================================================

symbolSelect?.addEventListener(
  "change",
  async () => {

    currentSymbol =
      symbolSelect.value;


    saveSymbol(
      currentSymbol
    );


    updateSymbolUI(
      currentSymbol
    );


    await loadMarket();

  }
);


// =====================================================
// FULLSCREEN
// =====================================================

async function enterFullscreen(){

  if(
    !chartScreen
  ){

    return;

  }


  try{

    if(
      chartScreen.requestFullscreen
    ){

      await chartScreen.requestFullscreen();

    }else if(
      chartScreen.webkitRequestFullscreen
    ){

      chartScreen.webkitRequestFullscreen();

    }


    if(
      screen.orientation &&
      screen.orientation.lock
    ){

      try{

        await screen.orientation.lock(
          "landscape"
        );

      }catch(
        error
      ){

        console.log(
          "Landscape lock unavailable:",
          error
        );

      }

    }


    setTimeout(
      resizeChart,
      250
    );


  }catch(error){

    console.error(
      "Fullscreen error:",
      error
    );

  }

}


async function exitFullscreen(){

  try{

    if(
      document.fullscreenElement
    ){

      await document.exitFullscreen();

    }else if(
      document.webkitFullscreenElement
    ){

      document.webkitExitFullscreen();

    }


    if(
      screen.orientation &&
      screen.orientation.unlock
    ){

      try{

        screen.orientation.unlock();

      }catch{}

    }


    setTimeout(
      resizeChart,
      250
    );


  }catch(error){

    console.error(
      "Exit fullscreen:",
      error
    );

  }

}


fullscreenButton?.addEventListener(
  "click",
  async () => {

    const fullscreen =
      Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement
      );


    if(
      fullscreen
    ){

      await exitFullscreen();

    }else{

      await enterFullscreen();

    }

  }
);


document.addEventListener(
  "fullscreenchange",
  () => {

    setTimeout(
      resizeChart,
      250
    );

  }
);


// =====================================================
// INITIAL SYMBOL
// =====================================================

function initializeSymbol(){

  const saved =
    loadSavedSymbol();


  const valid =
    Array.from(
      symbolSelect.options
    ).some(
      option =>
        option.value ===
        saved
    );


  if(
    valid
  ){

    symbolSelect.value =
      saved;

  }else{

    symbolSelect.value =
      DEFAULT_SYMBOL;

  }


  currentSymbol =
    symbolSelect.value;

}


// =====================================================
// START
// =====================================================

async function start(){

  try{

    initializeSymbol();

    loadSavedScript();

    createChart();

    updateSymbolUI(
      currentSymbol
    );


    await loadMarket();


    if(
      refreshTimer
    ){

      clearInterval(
        refreshTimer
      );

    }


    refreshTimer =
      setInterval(
        refreshMarket,
        30000
      );


  }catch(error){

    console.error(
      "START ERROR:",
      error
    );


    showMessage(
      error.message ||
      "Application failed to start"
    );

  }

}


start();
