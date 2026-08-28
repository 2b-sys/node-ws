const cfg = window.IELTS_CONFIG || {};
const hasCloud = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
const cloud = hasCloud ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
const STORAGE_KEY = 'ielts-training-sessions-v1';
let currentUser = null;
let sessions = [];
const timerDefaults = { reading: 35 * 60, listening: 30 * 60 };
const timers = {
  reading: { remain: timerDefaults.reading, id: null, startedAt: null },
  listening: { remain: timerDefaults.listening, id: null, startedAt: null }
};

const $ = (id) => document.getElementById(id);
const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function loadLocal(){
  try { sessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { sessions = []; }
}
function saveLocal(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); }
function isoDay(d){ return new Date(d).toISOString().slice(0,10); }
function formatTimer(sec){ const m=Math.floor(sec/60), s=sec%60; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function accuracy(kind){
  const rows = sessions.filter(x => x.kind === kind && Number(x.total) > 0);
  const c = rows.reduce((a,x)=>a+Number(x.correct||0),0), t = rows.reduce((a,x)=>a+Number(x.total||0),0);
  return t ? `${Math.round(c/t*100)}%` : '—';
}
function calcStreak(){
  const days = [...new Set(sessions.map(x=>isoDay(x.created_at)))].sort().reverse();
  if(!days.length) return 0;
  let streak=0, cursor=new Date();
  const today=isoDay(cursor), yesterday=isoDay(new Date(Date.now()-86400000));
  if(days[0]!==today && days[0]!==yesterday) return 0;
  cursor = new Date(days[0]+'T00:00:00');
  for(const day of days){
    if(day===isoDay(cursor)){ streak++; cursor.setDate(cursor.getDate()-1); }
    else if(day < isoDay(cursor)) break;
  }
  return streak;
}
function render(){
  $('streak').textContent = calcStreak();
  $('totalMinutes').textContent = sessions.reduce((a,x)=>a+Number(x.minutes||0),0);
  $('readingAccuracy').textContent = accuracy('reading');
  $('listeningAccuracy').textContent = accuracy('listening');
  const weekAgo = Date.now()-7*86400000;
  $('weekSessions').textContent = sessions.filter(x=>new Date(x.created_at).getTime()>=weekAgo).length;
  const sorted=[...sessions].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  $('history').innerHTML = sorted.length ? sorted.map(x=>{
    const score = Number(x.total)>0 ? `${x.correct}/${x.total} · ${Math.round(Number(x.correct)/Number(x.total)*100)}%` : `${x.minutes||0} 分钟`;
    return `<div class="history-item"><div><b>${esc(x.kind)}</b><div class="meta">${new Date(x.created_at).toLocaleString()}</div></div><div><strong>${esc(x.topic||'未填写话题')}</strong><div class="meta">${esc(x.notes||'')}</div></div><div class="score">${score}</div></div>`;
  }).join('') : '<div class="empty">还没有训练记录，完成一次训练后这里会自动出现。</div>';
}

function actualMinutes(kind){
  const t=timers[kind];
  const used=timerDefaults[kind]-t.remain;
  return Math.max(1, Math.round(used/60));
}
function stopTimer(kind){ const t=timers[kind]; if(t.id){clearInterval(t.id);t.id=null;} document.querySelector(`.startTimer[data-kind="${kind}"]`).textContent='开始'; }
function startTimer(kind){
  const t=timers[kind], btn=document.querySelector(`.startTimer[data-kind="${kind}"]`);
  if(t.id){ stopTimer(kind); btn.textContent='继续'; return; }
  btn.textContent='暂停';
  t.id=setInterval(()=>{ t.remain=Math.max(0,t.remain-1); $(`${kind}Timer`).textContent=formatTimer(t.remain); if(t.remain===0) stopTimer(kind); },1000);
}
function resetTimer(kind){ stopTimer(kind); timers[kind].remain=timerDefaults[kind]; $(`${kind}Timer`).textContent=formatTimer(timers[kind].remain); }

async function syncFromCloud(){
  if(!cloud || !currentUser) return;
  const { data, error } = await cloud.from('training_sessions').select('*').eq('user_id', currentUser.id).order('created_at',{ascending:false});
  if(error){ console.error(error); return; }
  sessions = data || [];
  saveLocal(); render();
}
async function pushSession(row){
  if(!cloud || !currentUser) return;
  const payload={...row,user_id:currentUser.id};
  const { error } = await cloud.from('training_sessions').insert(payload);
  if(error) console.error(error);
}
async function saveSession(kind){
  const correct=Number($(`${kind}Correct`).value||0), total=Number($(`${kind}Total`).value||0);
  if(correct>total && total>0){ alert('答对题数不能大于总题数。'); return; }
  const row={
    id: crypto.randomUUID(), kind, topic:$(`${kind}Topic`).value.trim(), notes:$(`${kind}Notes`).value.trim(),
    correct, total, minutes:actualMinutes(kind), created_at:new Date().toISOString()
  };
  sessions.push(row); saveLocal(); render(); await pushSession(row);
  $(`${kind}Notes`).value=''; resetTimer(kind);
}
async function saveVocab(){
  const row={id:crypto.randomUUID(),kind:'vocabulary',topic:'词汇复习',notes:'',correct:0,total:0,minutes:Number($('vocabMinutes').value||15),created_at:new Date().toISOString()};
  sessions.push(row); saveLocal(); render(); await pushSession(row);
}

async function refreshAuth(){
  if(!cloud){ $('syncStatus').textContent='本地模式'; return; }
  const { data } = await cloud.auth.getSession(); currentUser=data.session?.user || null;
  $('syncStatus').textContent=currentUser?'云端已同步':'云端可用';
  $('authBtn').textContent=currentUser?'退出登录':'登录 / 云同步';
  if(currentUser) await syncFromCloud();
}
async function doAuth(mode){
  if(!cloud){ $('authMessage').textContent='请先在 config.js 填写 Supabase URL 和 anon key。'; return; }
  const email=$('email').value.trim(), password=$('password').value;
  if(!email||password.length<6){ $('authMessage').textContent='请输入有效邮箱和至少 6 位密码。'; return; }
  $('authMessage').textContent='处理中…';
  const result = mode==='signup' ? await cloud.auth.signUp({email,password}) : await cloud.auth.signInWithPassword({email,password});
  if(result.error){ $('authMessage').textContent=result.error.message; return; }
  currentUser=result.data.user || result.data.session?.user || null;
  $('authMessage').textContent = mode==='signup' && !result.data.session ? '注册成功，请按邮箱验证后再登录。' : '成功。';
  await refreshAuth(); if(currentUser) $('authDialog').close();
}

function exportData(){
  const blob=new Blob([JSON.stringify(sessions,null,2)],{type:'application/json'}), url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`ielts-training-${isoDay(new Date())}.json`; a.click(); URL.revokeObjectURL(url);
}

document.querySelectorAll('.startTimer').forEach(b=>b.addEventListener('click',()=>startTimer(b.dataset.kind)));
document.querySelectorAll('.resetTimer').forEach(b=>b.addEventListener('click',()=>resetTimer(b.dataset.kind)));
document.querySelectorAll('.saveSession').forEach(b=>b.addEventListener('click',()=>saveSession(b.dataset.kind)));
$('saveVocab').addEventListener('click',saveVocab);
$('exportBtn').addEventListener('click',exportData);
$('authBtn').addEventListener('click',async()=>{ if(currentUser&&cloud){await cloud.auth.signOut();currentUser=null;loadLocal();render();await refreshAuth();} else $('authDialog').showModal(); });
$('loginBtn').addEventListener('click',()=>doAuth('login'));
$('signupBtn').addEventListener('click',()=>doAuth('signup'));

loadLocal(); render(); refreshAuth();
