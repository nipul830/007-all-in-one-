// =====================================================
// 007 CUSTOM LIVE CHART
// INDEPENDENT PINE-COMPATIBLE INDICATOR ENGINE
// =====================================================


// =====================================================
// CONFIG
// =====================================================

const SUPABASE_URL =
  "https://gwvhuegpkziujcyqzcra.supabase.co";

const SUPABASE_FUNCTION =
  "clever-function";

const DEFAULT_SYMBOL =
  "EUR/USD";

const DEFAULT_INTERVAL =
  "5min";


// =====================================================
// ELEMENTS
// =====================================================

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

const currentSymbol =
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

let signalMarkers = [];

let currentScript = "";

let refreshTimer = null;


// =====================================================
// LOCAL STORAGE
// =====================================================

const SCRIPT_KEY =
  "007_pine_script";

const SYMBOL_KEY =
  "007_chart_symbol";


// =====================================================
// SYMBOL HELPERS
// =====================================================

function getSavedSymbol(){

  return (
    localStorage.getItem(
      SYMBOL_KEY
    ) ||
    DEFAULT_SYMBOL
  );

}

function saveSymbol(symbol){

  localStorage.setItem(
    SYMBOL_KEY,
    symbol
  );

}


// =====================================================
// PINE SCRIPT STORAGE
// =====================================================

