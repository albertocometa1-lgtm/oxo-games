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
  let lastMode = 'ai';
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
