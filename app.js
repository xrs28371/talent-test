/* 题目、维度与解读：公开部分来自 data.js；完整部分经访问码核销后由服务端下发、本机保存。分数为选择次数，不换算百分比。 */
(function (root) {
  'use strict';
  function scoreAnswers(data, answers) {
    const scores = Object.fromEntries(data.dimensions.map(d => [d.id, 0]));
    data.questions.forEach(q => { const o = q.options[answers[q.id]]; if (o && scores[o.dim] !== undefined) scores[o.dim]++; });
    return data.dimensions.map((d, order) => ({...d, score:scores[d.id], order})).sort((a,b) => b.score-a.score || a.order-b.order);
  }
  root.TalentScoring = {scoreAnswers};
  if (typeof module !== 'undefined') module.exports = {scoreAnswers};
  if (typeof document === 'undefined') return;
  const REDEEM_API = 'https://cartridges-luggage-spotlight-conventions.trycloudflare.com/redeem';
  const FULL_KEY = 'talent-full-v1';
  const pubData = root.TALENT_DATA, app = document.getElementById('app'), KEY = 'talent-handbook-v1';
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // 同步 SHA-256：不依赖安全上下文，file:// 与离线环境均可运行（此处用于校验服务端载荷完整性）。
  function sha256(str){const bytes=new TextEncoder().encode(str), length=bytes.length, padded=new Uint8Array(Math.ceil((length+9)/64)*64);padded.set(bytes);padded[length]=128;const view=new DataView(padded.buffer);view.setUint32(padded.length-4,length*8);const primes=[];for(let n=2;primes.length<64;n++){if(!primes.some(p=>n%p===0))primes.push(n);}const H=primes.slice(0,8).map(n=>(Math.sqrt(n)%1*4294967296)>>>0),K=primes.map(n=>(Math.cbrt(n)%1*4294967296)>>>0),rotr=(n,b)=>(n>>>b)|(n<<(32-b));for(let offset=0;offset<padded.length;offset+=64){const w=new Uint32Array(64);for(let i=0;i<16;i++)w[i]=view.getUint32(offset+i*4);for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(rotr(x,7)^rotr(x,18)^(x>>>3))+w[i-7]+(rotr(y,17)^rotr(y,19)^(y>>>10)))>>>0;}let [a,b,c,d,e,f,g,h]=H;for(let i=0;i<64;i++){const t1=(h+(rotr(e,6)^rotr(e,11)^rotr(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0,t2=((rotr(a,2)^rotr(a,13)^rotr(a,22))+((a&b)^(a&c)^(b&c)))>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}[a,b,c,d,e,f,g,h].forEach((v,i)=>H[i]=(H[i]+v)>>>0);}return H.map(n=>n.toString(16).padStart(8,'0')).join('');}
  // 与服务端一致的规范化 JSON（键排序、无空格），用于载荷完整性校验。
  function canon(v){if(v===null||typeof v!=='object')return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canon).join(',')+']';return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}';}
  function loadFull(){try{const raw=localStorage.getItem(FULL_KEY);if(!raw)return null;const o=JSON.parse(raw);if(!o||!o.payload||typeof o.checksum!=='string'||!/^[0-9a-f]{64}$/.test(o.sig||''))return null;if(sha256(canon(o.payload))!==o.checksum)return null;return o.payload;}catch(_){return null;}}
  const fullPayload = loadFull();
  const unlocked = !!fullPayload;
  let data = pubData;
  if (fullPayload) {
    const byId = new Map(pubData.questions.map(q => [q.id, q]));
    fullPayload.questions.forEach(q => byId.set(q.id, q));
    data = {
      dimensions: pubData.dimensions.map(d => ({...d, ...(fullPayload.readings[d.id] || {})})),
      questions: fullPayload.order.map(id => byId.get(id)).filter(Boolean)
    };
  }
  const fingerprint = 'v2-' + sha256(JSON.stringify(pubData));
  let state = {mode:null,answers:{},screen:'home'}, busy=false, storageOK=true;
  try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved && saved.fingerprint === fingerprint && ['free','full'].includes(saved.mode)) { state = saved; if (!['home','quiz','result'].includes(state.screen)) state.screen='quiz'; } } catch (_) {storageOK=false;}
  if (state.mode === 'full' && !unlocked) { state.mode = 'free'; if (state.screen === 'result') state.screen = 'quiz'; }
  function save(){try{localStorage.setItem(KEY,JSON.stringify({...state,fingerprint}));}catch(_){storageOK=false;}}
  function questions(){return data.questions.filter(q=>state.mode==='full'||q.free===true);}
  function answered(q){return Number.isInteger(state.answers[q.id]) && !!q.options[state.answers[q.id]];}
  function reset(){try{localStorage.removeItem(KEY);}catch(_){} state={mode:null,answers:{},screen:'home'};busy=false;render();window.scrollTo(0,0);}
  document.getElementById('home-link').onclick=e=>{e.preventDefault();state.screen='home';save();render();window.scrollTo(0,0);};
  const sprout='<svg class="sprout" viewBox="0 0 120 220" aria-hidden="true"><path d="M63 215 Q35 128 82 12 M55 151 Q8 138 19 102 Q56 103 55 151 M58 118 Q102 112 106 75 Q68 77 58 118 M64 74 Q30 63 39 34 Q68 40 64 74" fill="none" stroke="#1E5B41" stroke-width="1.2"/><circle cx="82" cy="12" r="8" fill="#E8A33D" stroke="none"/></svg>';
  function home(){
    const resumable=state.mode && questions().some(answered);
    const access = unlocked
      ? `<p class="small-note">完整版已在本机开启 · 共 24 题（访问码已核销，本机回访无需再次输入）</p>`
      : `<form class="access" id="access"><label for="code">已购买完整版？输入访问码开启</label><div class="input-row"><input id="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="输入访问码" required aria-describedby="code-error"><button class="secondary" type="submit">开启</button></div><p class="error" id="code-error" role="status"></p><p class="small-note">访问码在购买后的自动发货消息里，输入后直接开启全部 24 题。每个访问码只能开启一次，请在本机使用。</p></form>`;
    app.innerHTML=`<div class="issue">给自己的观察练习 · 创刊号</div><section class="intro">${sprout}<h1>你身上，<br>还有未被发现<br>的天赋。</h1><p class="lead">从日常的小选择里，<br>认领一种属于你的可能。</p></section><button class="primary" id="start">${resumable?'继续上次探索':'先探索我的一个天赋'}</button><p class="small-note">${resumable?'已为你保留本机进度':'免费体验 5 题 · 没有标准答案，凭直觉选就好'}</p>${access}<p class="editor-note">天赋不是一张固定的标签。<br>这份手帖，只为帮你发现值得尝试的方向。</p><p class="sample">先免费体验 5 题，生成你的「Top1 潜能初探卡」· 完整八维报告共 24 题，结果仅供自我探索参考。</p>${resumable?'<button class="back" id="reset">重新测试（清除进度）</button>':''}`;
    document.getElementById('start').onclick=()=>{if(!resumable){state={mode:unlocked?'full':'free',answers:{},screen:'quiz'};}else state.screen=questions().every(answered)?'result':'quiz';save();render();};
    const form=document.getElementById('access');
    if(form) form.onsubmit=async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;const error=document.getElementById('code-error');const code=document.getElementById('code').value.trim().toUpperCase();
      try{
        const resp=await fetch(REDEEM_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
        if(resp.status===200){
          const o=await resp.json().catch(()=>null);
          if(!o||!o.payload||typeof o.checksum!=='string'||!/^[0-9a-f]{64}$/.test(o.sig||'')||sha256(canon(o.payload))!==o.checksum){error.textContent='验证数据异常，请稍后重试。';return;}
          try{localStorage.setItem(FULL_KEY,JSON.stringify({payload:o.payload,checksum:o.checksum,sig:o.sig}));}catch(_){error.textContent='本机存储不可用，无法保存完整版，请更换浏览器后重试。';return;}
          state.mode='full';state.screen='quiz';save();location.reload();return;
        }
        if(resp.status===404){error.textContent='访问码未匹配，请检查后重试。';return;}
        if(resp.status===409){error.textContent='该访问码已被使用，无法再次开启。';return;}
        if(resp.status===429){error.textContent='尝试过于频繁，请一分钟后再试。';return;}
        error.textContent='验证服务暂时不可用，请稍后重试。';
      }catch(_){error.textContent='网络异常，暂时无法验证，请检查网络后重试。';}
      finally{btn.disabled=false;}};
    bindReset();
  }
  function quiz(){const qs=questions(), index=qs.findIndex(q=>!answered(q));if(index<0){state.screen='result';save();result();return;}const q=qs[index];app.innerHTML=`<div class="progress-info"><span>${state.mode==='full'?'完整探索':'免费探索'}</span><span>第 ${index+1} / ${qs.length} 题</span></div><div class="progress" role="progressbar" aria-label="作答进度" aria-valuemin="0" aria-valuemax="${qs.length}" aria-valuenow="${index}"><i style="width:${index/qs.length*100}%"></i></div><section class="question"><p class="meta">跟随第一感觉</p><h2 tabindex="-1">${esc(q.text)}</h2><div class="options">${q.options.map((o,i)=>`<button class="option" data-option="${i}"><b>${'ABCD'[i]}</b><span>${esc(o.text)}</span></button>`).join('')}</div></section><button class="back" id="previous">${index?'回到上一题':'返回首页'}</button>`;
    app.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>{if(busy)return;busy=true;b.classList.add('selected');app.querySelectorAll('[data-option]').forEach(x=>x.disabled=true);state.answers[q.id]=Number(b.dataset.option);save();setTimeout(()=>{app.querySelector('.question')?.classList.add('leaving');},100);setTimeout(()=>{busy=false;quiz();window.scrollTo(0,0);app.querySelector('.question h2')?.focus({preventScroll:true});},290);});
    document.getElementById('previous').onclick=()=>{if(index){delete state.answers[qs[index-1].id];save();quiz();}else{state.screen='home';save();home();}};
  }
  function radar(ranked,preview=false){const dims=data.dimensions;const max=Math.max(1,...ranked.map(d=>d.score));const point=(i,r)=>[160+Math.sin(i*Math.PI/4)*r,132-Math.cos(i*Math.PI/4)*r];const points=r=>dims.map((_,i)=>point(i,r).join(',')).join(' ');return `<svg class="radar" viewBox="0 0 320 266" role="img" aria-label="${preview?'完整报告雷达图预览':'八个维度的选择次数雷达图'}">${[24,48,72,94].map(r=>`<polygon class="radar-grid" points="${points(r)}"/>`).join('')}${dims.map((d,i)=>{const p=point(i,94),t=point(i,119);return `<path class="radar-grid" d="M160 132 L${p.join(' ')}"/><text x="${t[0]}" y="${t[1]+4}" text-anchor="middle">${esc(d.name)}</text>`;}).join('')}<polygon class="radar-shape" points="${dims.map((d,i)=>point(i,preview?35+(i%3)*23:94*(ranked.find(x=>x.id===d.id)?.score||0)/max).join(',')).join(' ')}"/><circle cx="160" cy="132" r="3" fill="#E8A33D"/></svg>`;}
  function textValue(v){if(!Array.isArray(v))return esc(v);const full=v.length>0&&v.every(s=>typeof s==='string'&&s.endsWith('。'));const out=v.map(s=>String(s).replace(/。$/,'')).join('；');return esc(full&&out?out+'。':out);}
  function result(){if(!questions().every(answered)){state.screen='quiz';save();quiz();return;}const ranked=scoreAnswers({...data,questions:questions()},state.answers), top=ranked[0], full=state.mode==='full', max=Math.max(1,top.score);const tied=ranked.filter(d=>d.score===top.score).length>1;
    app.innerHTML=`<section class="result-head"><p class="meta">你的天赋观察手帖</p><h1>${esc(top.name)}</h1><span class="tag">此刻最亮的一面</span><p>${esc(top.def)}</p><p style="margin-top:12px;font-family:var(--serif)">${esc(top.card)}</p></section>${full?`<section class="section"><div class="section-head"><h2>你的八维轮廓</h2><span>${questions().length} 次直觉选择</span></div>${radar(ranked)}<p class="small-note">按各维度被选择的次数绘制；外圈对应本次最高分。${tied?'同分按题库维度顺序排列。':''}</p><div class="bars">${ranked.map((d,i)=>`<div class="bar-row"><span>${esc(d.name)}</span><div class="track"><i style="width:${d.score/max*100}%;animation-delay:${i*.09}s"></i></div><small>${d.score} 次 · ${i===0?'Top1':i<3?'倾向':'探索'}</small></div>`).join('')}</div></section><section class="section"><div class="section-head"><h2>把可能带进生活</h2></div>${ranked.map((d,i)=>{const level=i===0?'high':i<3?'mid':'low',raw=d[level],copy=typeof raw==='string'?{traits:raw}:(raw||{});const dl=[copy.activities?`<dt>可以试试</dt><dd>${textValue(copy.activities)}</dd>`:'',copy.advice?`<dt>给你的小建议</dt><dd>${textValue(copy.advice)}</dd>`:''].join('');return `<article class="reading"><h3>${esc(d.name)}<span>${i===0?'主要天赋':i<3?'明显倾向':'待探索'}</span></h3><p>${textValue(copy.traits)}</p>${dl?`<dl>${dl}</dl>`:''}</article>`;}).join('')}</section><section class="section"><div class="section-head"><h2>留住这一页</h2><span>截图，收藏此刻的自己</span></div><div class="share-card"><p class="meta">我的隐藏天赋</p><h2>${esc(top.name)}</h2><p class="quote">${esc(top.card)}</p>${radar(ranked)}<div class="signature"><span>天赋手帖 · 自我探索</span><span>每一种可能，都值得生长</span></div></div></section>`:`<section class="lock"><div class="lock-art" aria-hidden="true">${radar(ranked,true)}</div><div class="lock-overlay"><h2>你的可能，不止一面</h2><p>完整报告含八维轮廓、倾向解读<br>与日常探索灵感</p><button class="primary" id="unlock">输入访问码开启完整版</button></div></section><p class="small-note">免费体验仅展示一个维度；完整版凭访问码开启，已在本机开启过的回访无需再次输入。${tied?'本次存在同分，按题库维度顺序展示。':''}</p>`}<div class="actions"><button class="secondary" id="reset">重新测试</button></div><p class="sample">本结果基于你本次的选择，仅供认识自己的新角度。</p>`;
    document.getElementById('unlock')?.addEventListener('click',()=>{state.screen='home';save();home();document.getElementById('code')?.focus();});bindReset();
  }
  function bindReset(){document.getElementById('reset')?.addEventListener('click',reset);}
  function render(){({home,quiz,result}[state.screen]||home)();if(!storageOK)app.insertAdjacentHTML('afterbegin','<p class="storage-note" role="status">当前浏览器无法保存本机进度，请保持页面打开完成探索。</p>');}
  render();
})(typeof window==='undefined'?globalThis:window);