function loadSavedScript(){

  const saved =
    localStorage.getItem(
      SCRIPT_KEY
    );

  if(saved){

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
// CHART INITIALIZE
// =====================================================

function createChart(){

  if(
    !chartElement ||
    typeof LightweightCharts ===
      "undefined"
  ){

    return;

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
            LightweightCharts.CrosshairMode
              .Normal
        },

        handleScroll:{
          mouseWheel:true,

          pressedMouseMove:true
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

      upColor:"#63d29a",

      downColor:"#ff6b7a",

      borderUpColor:"#63d29a",

      borderDownColor:"#ff6b7a",

      wickUpColor:"#63d29a",

      wickDownColor:"#ff6b7a"

    });


  new ResizeObserver(
    () => {

      resizeChart();

    }
  ).observe(
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


  chart.resize(
    chartElement.clientWidth,
    chartElement.clientHeight
  );

}


// =====================================================
// MARKET API
// =====================================================

async function getCandles(
  symbol
){

  const endpoint =
    `${SUPABASE_URL}/functions/v1/${SUPABASE_FUNCTION}`;

  const url =
    `${endpoint}?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(DEFAULT_INTERVAL)}&outputsize=300`;


  const response =
    await fetch(
      url,
      {
        method:"GET",

        headers:{
          "Content-Type":
            "application/json"
        },

        cache:"no-store"
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
// NORMALIZE CANDLES
// =====================================================

function normalizeCandles(
  rows
){

  return rows
    .map(
      row => {

        const timestamp =
          Number(
            row.timestamp
          );

        return {

          time:
            timestamp > 10000000000
              ? Math.floor(
                  timestamp / 1000
                )
              : timestamp,

          open:
            Number(row.open),

          high:
            Number(row.high),

          low:
            Number(row.low),

          close:
            Number(row.close)

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
      (a,b) =>
        a.time -
        b.time
    );

}


// =====================================================
// LOAD MARKET
// =====================================================

async function loadMarket(){

  if(!candleSeries){

    return;

  }


  showMessage(
    "Loading market data..."
  );


  try{

    const data =
      await getCandles(
        currentSymbol
      );


    candles =
      normalizeCandles(
        data.values ||
        data.candles ||
        []
      );


    if(!candles.length){

      throw new Error(
        "No candle data returned"
      );

    }


    candleSeries.setData(
      candles
    );


    updateSymbolUI(
      currentSymbol
    );


    hideMessage();


    applyIndicatorScript();


    chart.timeScale()
      .fitContent();


  }catch(error){

    console.error(
      error
    );


    showMessage(
      error.message ||
      "Market data unavailable"
    );


    setMarketStatus(
      "● OFFLINE",
      false
    );

  }

}


// =====================================================
// UPDATE LIVE CANDLE
// =====================================================

async function refreshMarket(){

  try{

    const data =
      await getCandles(
        currentSymbol
      );


    const latest =
      normalizeCandles(
        data.values ||
        data.candles ||
        []
      );


    if(!latest.length){

      return;

    }


    candles =
      latest;


    candleSeries.setData(
      candles
    );


    setMarketStatus(
      "● LIVE",
      true
    );


    applyIndicatorScript();


  }catch(error){

    console.error(
      "Refresh:",
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

  if(marketSymbol){

    marketSymbol.textContent =
      symbol;

  }


  if(currentSymbol){

    currentSymbol.textContent =
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

  if(!marketStatus){

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

  if(!chartMessage){

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
// INDICATOR MATH
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


  for(
    let i = length - 1;
    i < values.length;
    i++
  ){

    let sum = 0;

    let valid = true;


    for(
      let j = i - length + 1;
      j <= i;
      j++
    ){

      if(
        values[j] === null ||
        values[j] === undefined
      ){

        valid = false;

        break;

      }


      sum +=
        Number(
          values[j]
        );

    }


    if(valid){

      result[i] =
        sum / length;

    }

  }


  return result;

}


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


  let sum = 0;


  for(
    let i = 0;
    i < length;
    i++
  ){

    sum +=
      Number(
        values[i]
      );

  }


  let previous =
    sum / length;


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
    let i = length;
    i < values.length;
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


  let gains = 0;

  let losses = 0;


  for(
    let i = 1;
    i <= length;
    i++
  ){

    const change =
      values[i] -
      values[i - 1];


    if(change >= 0){

      gains += change;

    }else{

      losses +=
        Math.abs(
          change
        );

    }

  }


  let avgGain =
    gains / length;

  let avgLoss =
    losses / length;


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
    let i = length + 1;
    i < values.length;
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
    let i = 1;
    i < a.length;
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
    let i = 1;
    i < a.length;
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
// PINE PARSER
// =====================================================

function parseNumber(
  value
){

  const n =
    Number(
      value
    );

  if(
    !Number.isFinite(n)
  ){

    throw new Error(
      `Invalid number: ${value}`
    );

  }

  return n;

}


function evaluateExpression(
  expression,
  context
){

  let expr =
    expression
      .trim()
      .replace(
        /\/\/.*$/gm,
        ""
      );


  expr =
    expr.replace(
      /\btrue\b/g,
      "true"
    );


  expr =
    expr.replace(
      /\bfalse\b/g,
      "false"
    );


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
      /^ta\.(sma|ema|rsi)\s*\(\s*([a-zA-Z_][\w]*)\s*,\s*(\d+)\s*\)$/
    );


  if(match){

    const fn =
      match[1];

    const sourceName =
      match[2];

    const length =
      parseInt(
        match[3],
        10
      );


    const source =
      context.vars[
        sourceName
      ] ||
      context[sourceName];


    if(!source){

      throw new Error(
        `Unknown source: ${sourceName}`
      );

    }


    if(fn === "sma"){

      return sma(
        source,
        length
      );

    }


    if(fn === "ema"){

      return ema(
        source,
        length
      );

    }


    if(fn === "rsi"){

      return rsi(
        source,
        length
      );

    }

  }


  match =
    expr.match(
      /^ta\.(crossover|crossunder)\s*\(\s*([a-zA-Z_][\w]*)\s*,\s*([a-zA-Z_][\w]*)\s*\)$/
    );


  if(match){

    const fn =
      match[1];

    const a =
      context.vars[
        match[2]
      ];

    const b =
      context.vars[
        match[3]
      ];


    if(!a || !b){

      throw new Error(
        "Unknown crossover variable"
      );

    }


    return fn ===
      "crossover"
      ? crossover(a,b)
      : crossunder(a,b);

  }


  if(
    /^[-+]?\d*\.?\d+$/.test(
      expr
    )
  ){

    return parseNumber(
      expr
    );

  }


  if(
    context.vars[
      expr
    ] !== undefined
  ){

    return context.vars[
      expr
    ];

  }


  return evaluateCondition(
    expr,
    context
  );

}


function evaluateCondition(
  expression,
  context
){

  const operators =
    [
      ">=",
      "<=",
      "==",
      "!=",
      ">",
      "<"
    ];


  for(
    const operator of operators
  ){

    const index =
      expression.indexOf(
        operator
      );


    if(index === -1){

      continue;

    }


    const left =
      expression
        .slice(
          0,
          index
        )
        .trim();


    const right =
      expression
        .slice(
          index +
          operator.length
        )
        .trim();


    const leftValue =
      evaluateExpression(
        left,
        context
      );


    const rightValue =
      evaluateExpression(
        right,
        context
      );


    const result =
      new Array(
        candles.length
      ).fill(
        false
      );


    for(
      let i = 0;
      i < candles.length;
      i++
    ){

      const a =
        Array.isArray(
          leftValue
        )
          ? leftValue[i]
          : leftValue;

      const b =
        Array.isArray(
          rightValue
        )
          ? rightValue[i]
          : rightValue;


      if(
        a === null ||
        b === null
      ){

        continue;

      }


      if(operator === ">")
        result[i] = a > b;

      if(operator === "<")
        result[i] = a < b;

      if(operator === ">=")
        result[i] = a >= b;

      if(operator === "<=")
        result[i] = a <= b;

      if(operator === "==")
        result[i] = a === b;

      if(operator === "!=")
        result[i] = a !== b;

    }


    return result;

  }


  throw new Error(
    `Unsupported expression: ${expression}`
  );

}


// =====================================================
// INDICATOR ENGINE
// =====================================================

function clearIndicators(){

  for(
    const series of indicatorLines
  ){

    try{

      chart.removeSeries(
        series
      );

    }catch{}

  }


  indicatorLines =
    [];

  signalMarkers =
    [];

}


function addIndicatorLine(
  values
){

  const line =
    chart.addLineSeries({

      color:"#7c8cff",

      lineWidth:2,

      priceLineVisible:false,

      lastValueVisible:true

    });


  const data = [];


  for(
    let i = 0;
    i < candles.length;
    i++
  ){

    if(
      values[i] === null ||
      values[i] === undefined ||
      !Number.isFinite(
        Number(values[i])
      )
    ){

      continue;

    }


    data.push({

      time:
        candles[i].time,

      value:
        Number(
          values[i]
        )

    });

  }


  line.setData(
    data
  );


  indicatorLines.push(
    line
  );

}


function addSignalMarkers(
  values,
  type
){

  for(
    let i = 0;
    i < values.length;
    i++
  ){

    if(
      !values[i]
    ){

      continue;

    }


    const candle =
      candles[i];


    if(!candle){

      continue;

    }


    signalMarkers.push({

      time:
        candle.time,

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


  candleSeries.setMarkers(
    signalMarkers
  );

}


function applyIndicatorScript(){

  if(
    !candles.length ||
    !candleSeries
  ){

    return;

  }


  clearIndicators();


  candleSeries.setMarkers(
    []
  );


  const code =
    pineCode.value.trim();


  if(!code){

    setPineStatus(
      "No script.",
      false
    );

    return;

  }


  currentScript =
    code;


  saveScript();


  try{

    const close =
      candles.map(
        c => c.close
      );

    const open =
      candles.map(
        c => c.open
      );

    const high =
      candles.map(
        c => c.high
      );

    const low =
      candles.map(
        c => c.low
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
      let rawLine of lines
    ){

      let line =
        rawLine
          .trim();


      if(
        !line ||
        line.startsWith(
          "//"
        ) ||
        line.startsWith(
          "//@"
        ) ||
        line.startsWith(
          "indicator("
        ) ||
        line.startsWith(
          "strategy("
        )
      ){

        continue;

      }


      const assignment =
        line.match(
          /^([a-zA-Z_]\w*)\s*=\s*(.+)$/
        );


      if(assignment){

        const variable =
          assignment[1];

        const expression =
          assignment[2]
            .trim();


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


      const plot =
        line.match(
          /^plot\s*\(\s*([a-zA-Z_]\w*)\s*\)/
        );


      if(plot){

        const values =
          context.vars[
            plot[1]
          ];


        if(!Array.isArray(values)){

          throw new Error(
            `plot(): ${plot[1]} is not a series`
          );

        }


        addIndicatorLine(
          values
        );


        continue;

      }


      const shape =
        line.match(
          /^plotshape\s*\(\s*([a-zA-Z_]\w*)/
        );


      if(shape){

        const values =
          context.vars[
            shape[1]
          ];


        if(!Array.isArray(values)){

          throw new Error(
            `plotshape(): ${shape[1]} is not a condition`
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


      if(
        line.startsWith(
          "plot("
        )
      ){

        const inside =
          line.slice(
            5,
            -1
          );


        const values =
          evaluateExpression(
            inside,
            context
          );


        if(
          Array.isArray(
            values
          )
        ){

          addIndicatorLine(
            values
          );

        }


        continue;

      }


      if(
        line.startsWith(
          "plotshape("
        )
      ){

        const inside =
          line.slice(
            10,
            -1
          );


        const values =
          evaluateExpression(
            inside,
            context
          );


        if(
          Array.isArray(
            values
          )
        ){

          const type =
            /sell|crossunder/i.test(
              line
            )
              ? "sell"
              : "buy";


          addSignalMarkers(
            values,
            type
          );

        }


        continue;

      }


      if(
        line.startsWith(
          "hline("
        )
      ){

        const inside =
          line.slice(
            6,
            -1
          );


        const value =
          parseNumber(
            inside
          );


        const lineSeries =
          chart.addLineSeries({

            color:"#8e98a8",

            lineWidth:1,

            lineStyle:2,

            priceLineVisible:false,

            lastValueVisible:true

          });


        const first =
          candles[0];

        const last =
          candles[
            candles.length - 1
          ];


        lineSeries.setData([

          {
            time:first.time,
            value
          },

          {
            time:last.time,
            value
          }

        ]);


        indicatorLines.push(
          lineSeries
        );


        continue;

      }


      if(
        line.includes(
          "ta.crossover"
        ) ||
        line.includes(
          "ta.crossunder"
        )
      ){

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
      "Pine engine:",
      error
    );


    clearIndicators();

    candleSeries.setMarkers(
      []
    );


    setPineStatus(
      error.message ||
      "Compilation error.",
      false
    );

  }

}


// =====================================================
// PINE UI
// =====================================================

function setPineStatus(
  message,
  success
){

  if(!pineStatus){

    return;

  }


  pineStatus.textContent =
    message;

  pineStatus.classList.toggle(
    "success",
    Boolean(success)
  );

  pineStatus.classList.toggle(
    "error",
    !success
  );

}


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

    candleSeries?.setMarkers(
      []
    );


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

  if(!chartScreen){

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
      screen.orientation?.lock
    ){

      try{

        await screen.orientation.lock(
          "landscape"
        );

      }catch{}

    }


    resizeChart();

  }catch(error){

    console.error(
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
      screen.orientation?.unlock
    ){

      try{

        screen.orientation.unlock();

      }catch{}

    }


    resizeChart();

  }catch(error){

    console.error(
      error
    );

  }

}


fullscreenButton?.addEventListener(
  "click",
  async () => {

    const isFullscreen =
      Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement
      );


    if(isFullscreen){

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
      150
    );

  }
);


// =====================================================
// INITIALIZE SYMBOL
// =====================================================

function initializeSymbol(){

  const saved =
    getSavedSymbol();


  const option =
    Array.from(
      symbolSelect.options
    ).find(
      option =>
        option.value ===
        saved
    );


  if(option){

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

  initializeSymbol();

  loadSavedScript();

  createChart();

  updateSymbolUI(
    currentSymbol
  );

  await loadMarket();


  if(refreshTimer){

    clearInterval(
      refreshTimer
    );

  }


  /*
    Twelve Data free plans can have
    rate limits. This interval is
    intentionally conservative.
  */

  refreshTimer =
    setInterval(
      refreshMarket,
      30000
    );

}


start();
