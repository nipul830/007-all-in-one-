// =====================================================
// 007 LIVE TRADINGVIEW CHART
// CLEAN CHART VERSION
// =====================================================


// =====================================================
// ELEMENTS
// =====================================================

const chartScreen =
  document.getElementById(
    "chart-screen"
  );


const fullscreenButton =
  document.getElementById(
    "chart-fullscreen"
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


const chartCurrentSymbol =
  document.getElementById(
    "chart-current-symbol"
  );


const tradingViewContainer =
  document.getElementById(
    "tradingview-widget"
  );


// =====================================================
// SYMBOL MAP
// =====================================================

const TRADINGVIEW_SYMBOLS = {

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

  "XAU/USD":
    "OANDA:XAUUSD",

  "BTC/USD":
    "COINBASE:BTCUSD",

  "ETH/USD":
    "COINBASE:ETHUSD",

  "SOL/USD":
    "COINBASE:SOLUSD"

};


// =====================================================
// LOAD TRADINGVIEW
// =====================================================

function loadTradingViewChart(
  symbol = "EUR/USD"
){

  if(
    !tradingViewContainer
  ){

    return;

  }


  const tradingViewSymbol =
    TRADINGVIEW_SYMBOLS[
      symbol
    ] ||
    "FX:EURUSD";


  tradingViewContainer.innerHTML =
    "";


  const widget =
    document.createElement(
      "div"
    );


  widget.className =
    "tradingview-widget-container";


  widget.style.width =
    "100%";


  widget.style.height =
    "100%";


  const inner =
    document.createElement(
      "div"
    );


  inner.className =
    "tradingview-widget-container__widget";


  inner.style.width =
    "100%";


  inner.style.height =
    "100%";


  widget.appendChild(
    inner
  );


  tradingViewContainer.appendChild(
    widget
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
        tradingViewSymbol,

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

      enable_publishing:
        false,

      allow_symbol_change:
        false,

      hide_top_toolbar:
        false,

      hide_legend:
        false,

      save_image:
        false,

      calendar:
        false,

      hide_volume:
        false,

      support_host:
        "https://www.tradingview.com"

    });


  widget.appendChild(
    script
  );

}


// =====================================================
// UPDATE SYMBOL UI
// =====================================================

function updateSymbolUI(
  symbol
){

  if(marketSymbol){

    marketSymbol.textContent =
      symbol;

  }


  if(chartCurrentSymbol){

    chartCurrentSymbol.textContent =
      symbol;

  }


  if(marketStatus){

    marketStatus.textContent =
      "● LIVE";

  }

}


// =====================================================
// SYMBOL CHANGE
// =====================================================

symbolSelect?.addEventListener(
  "change",
  () => {

    const symbol =
      symbolSelect.value;

    updateSymbolUI(
      symbol
    );

    loadTradingViewChart(
      symbol
    );

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


    // Try to lock landscape.
    // Some mobile browsers do not allow
    // orientation locking from a normal
    // webpage. In that case fullscreen
    // still works normally.

    if(
      screen.orientation &&
      screen.orientation.lock
    ){

      try{

        await screen.orientation.lock(
          "landscape"
        );

      }catch(error){

        console.log(
          "Landscape lock not supported:",
          error
        );

      }

    }

  }catch(error){

    console.error(
      "Fullscreen error:",
      error
    );

  }

}


// =====================================================
// EXIT FULLSCREEN
// =====================================================

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

      }catch(error){

        console.log(
          "Orientation unlock unavailable:",
          error
        );

      }

    }

  }catch(error){

    console.error(
      "Exit fullscreen error:",
      error
    );

  }

}


// =====================================================
// FULLSCREEN BUTTON
// =====================================================

fullscreenButton?.addEventListener(
  "click",
  async () => {

    const fullscreen =
      Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement
      );


    if(fullscreen){

      await exitFullscreen();

    }else{

      await enterFullscreen();

    }


    updateFullscreenButton();

  }
);


// =====================================================
// UPDATE BUTTON
// =====================================================

function updateFullscreenButton(){

  if(!fullscreenButton){

    return;

  }


  const fullscreen =
    Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement
    );


  fullscreenButton.textContent =
    fullscreen
      ? "✕ Exit Full Screen"
      : "⛶ Full Screen";

}


document.addEventListener(
  "fullscreenchange",
  updateFullscreenButton
);


document.addEventListener(
  "webkitfullscreenchange",
  updateFullscreenButton
);


// =====================================================
// ORIENTATION CHANGE
// =====================================================

if(
  screen.orientation
){

  screen.orientation.addEventListener?.(
    "change",
    () => {

      updateFullscreenButton();

    }
  );

}


// =====================================================
// INITIALIZE
// =====================================================

const initialSymbol =
  symbolSelect?.value ||
  "EUR/USD";


updateSymbolUI(
  initialSymbol
);


loadTradingViewChart(
  initialSymbol
);


updateFullscreenButton();
