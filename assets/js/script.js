(function(){
  // --- Elements ---
  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const newBtn = document.getElementById('newBtn');
  const modeSel = document.getElementById('modeSel');
  const firstSel = document.getElementById('firstSel');
  const diffSel = document.getElementById('diffSel');
  const diffRow = document.getElementById('diffRow');
  const winlineEl = document.getElementById('winline');
  const hintEl = document.getElementById('hint');
  const muteBtn = document.getElementById('muteBtn');
  const musicBtn = document.getElementById('musicBtn');
  const tapAudio = document.getElementById('tapAudio');
  const scorePop = document.getElementById('scorePop');
  const scoreTotalEl = document.getElementById('scoreTotal');
  const scoreBestEl = document.getElementById('scoreBest');
  const scoreStreakEl = document.getElementById('scoreStreak');
  const scoreStatsEl = document.getElementById('scoreStats');
  const scoreResetBtn = document.getElementById('scoreReset');

  // FX layers
  const fxWin = document.getElementById('fxWin');
  const fxLose = document.getElementById('fxLose');
  const fxDraw = document.getElementById('fxDraw');
  const confettiCanvas = document.getElementById('confetti');
  const raysCanvas = document.getElementById('winRays');
  const shockCanvas = document.getElementById('winShock');
  const matrixCanvas = document.getElementById('matrix');
  const canvases = [confettiCanvas, raysCanvas, shockCanvas, matrixCanvas];

  // Game state
  let board = Array(9).fill(undefined);
  let playing = true;
  let mode = 'ai';       // 'ai' | 'pvp'
  let lastMode = 'ai';   // per rebuild opzioni solo quando cambia
  let turn = 'human';    // 'human'|'ai' (AI) — 'p1'|'p2' (PvP)
  let humanSym = 'X';
  let aiSym = 'O';
  let p1Sym = 'X', p2Sym = 'O';

  // ---------- SCORE ----------
  const LSKEY = 'oxo3_scoring_v1';
  let score = { total:0, best:0, streak:0, stats:{w:0,d:0,l:0} };
  function loadScore(){ try{ const s=JSON.parse(localStorage.getItem(LSKEY)); if(s&&typeof s.total==='number') score=s; }catch(e){} syncScoreUI(); }
  function saveScore(){ try{ localStorage.setItem(LSKEY, JSON.stringify(score)); }catch(e){} }
  function syncScoreUI(){ scoreTotalEl.textContent=Math.max(0,Math.floor(score.total)); scoreBestEl.textContent=Math.max(0,Math.floor(score.best)); scoreStreakEl.textContent=score.streak; scoreStatsEl.textContent=`W:${score.stats.w} D:${score.stats.d} L:${score.stats.l}`; }
  function resetScore(){ score={total:0,best:0,streak:0,stats:{w:0,d:0,l:0}}; saveScore(); syncScoreUI(); popScore('Azzera',0,'#4fe6ff'); }
  scoreResetBtn.addEventListener('click', resetScore);
  function diffMult(){ return ({easy:1.0,hard:1.5,impossible:2.0})[diffSel.value]||1.0; }
  function underdogBonus(){ return (mode==='ai' && firstSel.value==='ai') ? 1.10 : 1.0; }
  function streakMult(){ return 1 + Math.min(score.streak,5)*0.2; }
  function baseFor(r){ return r==='win'?100 : r==='draw'?30 : 0; }
  function penaltyForLoss(){ return ({easy:15,hard:10,impossible:5})[diffSel.value]||0; }
  function award(result){
    if(mode!=='ai') return; // niente XP in PvP
    let delta=0;
    if(result==='win'){ delta = baseFor('win') * diffMult() * streakMult() * underdogBonus(); score.streak+=1; score.stats.w++; }
    else if(result==='draw'){ delta = baseFor('draw') * diffMult(); score.stats.d++; }
    else { score.streak=0; score.stats.l++; score.total=Math.max(0, score.total-penaltyForLoss()); syncScoreUI(); popScore(`-${penaltyForLoss()} XP`, -penaltyForLoss(), '#ff9a9a'); saveScore(); return; }
    score.total += Math.round(delta);
    score.best = Math.max(score.best, score.total);
    syncScoreUI(); popScore(`+${Math.round(delta)} XP`, delta, (result==='win')?'#9aff9a':'#4fe6ff'); saveScore();
  }
  function popScore(txt, delta, color='#9aff9a'){ scorePop.textContent=txt; scorePop.style.borderColor=color; scorePop.style.boxShadow=`0 20px 40px rgba(0,0,0,.45), 0 0 24px ${color}55`; scorePop.classList.remove('show'); void scorePop.offsetWidth; scorePop.classList.add('show'); if(delta>0) coin(); }

  // ---------- AUDIO (SFX + MUSICA 8-bit) ----------
  let audioCtx=null, sfxGain, musicGain, rootGain;
  let sfxMuted=false, musicEnabled=true;
  function ensureAudio(){ if(audioCtx) return true; try{
      audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      rootGain=audioCtx.createGain(); rootGain.gain.value=.9; rootGain.connect(audioCtx.destination);
      sfxGain=audioCtx.createGain(); sfxGain.gain.value=sfxMuted?0:1; sfxGain.connect(rootGain);
      musicGain=audioCtx.createGain(); musicGain.gain.value=musicEnabled?.5:0; musicGain.connect(rootGain);
      return true;
    }catch(e){return false;} }
  function envTone(bus, f, {dur=.2,type='triangle',vol=.25,attack=.01,rel=.15,delay=0,det=0,pan=0}={}){
    if(!audioCtx) return; const t0=audioCtx.currentTime+delay; const o=audioCtx.createOscillator(); o.type=type; o.frequency.value=f;
    const g=audioCtx.createGain(); g.gain.value=0; const p=audioCtx.createStereoPanner(); p.pan.value=pan;
    o.connect(g); g.connect(p); p.connect(bus);
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(vol,t0+attack); g.gain.exponentialRampToValueAtTime(0.0001,t0+dur+rel);
    if(det){ const lfo=audioCtx.createOscillator(); const lg=audioCtx.createGain(); lfo.frequency.value=6; lg.gain.value=det; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t0); lfo.stop(t0+dur+rel+.1); }
    o.start(t0); o.stop(t0+dur+rel+.05);
  }
  function chordWin(){ if(!ensureAudio())return; const base=196; [base, base*1.25, base*1.5, base*2].forEach((n,i)=>envTone(sfxGain,n,{dur:.5,vol:.28,type:'sawtooth',attack:.01,rel:.35,delay:i*.03,det:2,pan:(i-1.5)*.25})); for(let i=0;i<8;i++) envTone(sfxGain,880*Math.pow(2,i/12),{dur:.12,vol:.12,type:'square',delay:.18+i*.04,pan:.5-Math.random()}); }
  function buzzLose(){ if(!ensureAudio())return; envTone(sfxGain,80,{dur:.5,type:'square',vol:.45}); envTone(sfxGain,60,{dur:.6,type:'sawtooth',vol:.3,delay:.05}); for(let i=0;i<6;i++) envTone(sfxGain,700+Math.random()*700,{dur:.05,type:'square',vol:.12,delay:.12+i*.06}); }
  function padDraw(){ if(!ensureAudio())return; const t=audioCtx.currentTime; const noise=audioCtx.createBuffer(1,audioCtx.sampleRate*1.6,audioCtx.sampleRate), d=noise.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2); const src=audioCtx.createBufferSource(); src.buffer=noise; const bi=audioCtx.createBiquadFilter(); bi.type='lowpass'; bi.frequency.value=6000; bi.frequency.exponentialRampToValueAtTime(500,t+1.5); const g=audioCtx.createGain(); g.gain.value=.0001; g.gain.exponentialRampToValueAtTime(.6,t+.1); g.gain.exponentialRampToValueAtTime(.0001,t+1.6); src.connect(bi); bi.connect(sfxGain); src.start(t); }
  function coin(){ if(!ensureAudio())return; const t=audioCtx.currentTime; const o=audioCtx.createOscillator(); o.type='square'; o.frequency.setValueAtTime(880,t); o.frequency.exponentialRampToValueAtTime(1320,t+0.08); const g=audioCtx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.3,t+.01); g.gain.exponentialRampToValueAtTime(0.0001,t+.25); o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t+.3); }

  // Musica 8bit (sequencer)
  let musicInterval=null, nextNoteTime=0, currentStep=0;
  const tempo=118, stepsPerBar=16, bars=4, totalSteps=stepsPerBar*bars, lookahead=.1, tick=25;
  const MEL=['G4',,'D5',,'C5',,'Bb4',,'A4',,'G4',,'D5',,'C5',,'E5',,'D5',,'C5',,'Bb4',,'A4',,'G4',,'A4',,'Bb4',,'G4',,'G5',,'E5',,'D5',,'C5',,'Bb4',,'A4',,'G4',,'D5',,'C5',,'Bb4',,'A4',,'G4',,,,,,,,];
  const BASS=Array(totalSteps).fill(null).map((_,i)=> (i%4===0 ? ((i%16<8)?'G2':'C3') : null));
  const HAT =Array(totalSteps).fill(null).map((_,i)=> (i%2===0));
  function n2f(n){ if(!n) return null; const M={'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11}; const m=n.match(/^([A-G][b#]?)(\d)$/); if(!m) return null; const semi=M[m[1]], oct=+m[2]; return 440*Math.pow(2,(semi+(oct-4)*12-9)/12);}
  function scheduleStep(step,time){ const m=MEL[step]; if(m){ const f=n2f(m); if(f) envTone(musicGain,f,{type:'square',vol:.16,dur:.18,attack:.005,rel:.12}); } const b=BASS[step]; if(b){ const f=n2f(b); if(f) envTone(musicGain,f,{type:'triangle',vol:.18,dur:.23,attack:.005,rel:.12,pan:-.1}); } if(HAT[step]) scheduleHat(time); }
  function scheduleHat(t){ const buffer=audioCtx.createBuffer(1, audioCtx.sampleRate*0.03, audioCtx.sampleRate); const ch=buffer.getChannelData(0); for(let i=0;i<ch.length;i++){ ch[i]=(Math.random()*2-1)*(1-i/ch.length); } const src=audioCtx.createBufferSource(); src.buffer=buffer; const bp=audioCtx.createBiquadFilter(); bp.type='highpass'; bp.frequency.value=6000; const g=audioCtx.createGain(); g.gain.value=0.15; src.connect(bp); bp.connect(g); g.connect(musicGain); src.start(t); }
  function nextStep(){ const sps=(60/tempo)/4; nextNoteTime+=sps; currentStep=(currentStep+1)%totalSteps; }
  function scheduler(){ if(!audioCtx) return; while(nextNoteTime < audioCtx.currentTime+lookahead){ scheduleStep(currentStep,nextNoteTime); nextStep(); } }
  function startMusic(){ if(!ensureAudio()||musicInterval) return; nextNoteTime=audioCtx.currentTime+.05; currentStep=0; musicInterval=setInterval(scheduler,tick); }
  function stopMusic(){ if(musicInterval){ clearInterval(musicInterval); musicInterval=null; } }
  document.addEventListener('DOMContentLoaded', async ()=>{ loadScore(); const ok=ensureAudio(); if(!ok) return; try{ if(audioCtx.state==='suspended') await audioCtx.resume(); startMusic(); tapAudio.classList.remove('show'); }catch(e){ tapAudio.classList.add('show'); } });
  ['pointerdown','touchstart','click'].forEach(ev=>{ window.addEventListener(ev, ()=>{ if(!audioCtx) ensureAudio(); if(audioCtx && audioCtx.state!=='running'){ audioCtx.resume().then(()=>{ if(musicEnabled) startMusic(); tapAudio.classList.remove('show'); }); } }, {once:true, passive:true}); });
  muteBtn.addEventListener('click', ()=>{ ensureAudio(); sfxMuted=!sfxMuted; if(sfxGain) sfxGain.gain.value=sfxMuted?0:1; muteBtn.textContent=sfxMuted?'OFF':'ON'; });
  musicBtn.addEventListener('click', ()=>{ ensureAudio(); musicEnabled=!musicEnabled; if(musicGain) musicGain.gain.value=musicEnabled?.5:0; musicBtn.textContent=musicEnabled?'ON':'OFF'; if(musicEnabled) startMusic(); else stopMusic(); });

  // ---------- BOARD UI ----------
  function drawBoard(){ boardEl.innerHTML=''; for(let i=0;i<9;i++){ const btn=document.createElement('button'); btn.className='cell'; btn.dataset.idx=i; btn.addEventListener('click',()=>onCell(i)); boardEl.appendChild(btn); } updateUI(); }
  function updateUI(){
    const cells=[...boardEl.children];
    for(let i=0;i<9;i++){
      cells[i].textContent = board[i] || '';
      if(mode==='ai'){ cells[i].disabled = !playing || !!board[i] || (turn!=='human'); }
      else           { cells[i].disabled = !playing || !!board[i]; } // PvP: entrambi umani
    }
  }
  function setStatus(t, blink=false){ statusEl.textContent=t; statusEl.classList.toggle('blink', blink); }
  function showWinLine(indices){
    if(!indices){ winlineEl.hidden=true; return; }
    const rect = boardEl.getBoundingClientRect();
    const cells=[...boardEl.children];
    const pt=(i)=>{ const r=cells[i].getBoundingClientRect(); return {x:r.left+r.width/2-rect.left, y:r.top+r.height/2-rect.top}; };
    const a=pt(indices[0]), b=pt(indices[indices.length-1]);
    const dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy), ang=Math.atan2(dy,dx)*180/Math.PI;
    const midX=(a.x+b.x)/2, midY=(a.y+b.y)/2;
    Object.assign(winlineEl.style,{width:len+'px',transform:`translate(${midX - len/2}px, ${midY}px) rotate(${ang}deg)`});
    winlineEl.hidden=false;
  }
  function clearWinLine(){ winlineEl.hidden=true; }

  // ---------- LOGIC ----------
  const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  function empties(b=board){ const out=[]; for(let i=0;i<9;i++) if(!b[i]) out.push(i); return out; }
  function winner(b=board){ for(const [a,c,d] of LINES){ if(b[a] && b[a]===b[c] && b[a]===b[d]) return b[a]; } if(empties(b).length===0) return 'draw'; return null; }
  function winCheckObj(b=board){ for(const [a,c,d] of LINES){ if(b[a] && b[a]===b[c] && b[a]===b[d]) return {player:b[a], line:[a,c,d]}; } if(empties(b).length===0) return {player:'draw', line:null}; return null; }

  // Aperture IA
  function bookFirstMove(){ if(!board[4]) return 4; for(const c of [0,2,6,8]) if(!board[c]) return c; return empties()[0]??null; }
  function bookSecondMove(){
    const oppCorner={0:8,2:6,6:2,8:0};
    for(const i of [0,2,6,8]) if(board[i]===getHumanSym() && !board[oppCorner[i]]) return oppCorner[i];
    const sidePref={1:0,3:0,5:2,7:6};
    for(const s of [1,3,5,7]) if(board[s]===getHumanSym() && !board[sidePref[s]]) return sidePref[s];
    return null;
  }

  // Minimax perfetto
  function bestMovePerfect(b, me){
    const other=(me==='X')?'O':'X'; const memo=new Map(); const key=(s,t)=>s.join('')+t;
    function ab(s,toPlay,depth,alpha,beta){
      const w = winner(s);
      if(w){ if(w==='draw') return 0; return (w===me)? 10-depth : depth-10; }
      const k=key(s,toPlay); if(memo.has(k)) return memo.get(k);
      const mv = orderMoves(empties(s));
      let best=(toPlay===me)?-Infinity:Infinity;
      if(toPlay===me){
        for(const m of mv){ s[m]=toPlay; const v=ab(s,other,depth+1,alpha,beta); s[m]=undefined; if(v>best) best=v; if(best>alpha) alpha=best; if(alpha>=beta) break; }
      } else {
        for(const m of mv){ s[m]=toPlay; const v=ab(s,me,depth+1,alpha,beta); s[m]=undefined; if(v<best) best=v; if(best<beta) beta=best; if(alpha>=beta) break; }
      }
      memo.set(k,best); return best;
    }
    const mv=empties(b);
    for(const m of mv){ b[m]=me; if(winner(b)===me){ b[m]=undefined; return m; } b[m]=undefined; }
    for(const m of mv){ b[m]=other; if(winner(b)===other){ b[m]=undefined; return m; } b[m]=undefined; }
    let bestScore=-Infinity, bestIdx=null;
    for(const m of orderMoves(mv)){ b[m]=me; const sc=ab(b,other,0,-Infinity,Infinity); b[m]=undefined; if(sc>bestScore){ bestScore=sc; bestIdx=m; } }
    return bestIdx;
    function orderMoves(m){ const center=4,corners=[0,2,6,8]; const pos=i=>(i===center?3:0)+(corners.includes(i)?2:0); return [...m].sort((a,b)=>pos(b)-pos(a)); }
  }

  function bestMoveHard(b, me){
    const other=(me==='X')?'O':'X'; const depthLimit=6; const memo=new Map(); const key=(s,t,d)=>s.join('')+t+d;
    function evalNode(s,toPlay,d,alpha,beta){
      const w = winner(s);
      if(w){ if(w==='draw') return 0; return (w===me)? 10-d : d-10; }
      if(d>=depthLimit) return heuristic(s,me);
      const k=key(s,toPlay,d); if(memo.has(k)) return memo.get(k);
      const mv=orderMoves(empties(s));
      let best=(toPlay===me)?-Infinity:Infinity;
      if(toPlay===me){ for(const m of mv){ s[m]=toPlay; const v=evalNode(s,other,d+1,alpha,beta); s[m]=undefined; if(v>best) best=v; if(best>alpha) alpha=best; if(alpha>=beta) break; } }
      else { for(const m of mv){ s[m]=toPlay; const v=evalNode(s,me,d+1,alpha,beta); s[m]=undefined; if(v<best) best=v; if(best<beta) beta=best; if(alpha>=beta) break; } }
      memo.set(k,best); return best;
    }
    const scored=[]; for(const m of empties(b)){ b[m]=me; const sc=evalNode(b,other,0,-Infinity,Infinity); b[m]=undefined; scored.push([sc,m]); }
    scored.sort((a,b)=>b[0]-a[0]); if(Math.random()<0.12 && scored[1]) return scored[1][1]; return scored[0][1];
    function orderMoves(m){ const center=4,corners=[0,2,6,8]; const pos=i=>(i===center?3:0)+(corners.includes(i)?2:0); return [...m].sort((a,b)=>pos(b)-pos(a)); }
  }

  function bestMoveEasy(b, me){
    const other=(me==='X')?'O':'X'; const mv=empties(b);
    const blockable = mv.filter(m=>{ b[m]=other; const w=winner(b); b[m]=undefined; return w===other; });
    if(blockable.length && Math.random()<0.5){ const others=mv.filter(m=>!blockable.includes(m)); if(others.length) return weak(others); }
    const winNow = mv.filter(m=>{ b[m]=me; const w=winner(b); b[m]=undefined; return w===me; });
    if(winNow.length){ if(Math.random()<0.7) return pick(winNow); const others=mv.filter(m=>!winNow.includes(m)); if(others.length) return weak(others); }
    return weak(mv);
    function weak(c){ const sides=[1,3,5,7],corners=[0,2,6,8],center=4; const s1=c.filter(i=>sides.includes(i)); if(s1.length) return pick(s1); const s2=c.filter(i=>i!==center && !corners.includes(i)); if(s2.length) return pick(s2); return pick(c); }
    function pick(a){ return a[Math.floor(Math.random()*a.length)] }
  }

  function heuristic(s, me){
    const other=(me==='X')?'O':'X'; let score=0;
    for(const [a,c,d] of LINES){ const v=[s[a],s[c],s[d]]; const o=v.filter(x=>x===me).length, x=v.filter(x=>x===other).length;
      if(o&&x) continue;
      if(o===3) score+=1000; else if(x===3) score-=1000;
      else if(o===2) score+=26; else if(x===2) score-=28;
      else if(o===1) score+=4;  else if(x===1) score-=5;
    }
    if(s[4]===me) score+=6; else if(s[4]===other) score-=6;
    for(const i of [0,2,6,8]){ if(s[i]===me) score+=3; else if(s[i]===other) score-=3; }
    return score;
  }

  // ---------- INPUT ----------
  function onCell(i){
    if(!playing || board[i]) return;
    if(mode==='ai'){
      if(turn!=='human') return;
      board[i]=humanSym; afterMove();
    } else {
      const sym = (turn==='p1') ? p1Sym : p2Sym;
      board[i]=sym; afterMove();
    }
  }

  function afterMove(){
    const w=winCheckObj(board); updateUI();
    if(w){ end(w); return; }
    if(mode==='ai'){
      turn='ai'; setStatus('Computer pensa…', true); updateUI();
      const guard=setTimeout(()=>{ if(turn==='ai'){ turn='human'; setStatus('Tocca a te ('+humanSym+').'); updateUI(); } }, 2000);
      setTimeout(()=>{ aiTurn(); clearTimeout(guard); }, 120);
    } else {
      turn = (turn==='p1') ? 'p2' : 'p1';
      const nextSym = (turn==='p1') ? p1Sym : p2Sym;
      setStatus(`Tocca a ${turn==='p1'?'Giocatore X':'Giocatore O'} (${nextSym}).`);
      updateUI();
    }
  }

  function aiTurn(){
    let move=null, level=diffSel.value, ply=board.filter(Boolean).length;
    try{
      if(level==='impossible'){
        if(ply===0) move=bookFirstMove();
        else if(ply===1) move=bookSecondMove() ?? bestMovePerfect(board, aiSym);
        else move = bestMovePerfect(board, aiSym);
      } else if(level==='hard'){ move = bestMoveHard(board, aiSym); }
      else { move = bestMoveEasy(board, aiSym); }
      if(move==null){ const em=empties(); move = em.length? em[0]:null; }
      if(move!=null){ board[move]=aiSym; const w=winCheckObj(board); updateUI(); if(w){ end(w); return; } }
      turn='human'; setStatus('Tocca a te ('+humanSym+').'); updateUI();
    }catch(e){ console.error(e); turn='human'; setStatus('Tocca a te ('+humanSym+').'); updateUI(); }
  }

  // ---------- FX ----------
  function resizeCanvas(c){ const dpr=Math.max(1, Math.min(2, window.devicePixelRatio||1)); c.width=window.innerWidth*dpr; c.height=window.innerHeight*dpr; const ctx=c.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); }
  function resizeAll(){ canvases.forEach(resizeCanvas); }
  window.addEventListener('resize', resizeAll); window.addEventListener('orientationchange', ()=>setTimeout(resizeAll,250));
  function startWinFX(){ fxWin.classList.add('active'); document.querySelector('.crt').classList.add('tilt'); chordWin(); resizeAll(); drawRays(raysCanvas); drawShock(shockCanvas); startConfetti(confettiCanvas); setTimeout(()=>{ fxWin.classList.remove('active'); document.querySelector('.crt').classList.remove('tilt'); },1700); }
  function drawRays(c){ const ctx=c.getContext('2d'); const W=c.width,H=c.height; ctx.clearRect(0,0,W,H);
    for(let i=0;i<14;i++){ const angle=(i/14)*Math.PI*2+Math.random()*0.2; const grad=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H));
      const hue=120+Math.random()*50; grad.addColorStop(0,`hsla(${hue},100%,60%,.35)`); grad.addColorStop(1,`hsla(${hue},100%,50%,0)`); ctx.save(); ctx.translate(W/2,H/2); ctx.rotate(angle); ctx.fillStyle=grad; ctx.fillRect(0,-8,Math.max(W,H),16); ctx.restore(); } }
  function drawShock(c){ const ctx=c.getContext('2d'); const W=c.width,H=c.height,cx=W/2,cy=H/2; let r=20,a=.95; (function loop(){ ctx.clearRect(0,0,W,H); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.strokeStyle=`rgba(60,255,122,${a})`; ctx.lineWidth=8; ctx.stroke(); r+=20; a*=.9; if(a>0.02) requestAnimationFrame(loop); })(); }
  function startConfetti(c){ const ctx=c.getContext('2d'); const W=c.width,H=c.height,dpr=devicePixelRatio||1; let parts=Array.from({length:420},()=>spawn()); let last=performance.now();
    function spawn(){ const x=Math.random()*W,y=-20*dpr; const vx=(Math.random()*2-1)*.5*dpr, vy=(.8+Math.random()*0.9)*dpr; const size=(6+Math.random()*12)*dpr;
      const hue=[120,145,95,160,180][Math.floor(Math.random()*5)]; return {x,y,vx,vy,size,rot:Math.random()*Math.PI,vr:(Math.random()*2-1)*.14,color:`hsl(${hue} 100% 60%)`,life:1.6+Math.random()*0.8,shape:Math.random()<.5?'rect':'tri'}; }
    function draw(p){ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.color; ctx.globalAlpha=Math.max(0,p.life);
      if(p.shape==='rect'){ ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*.66); } else { ctx.beginPath(); ctx.moveTo(0,-p.size/2); ctx.lineTo(p.size/2,p.size/2); ctx.lineTo(-p.size/2,p.size/2); ctx.closePath(); ctx.fill(); } ctx.restore(); }
    function loop(t){ const dt=Math.min(32,t-last); last=t; ctx.clearRect(0,0,W,H);
      parts=parts.filter(p=>p.life>0 && p.y<H+40*dpr);
      for(const p of parts){ p.vy+=0.001*dt; p.x+=p.vx*dt/16; p.y+=p.vy*dt/16; p.rot+=p.vr*dt/16; p.life-=dt/1200; draw(p); }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
  function startDrawFX(){ fxDraw.classList.add('active'); document.querySelector('.crt').classList.add('tilt'); padDraw(); resizeCanvas(matrixCanvas);
    const ctx=matrixCanvas.getContext('2d'); const W=matrixCanvas.width,H=matrixCanvas.height,dpr=devicePixelRatio||1; const cols=Math.floor(W/(14*dpr));
    const drops=Array(cols).fill(0).map(()=>Math.random()*H); const chars='01▌▍▎▏█░▒▓'; ctx.font=`${14*dpr}px monospace`;
    (function loop(){ ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fillRect(0,0,W,H); for(let i=0;i<drops.length;i++){ const txt=chars[Math.floor(Math.random()*chars.length)];
      ctx.fillStyle=`hsla(185,100%,60%,${0.7+Math.random()*0.3})`; ctx.fillText(txt,i*14*dpr,drops[i]*1.05); drops[i]+=12; if(drops[i]*1.05>H || Math.random()>.97) drops[i]=-20; } requestAnimationFrame(loop); })();
    setTimeout(()=>{ fxDraw.classList.remove('active'); document.querySelector('.crt').classList.remove('tilt'); }, 1600);
  }

  // ---------- END & RESET ----------
  function end(w){
    playing=false; updateUI();
    if(w.player==='draw'){ setStatus('Parità. “Nuova partita” per riprovare.'); startDrawFX(); award('draw'); }
    else {
      const who = (mode==='ai')
        ? (w.player===humanSym ? 'Hai vinto! 🟢' : 'Hai perso. 💫')
        : (w.player===p1Sym ? 'Vince Giocatore X! 🟢' : 'Vince Giocatore O! 🟢');
      setStatus(who);
      showWinLine(w.line);
      if(mode==='ai'){ if(w.player===humanSym){ startWinFX(); award('win'); } else { buzzLose(); fxLose.classList.add('active'); setTimeout(()=>fxLose.classList.remove('active'),900); award('loss'); } }
      else { startWinFX(); }
    }
  }
  function getHumanSym(){ return humanSym; }

  // ===== FIX: ricostruisco "Chi inizia" SOLO quando cambia modalità, preservando selezione =====
  function buildFirstSelOptionsForMode(targetMode){
    const prev = firstSel.value;
    if(targetMode==='ai'){
      firstSel.innerHTML = '<option value="human">Giocatore</option><option value="ai">Computer</option>';
      if(prev==='ai' || prev==='human') firstSel.value = prev; else firstSel.value='human';
    } else {
      firstSel.innerHTML = '<option value="p1">Giocatore X</option><option value="p2">Giocatore O</option>';
      if(prev==='p1' || prev==='p2') firstSel.value = prev; else firstSel.value='p1';
    }
  }
  function applyUIForMode(modeChanged){
    if(mode==='ai'){
      if(modeChanged) buildFirstSelOptionsForMode('ai');
      diffRow.style.display = '';
      hintEl.innerHTML = (diffSel.value==='impossible')
        ? 'Impossibile: IA <b>perfetta</b> (non perde mai). Puoi scegliere chi apre.'
        : 'Difficile/Facile: puoi scegliere chi apre.';
    } else {
      if(modeChanged) buildFirstSelOptionsForMode('pvp');
      diffRow.style.display = 'none';
      hintEl.innerHTML = '2 Giocatori (locale): passate il dispositivo. Vince chi fa tris!';
    }
  }
  function applyRules(modeChanged){
    mode = modeSel.value;
    applyUIForMode(modeChanged);
    if(mode==='ai'){
      if(firstSel.value==='ai'){ aiSym='X'; humanSym='O'; }
      else { humanSym='X'; aiSym='O'; }
    } else { p1Sym='X'; p2Sym='O'; }
  }
  function reset(modeChanged=false){
    applyRules(modeChanged);
    board = Array(9).fill(undefined);
    playing=true; clearWinLine();
    drawBoard();
    if(mode==='ai'){
      if(firstSel.value==='ai'){
        turn='ai'; setStatus('Il computer apre… ('+aiSym+').', true); updateUI(); setTimeout(aiTurn, 220);
      } else {
        turn='human'; setStatus('Tocca a te ('+humanSym+').'); updateUI();
      }
    } else {
      turn = (firstSel.value==='p2') ? 'p2' : 'p1';
      setStatus(`Tocca a ${turn==='p1'?'Giocatore X':'Giocatore O'} (${turn==='p1'?p1Sym:p2Sym}).`);
      updateUI();
    }
  }

  // Events
  newBtn.addEventListener('click', ()=>reset(false));
  modeSel.addEventListener('change', ()=>{
    const newMode = modeSel.value;
    const modeChanged = (newMode !== lastMode);
    lastMode = newMode;
    reset(modeChanged); // ricostruiamo opzioni solo qui
  });
  firstSel.addEventListener('change', ()=>reset(false));
  diffSel.addEventListener('change', ()=>reset(false));
  window.addEventListener('keydown', (e)=>{
    if(e.key==='n' || e.key==='N'){ e.preventDefault(); reset(false); return; }
    const map={'7':0,'8':1,'9':2,'4':3,'5':4,'6':5,'1':6,'2':7,'3':8};
    if(map(e.key)!=null){ e.preventDefault(); const idx=map[e.key]; const cellBtn = boardEl.children[idx]; if(cellBtn && !cellBtn.disabled) cellBtn.click(); }
    function map(k){ return {'7':0,'8':1,'9':2,'4':3,'5':4,'6':5,'1':6,'2':7,'3':8}[k]; }
  });

  // Init
  modeSel.value='ai';
  lastMode='ai';
  buildFirstSelOptionsForMode('ai'); // inizializza opzioni una volta sola
  diffSel.value='impossible';
  firstSel.value='ai'; // di default apre il Computer
  reset(false);
  loadScore();

  // FX helpers referenced before
  function startWinFX(){ fxWin.classList.add('active'); document.querySelector('.crt').classList.add('tilt'); chordWin(); resizeAll(); drawRays(raysCanvas); drawShock(shockCanvas); startConfetti(confettiCanvas); setTimeout(()=>{ fxWin.classList.remove('active'); document.querySelector('.crt').classList.remove('tilt'); },1700); }
})();
