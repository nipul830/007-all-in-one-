import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.publishableKey);
const plans = [
  {id:"10k",size:10000,target:8,daily:4,maxdd:8,price:499},
  {id:"25k",size:25000,target:8,daily:4,maxdd:8,price:999},
  {id:"50k",size:50000,target:10,daily:5,maxdd:10,price:1999},
  {id:"100k",size:100000,target:10,daily:5,maxdd:10,price:3499}
];
let user=null, account=null, trades=[];

const $=id=>document.getElementById(id);
const money=n=>"$"+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

function show(id){
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
  $(id).classList.add("active");
}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.page)));

function renderPlans(){
  $("account-grid").innerHTML=plans.map(p=>`
    <div class="account panel">
      <div class="eyebrow">DEMO ACCOUNT</div><div class="size">$${p.size/1000}K</div>
      <div class="price">₹${p.price.toLocaleString()} <span class="muted">display price</span></div>
      <ul><li>Target ${p.target}%</li><li>Daily loss ${p.daily}%</li><li>Max drawdown ${p.maxdd}%</li></ul>
      <button class="primary choose" data-id="${p.id}">Choose Account</button>
    </div>`).join("");
  document.querySelectorAll(".choose").forEach(b=>b.addEventListener("click",()=>{
    if(!user){show("auth");return;}
    const p=plans.find(x=>x.id===b.dataset.id);
    $("coupon-box").classList.remove("hidden");
    $("coupon-box").dataset.id=p.id;
    $("selected-plan").textContent=`Selected: $${p.size/1000}K account — ₹${p.price.toLocaleString()}`;
    $("coupon").focus();
  }));
}

async function loadAccount(){
  if(!user) return;
  const {data}=await supabase.from("accounts")
    .select("*, account_plans(*)").eq("user_id",user.id)
    .order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(!data){account=null;trades=[];return;}
  account={id:data.id,size:Number(data.balance),balance:Number(data.balance),equity:Number(data.equity),
    target:Number(data.account_plans.profit_target_pct),daily:Number(data.account_plans.daily_loss_pct),
    maxdd:Number(data.account_plans.max_drawdown_pct),status:data.status,reason:data.breach_reason};
  const t=await supabase.from("trades").select("*").eq("account_id",account.id).order("opened_at",{ascending:false});
  trades=(t.data||[]).map(x=>({side:x.side,size:Number(x.quantity),pnl:Number(x.pnl),time:x.opened_at}));
  updateDashboard();
}

$("activate").addEventListener("click",async()=>{
  if(!user){show("auth");return;}
  const p=plans.find(x=>x.id===$("coupon-box").dataset.id);
  const code=$("coupon").value.trim().toUpperCase();
  const {data:coupon}=await supabase.from("coupons").select("*").eq("code",code).eq("active",true).maybeSingle();
  if(!coupon || Number(coupon.discount_pct)!==100){$("coupon-msg").textContent="Invalid demo coupon. Try FRIENDS100.";return;}
  const {data:plan}=await supabase.from("account_plans").select("*").eq("size",p.size).eq("active",true).maybeSingle();
  if(!plan){$("coupon-msg").textContent="Account plan unavailable.";return;}
  const accountNumber="007-"+Math.floor(100000+Math.random()*900000);
  const {data:acc,error}=await supabase.from("accounts").insert({
    user_id:user.id,plan_id:plan.id,account_number:accountNumber,balance:plan.size,equity:plan.size,status:"ACTIVE"
  }).select().single();
  if(error){$("coupon-msg").textContent=error.message;return;}
  await supabase.from("coupon_redemptions").insert({coupon_id:coupon.id,user_id:user.id,account_id:acc.id});
  $("coupon-msg").textContent="100% discount applied. Account activated.";
  await loadAccount(); show("dashboard");
});

function totalPnl(){return trades.reduce((s,t)=>s+Number(t.pnl),0)}

async function checkRules(){
  if(!account)return;
  const pnl=totalPnl(), equity=account.balance+pnl;
  const dailyPnl=trades.filter(t=>new Date(t.time).toDateString()===new Date().toDateString()).reduce((s,t)=>s+Number(t.pnl),0);
  let status=account.status, reason=account.reason;
  if(equity<=account.size*(1-account.maxdd/100)){status="BREACHED";reason="Maximum drawdown limit reached";}
  else if(dailyPnl<=-(account.size*account.daily/100)){status="BREACHED";reason="Daily loss limit reached";}
  else if(pnl>=account.size*(account.target/100)){status="PASSED";reason="Profit target reached";}
  account.equity=equity;account.status=status;account.reason=reason;
  await supabase.from("accounts").update({equity,status,breach_reason:reason||null}).eq("id",account.id).eq("user_id",user.id);
}

