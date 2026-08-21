const plans=[
 {id:"10k",size:10000,target:8,daily:4,maxdd:8,price:499},
 {id:"25k",size:25000,target:8,daily:4,maxdd:8,price:999},
 {id:"50k",size:50000,target:10,daily:5,maxdd:10,price:1999},
 {id:"100k",size:100000,target:10,daily:5,maxdd:10,price:3499}
];
let state=JSON.parse(localStorage.getItem("propDemo")||"null")||{account:null,trades:[]};
const $=id=>document.getElementById(id);
function save(){localStorage.setItem("propDemo",JSON.stringify(state));}
function money(n){return "$"+Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});}
function show(page){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(page).classList.add("active");updateDashboard();}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.page)));
function renderPlans(){
 $("account-grid").innerHTML=plans.map(p=>`<div class="account panel">
 <div class="eyebrow">DEMO ACCOUNT</div><div class="size">$${(p.size/1000)}K</div>
 <div class="price">₹${p.price.toLocaleString()} <span class="muted">display price</span></div>
 <ul><li>Target ${p.target}%</li><li>Daily loss ${p.daily}%</li><li>Max drawdown ${p.maxdd}%</li></ul>
 <button class="primary choose" data-id="${p.id}">Choose Account</button></div>`).join("");
 document.querySelectorAll(".choose").forEach(b=>b.addEventListener("click",()=>selectPlan(b.dataset.id)));
}
function selectPlan(id){let p=plans.find(x=>x.id===id);$("coupon-box").classList.remove("hidden");$("selected-plan").textContent=`Selected: $${p.size/1000}K account — ₹${p.price.toLocaleString()}`;$("coupon").focus();$("coupon-box").dataset.id=id;}
$("activate").addEventListener("click",()=>{
 let p=plans.find(x=>x.id===$("coupon-box").dataset.id);
 if($("coupon").value.trim().toUpperCase()!=="FRIENDS100"){ $("coupon-msg").textContent="Invalid demo coupon. Try FRIENDS100."; return; }
 state.account={...p,balance:p.size,equity:p.size,status:"ACTIVE",created:new Date().toISOString(),dailyStart:p.size};
 state.trades=[];save();$("coupon-msg").textContent="100% discount applied. Account activated.";show("dashboard");
});
function totalPnl(){return state.trades.reduce((s,t)=>s+t.pnl,0)}
function breachCheck(){
 if(!state.account)return;
 let a=state.account, pnl=totalPnl(), equity=a.balance+pnl;
 let dailyPnl=state.trades.filter(t=>new Date(t.time).toDateString()===new Date().toDateString()).reduce((s,t)=>s+t.pnl,0);
 let dailyLoss=a.size*a.daily/100, maxLoss=a.size*a.maxdd/100, target=a.size*a.target/100;
 if(equity<=a.size-maxLoss){a.status="BREACHED";a.reason="Maximum drawdown limit reached";}
 else if(dailyPnl<=-dailyLoss){a.status="BREACHED";a.reason="Daily loss limit reached";}
 else if(pnl>=target){a.status="PASSED";a.reason="Profit target reached";}
 a.equity=equity;
 save();
}
function updateDashboard(){
 if(!state.account)return;
 breachCheck();let a=state.account,pnl=totalPnl(),dd=Math.max(0,a.size-a.equity);
 $("account-title").textContent=`$${a.size/1000}K Account`;
 $("account-status").textContent=a.status;
 $("balance").textContent=money(a.balance);$("equity").textContent=money(a.equity);$("pnl").textContent=money(pnl);$("dd").textContent=money(dd);
 $("rules").innerHTML=`<div class="rule"><span>Profit Target</span><b>${a.target}%</b></div><div class="rule"><span>Daily Loss Limit</span><b>${a.daily}%</b></div><div class="rule"><span>Max Drawdown</span><b>${a.maxdd}%</b></div>`;
 $("status-detail").textContent=a.status==="ACTIVE"?"Account is active. Trade within the rules.":`${a.status}: ${a.reason||""}`;
 $("buy").disabled=$("sell").disabled=a.status!=="ACTIVE";
 renderHistory();
}
function addTrade(side){
 if(!state.account){$("trade-msg").textContent="Activate an account first.";return;}
 if(state.account.status!=="ACTIVE"){$("trade-msg").textContent="Trading locked: account is "+state.account.status;return;}
 let pnl=Number($("trade-pnl").value)||0;if(side==="SELL")pnl=-pnl;
 state.trades.unshift({side,size:Number($("size").value)||0.1,pnl,time:new Date().toISOString()});
 breachCheck();save();$("trade-msg").textContent=`${side} trade recorded. P&L ${money(pnl)}.`;updateDashboard();
}
$("buy").addEventListener("click",()=>addTrade("BUY"));$("sell").addEventListener("click",()=>addTrade("SELL"));
function renderHistory(){
 $("history").innerHTML=state.trades.length?state.trades.slice(0,12).map(t=>`<div class="trade-row"><span>${t.side}</span><span>${t.size}</span><span>${money(t.pnl)}</span><span>${new Date(t.time).toLocaleTimeString()}</span></div>`).join(""):"No trades yet.";
}
function candles(){let h="";for(let i=0;i<55;i++){let height=25+Math.random()*130;h+=`<div class="candle" style="height:${height}px"></div>`}$("candles").innerHTML=h}
$("logout").addEventListener("click",()=>{alert("Demo logout.");show("home")});
renderPlans();candles();updateDashboard();