function updateDashboard(){
  if(!account)return;
  const pnl=totalPnl(),dd=Math.max(0,account.size-account.equity);
  $("account-title").textContent=`$${account.size/1000}K Account`;
  $("account-status").textContent=account.status;
  $("balance").textContent=money(account.balance);
  $("equity").textContent=money(account.equity);
  $("pnl").textContent=money(pnl);
  $("dd").textContent=money(dd);
  $("rules").innerHTML=`<div class="rule"><span>Profit Target</span><b>${account.target}%</b></div>
  <div class="rule"><span>Daily Loss Limit</span><b>${account.daily}%</b></div>
  <div class="rule"><span>Max Drawdown</span><b>${account.maxdd}%</b></div>`;
  $("status-detail").textContent=account.status==="ACTIVE"?"Account is active. Trade within the rules.":`${account.status}: ${account.reason||""}`;
  $("buy").disabled=$("sell").disabled=account.status!=="ACTIVE";
  $("history").innerHTML=trades.length?trades.slice(0,12).map(t=>`<div class="trade-row"><span>${t.side}</span><span>${t.size}</span><span>${money(t.pnl)}</span><span>${new Date(t.time).toLocaleTimeString()}</span></div>`).join(""):"No trades yet.";
}

async function addTrade(side){
  if(!account){$("trade-msg").textContent="Activate an account first.";return;}
  if(account.status!=="ACTIVE"){$("trade-msg").textContent="Trading locked: "+account.status;return;}
  let pnl=Number($("trade-pnl").value)||0;if(side==="SELL")pnl=-pnl;
  const row={account_id:account.id,symbol:"EURUSD",side,quantity:Number($("size").value)||0.1,pnl,status:"CLOSED"};
  const {data,error}=await supabase.from("trades").insert(row).select().single();
  if(error){$("trade-msg").textContent=error.message;return;}
  trades.unshift({side,size:Number(row.quantity),pnl:Number(row.pnl),time:data.opened_at});
  await checkRules(); updateDashboard();
  $("trade-msg").textContent=`${side} trade recorded. P&L ${money(pnl)}.`;
}
$("buy").addEventListener("click",()=>addTrade("BUY"));
$("sell").addEventListener("click",()=>addTrade("SELL"));

let signup=true;
$("auth-toggle").addEventListener("click",()=>{
  signup=!signup;
  $("auth-title").textContent=signup?"Create your trader account":"Welcome back";
  $("signup-fields").style.display=signup?"block":"none";
  $("auth-submit").textContent=signup?"Create account":"Login";
  $("auth-toggle").textContent=signup?"Already have an account? Login":"Need an account? Register";
});
$("auth-submit").addEventListener("click",async()=>{
  const email=$("auth-email").value.trim(),password=$("auth-password").value;
  if(!email||password.length<6){$("auth-msg").textContent="Enter a valid email and 6+ character password.";return;}
  if(signup){
    const name=$("auth-name").value.trim();
    const {error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});
    $("auth-msg").textContent=error?error.message:"Registered. Check your email if confirmation is enabled, then login.";
    if(!error){signup=false;$("signup-fields").style.display="none";$("auth-title").textContent="Welcome back";$("auth-submit").textContent="Login";}
  }else{
    const {data,error}=await supabase.auth.signInWithPassword({email,password});
    if(error){$("auth-msg").textContent=error.message;return;}
    user=data.user; await loadAccount(); show("home");
  }
});
$("logout").addEventListener("click",async()=>{await supabase.auth.signOut();user=null;account=null;trades=[];show("auth");});

async function boot(){
  const {data:{session}}=await supabase.auth.getSession();
  if(session){user=session.user;await loadAccount();show("home");}
  else show("auth");
  supabase.auth.onAuthStateChange(async(_e,s)=>{if(s){user=s.user;await loadAccount();show("home");}else{user=null;account=null;trades=[];show("auth");}});
}
function candles(){let h="";for(let i=0;i<55;i++){let height=25+Math.random()*130;h+=`<div class="candle" style="height:${height}px"></div>`}$("candles").innerHTML=h}
renderPlans();candles();boot();
