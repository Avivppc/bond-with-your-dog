(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------- Screen registry: [id, label, group, navKey, bare] ----------
  const SCREENS = [
    ['onboarding', 'Onboarding · 4 steps', 'Getting started', null, true],
    ['reset', 'Reset password', 'Getting started', null, true],
    ['home-new', 'Home · day one', 'Getting started', 'home'],
    ['home', 'Home', 'Home', 'home'],
    ['notifications', 'Notifications', 'Home', null],
    ['search', 'Search results', 'Home', 'moves'],
    ['courses', 'My Courses', 'Learn', 'courses'],
    ['course', 'Course overview · Foundations', 'Learn', 'courses'],
    ['lesson', 'Lesson player', 'Learn', 'courses'],
    ['quiz', 'Lesson checkpoint', 'Learn', 'courses'],
    ['complete', 'Lesson complete', 'Learn', 'courses'],
    ['certificate', 'Certificate', 'Learn', 'courses'],
    ['moves', 'Moves Library', 'Learn', 'moves'],
    ['practice', 'Practice mode', 'Practice', 'practice'],
    ['plan', 'Weekly plan & history', 'Practice', 'practice'],
    ['routine', 'Routine builder', 'Practice', 'practice'],
    ['upload', 'Send a video to Roni', 'Feedback', 'feedback'],
    ['feedback', 'Your videos', 'Feedback', 'feedback'],
    ['feedback-view', "Roni's feedback", 'Feedback', 'feedback'],
    ['progress', 'Progress & achievements', 'Progress', 'progress'],
    ['community', 'Community hub', 'Community', 'community'],
    ['profile', 'Profile', 'Account', 'settings'],
    ['dogs', 'Your dogs', 'Account', 'settings'],
    ['settings', 'Settings & privacy', 'Account', 'settings'],
    ['membership', 'Membership & purchases', 'Account', 'settings'],
    ['help', 'Help', 'Account', 'help'],
    ['states', 'Locked, offline, error, empty', 'System', null],
    ['studio', "Roni's Studio · review queue", 'Roni', null],
  ];
  const byId = Object.fromEntries(SCREENS.map((s) => [s[0], s]));

  // ---------- Router ----------
  function show(id) {
    const entry = byId[id] || byId.home;
    $$('.screen').forEach((el) => el.classList.toggle('on', el.dataset.screen === entry[0]));
    document.body.classList.toggle('bare', !!entry[4]);
    $$('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === entry[3]));
    $$('#drawerList a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + entry[0]));
    window.scrollTo({ top: 0 });
    closeDrawer();
    closeDogMenu();
  }
  const route = () => show(location.hash.replace('#', '') || 'home');
  window.addEventListener('hashchange', route);

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2400);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-toast]');
    if (!b) return;
    e.preventDefault();
    toast(b.dataset.toast);
  });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      toast('Link copied');
    } catch {
      toast(b.dataset.copy);
    }
  });

  // ---------- Screen map drawer ----------
  const groups = [...new Set(SCREENS.map((s) => s[2]))];
  $('#drawerList').innerHTML = groups
    .map((g) => `<div><h3>${g}</h3>${SCREENS.filter((s) => s[2] === g)
      .map((s) => `<a href="#${s[0]}">${s[1]}${s[4] ? '<small>no sidebar</small>' : ''}</a>`)
      .join('')}</div>`)
    .join('');
  $('#mapCount').textContent = SCREENS.length;
  function openDrawer() { $('#drawer').hidden = false; $('#drawerBack').hidden = false; }
  function closeDrawer() { $('#drawer').hidden = true; $('#drawerBack').hidden = true; }
  $('#mapBtn').addEventListener('click', openDrawer);
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#drawerBack').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDrawer(); closeDogMenu(); } });

  // ---------- Dog switcher ----------
  const DOGS = {
    luna: { name: 'Luna', img: 'img/luna.jpg', meta: 'Border Collie · 4 years · training since September 2' },
    milo: { name: 'Milo', img: 'img/milo.jpg', meta: 'Border Collie · 2 years · training since September 16' },
  };
  function closeDogMenu() { $('#dogMenu').hidden = true; $('#dogChip').setAttribute('aria-expanded', 'false'); }
  $('#dogChip').addEventListener('click', (e) => {
    e.stopPropagation();
    const m = $('#dogMenu');
    m.hidden = !m.hidden;
    $('#dogChip').setAttribute('aria-expanded', String(!m.hidden));
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#dogMenu') && !e.target.closest('#dogChip')) closeDogMenu(); });
  function setDog(key) {
    const d = DOGS[key];
    $('#dogChipImg').src = d.img;
    $('#dogChipName').textContent = d.name;
    $$('[data-dogname]').forEach((el) => (el.textContent = d.name));
    $('#progDogImg').src = d.img;
    $('#progDogMeta').textContent = d.meta;
    $$('#dogMenu [data-dog]').forEach((b) => ($('.check', b).hidden = b.dataset.dog !== key));
    closeDogMenu();
    toast(`Now training with ${d.name}`);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dog]');
    if (b) setDog(b.dataset.dog);
  });

  // ---------- Generic controls: tabs, segmented, multi-select, switches ----------
  document.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tabs] button');
    if (tab) $$('button', tab.parentElement).forEach((b) => b.classList.toggle('on', b === tab));
    const seg = e.target.closest('[data-seg] button');
    if (seg) $$('button', seg.parentElement).forEach((b) => b.classList.toggle('on', b === seg));
    const multi = e.target.closest('[data-multi] > button, #prefDays > button');
    if (multi) multi.classList.toggle('on');
    const sw = e.target.closest('.switch');
    if (sw) sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true'));
  });

  // ---------- Progress rings ----------
  $$('[data-ring]').forEach((el) => {
    const pct = +el.dataset.ring;
    const size = +el.dataset.size || 60;
    const r = size / 2 - 5;
    const c = 2 * Math.PI * r;
    el.innerHTML = `<svg width="${size}" height="${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--tint-2)" stroke-width="5"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--orange)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/></svg><b style="font-size:${size > 60 ? 16 : 13}px">${pct}%</b>`;
  });

  // ---------- Foundations lessons ----------
  const LESSONS = [
    ['The Bond Begins', '11 min', 'hug'], ['Focus & Eye Contact', '13 min', 'hand-touch'], ['Hand Target', '12 min', 'wall'],
    ['Following the Hand', '15 min', 'walk'], ['Your First Spin', '12 min', 'lure'], ['Body Awareness', '16 min', 'stairs-jump'],
    ['Calm Starts', '10 min', 'steps'], ["Reading Your Dog's Focus", '14 min', 'two-up'], ['Position Changes', '17 min', 'sitpretty'],
    ['Your First Sequence', '20 min', 'dance'],
  ];
  const stateIc = (i, style = '') => {
    const [cls, icon] = i < 7 ? ['done', 'check'] : i === 7 ? ['next', 'play_arrow'] : ['lock', 'lock'];
    return `<span class="state-ic ${cls}" style="${style}"><span class="ms sm">${icon}</span></span>`;
  };
  $('#lessonList').innerHTML = LESSONS.map((l, i) => `
    <a class="lesson-row ${i === 7 ? 'current' : ''} ${i > 7 ? 'locked' : ''}" href="${i > 7 ? '#states' : '#lesson'}">
      <span class="n">${String(i + 1).padStart(2, '0')}</span>
      <span class="th"><img src="img/${l[2]}.jpg" alt=""></span>
      <span><b>${l[0]}</b><span class="faint" style="display:block">${l[1]}${i === 7 ? ' · Up next' : i === 8 ? ' · Opens Friday' : i === 9 ? ' · Opens in 6 days' : ''}</span></span>
      ${stateIc(i)}
    </a>`).join('');
  $('#miniLessons').innerHTML = LESSONS.map((l, i) => `
    <a class="list-row ${i === 7 ? 'current' : ''}" href="${i > 7 ? '#states' : '#lesson'}" style="${i > 7 ? 'opacity:.5' : ''}">
      ${stateIc(i, 'width:24px;height:24px')}
      <span class="grow">${i + 1}. ${l[0]}</span><span class="faint">${l[1]}</span>
    </a>`).join('');

  // ---------- Moves library ----------
  const MOVES = [
    ['Eye Contact', 'basic-foundations', 'Foundations', 2, 'reliable', 'Look', 'Hold a treat at your eye line. Mark the moment her eyes meet yours, then reward away from your face.'],
    ['Hand Target', 'basic-skills', 'Foundations', 3, 'perform', 'Touch', 'Present a flat palm. Mark the nose touch and reward. Move the hand a little further each time.'],
    ['Follow the Hand', 'moving-together', 'Foundations', 4, 'reliable', 'With me', 'Keep your hand at nose height and walk slowly. Reward every few steps she stays glued to it.'],
    ['Spin', 'artistic-impressions', 'Foundations', 5, 'learning', 'Spin', 'Lure a slow circle at nose height. Pause one beat, add the cue, and reward on the finish.'],
    ['Sit Pretty', 'basic-tricks', 'Foundations', 9, 'learning', 'Pretty', 'From a sit, lure the nose up and back. Reward the first lift of the front paws. Keep it short.'],
    ['Calm Connection', 'give-a-hug', 'Foundations', 7, 'reliable', 'Settle', 'Sit on the floor, breathe slowly and reward her for lying close. End every session here.'],
    ['Wave', 'intro', 'Foundations', 10, 'none', 'Wave', 'Build from a paw target: hold your hand a little higher each time until the paw lifts in the air.'],
    ['Heel Walk', 'leash-walking', 'Moves', 1, 'none', 'Heel', 'Hand at your hip, treat at her nose. Two steps, reward. Grow to ten.'],
    ['Bunny Hop', 'drunk-bunny', 'Moves', 5, 'none', 'Hop', 'From sit pretty, lure slightly forward for one small hop. Skip this move for dogs with joint issues.'],
    ['Roll Over', 'fun-tricks', 'Moves', 3, 'none', 'Roll', 'From a down, lure the nose over the shoulder. Let her roll at her own speed on a soft surface.'],
    ['Balance Walk', 'model-walk', 'Moves', 6, 'none', 'Walk on', 'Guide her along a low, wide bench. Keep a hand by her side. Confidence first, then speed.'],
    ['Jump', 'jump-basics', "Let's Dance", 2, 'none', 'Over', 'Start with a pole on the floor. Raise it only when she clears it with ease.'],
    ['Hoop Jump', 'hoop-jumps', "Let's Dance", 4, 'none', 'Hoop', 'Hold the hoop on the ground first. Reward walking through before any height.'],
    ['Partner Step', 'dancing-skills', "Let's Dance", 7, 'none', 'Dance', 'Paws on your forearms, take small steps together. Only for adult dogs without joint issues.'],
    ['Photo Pose', 'take-a-selfie', "Let's Dance", 9, 'none', 'Pose', 'Chin rest plus stillness. Great for the final frame of a routine.'],
  ];
  const PILL = { learning: ['learning', 'Learning'], reliable: ['reliable', 'Reliable'], perform: ['perform', 'Performance-ready'], none: ['neutral', 'Not started'] };
  let moveFilter = 'all';
  let selMove = 3;
  function renderMoves() {
    $('#movesGrid').innerHTML = MOVES.map((m, i) => ({ m, i }))
      .filter(({ m }) => moveFilter === 'all' || m[2] === moveFilter || m[4] === moveFilter)
      .map(({ m, i }) => `<button class="move ${i === selMove ? 'sel' : ''}" data-move="${i}"><div class="sketch"><img src="img/${m[1]}.jpg" alt=""></div><b>${m[0]}</b><div class="between" style="align-items:center"><small>${m[2]}</small><span class="pill ${PILL[m[4]][0]}">${PILL[m[4]][1]}</span></div></button>`)
      .join('');
    const m = MOVES[selMove];
    $('#moveDetail').innerHTML = `
      <div class="sketch" style="aspect-ratio:1.3"><img src="img/${m[1]}.jpg" alt="" style="width:62%"></div>
      <div class="head-block"><span class="eyebrow">${m[2]} · Lesson ${m[3]}</span><h2 class="h2">${m[0]}</h2></div>
      <div class="row"><span class="chip">Cue: "${m[5]}"</span><span class="pill ${PILL[m[4]][0]}">${PILL[m[4]][1]}</span></div>
      <p class="muted">${m[6]}</p>
      <a class="btn btn-primary" href="#practice"><span class="ms sm">pets</span>Practise ${m[0].toLowerCase()}</a>
      <a class="link" href="#lesson">Watch the lesson<span class="ms">arrow_forward</span></a>`;
  }
  $('#moveFilters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    moveFilter = b.dataset.f;
    $$('[data-f]').forEach((x) => x.classList.toggle('on', x === b));
    renderMoves();
  });
  $('#movesGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-move]');
    if (!b) return;
    selMove = +b.dataset.move;
    renderMoves();
  });
  renderMoves();

  // ---------- Progress skills ----------
  const LEVEL = { learning: 'l1', reliable: 'l2', perform: 'l3', none: '' };
  $('#skillList').innerHTML = MOVES.slice(0, 7).map((m) => `
    <div class="skill-track"><img src="img/${m[1]}.jpg" alt=""><div><b>${m[0]}</b><div class="faint">${m[2]} · Lesson ${m[3]}</div></div>
    <div class="levels-wrap stack" style="gap:6px"><div class="levels ${LEVEL[m[4]]}"><i></i><i></i><i></i></div><span class="faint">${PILL[m[4]][1]}</span></div></div>`).join('');
  $$('[data-dots]').forEach((el) => {
    const n = +el.dataset.dots, done = +el.dataset.done;
    el.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < done ? 'done' : i === done && done > 0 ? 'now' : ''}">${i + 1}</i>`).join('');
  });

  // ---------- Practice timer & reps ----------
  const TOTAL = 180;
  let left = TOTAL, running = false, tick;
  const arc = $('#timerArc');
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  function paintTimer() {
    $('#timerText').textContent = fmt(left);
    arc.setAttribute('stroke-dashoffset', String(553 * (1 - left / TOTAL)));
  }
  $('#timerBtn').addEventListener('click', () => {
    running = !running;
    $('#timerBtn').innerHTML = running ? '<span class="ms sm">pause</span>Pause' : '<span class="ms sm">play_arrow</span>Resume';
    $('#timerState').textContent = running ? 'Running' : 'Paused';
    clearInterval(tick);
    if (running) tick = setInterval(() => {
      left = Math.max(0, left - 1);
      paintTimer();
      if (!left) { clearInterval(tick); running = false; $('#timerState').textContent = 'Done'; toast('Step time is up. Great session.'); }
    }, 1000);
  });
  paintTimer();
  let reps = 4;
  $('#repBtn').addEventListener('click', () => {
    reps = Math.min(8, reps + 1);
    $('#repCount').textContent = reps;
    if (reps === 8) toast('8 reps. Take a short break.');
  });

  // ---------- Quiz ----------
  let quizPicked = null, quizChecked = false;
  $('#quizOptions').addEventListener('click', (e) => {
    const o = e.target.closest('.option');
    if (!o || quizChecked) return;
    quizPicked = o;
    $$('.option').forEach((x) => x.classList.toggle('sel', x === o));
  });
  $('#quizBtn').addEventListener('click', () => {
    if (quizChecked) { location.hash = '#complete'; return; }
    if (!quizPicked) { toast('Choose an answer first'); return; }
    quizChecked = true;
    $$('.option').forEach((x) => { x.classList.remove('sel'); if (x.dataset.correct === 'true') x.classList.add('right'); });
    if (quizPicked.dataset.correct !== 'true') quizPicked.classList.add('wrong');
    $('#quizFeedback').hidden = false;
    $('#quizBtn').textContent = 'Next question';
  });

  // ---------- Calendar heatmap (September 2026 starts on a Tuesday) ----------
  const levels = { 1: 2, 3: 1, 4: 3, 6: 2, 8: 1, 10: 2, 13: 3, 14: 2, 15: 1, 16: 2, 17: 3, 18: 2, 20: 1, 22: 2, 24: 3, 25: 2 };
  const heads = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<span class="h">${d}</span>`).join('');
  const blanks = '<span class="x"></span>';
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = i + 1;
    const cls = [levels[d] ? 'l' + levels[d] : '', d === 25 ? 'today' : ''].join(' ');
    return `<span class="${cls}">${d}</span>`;
  }).join('');
  $('#cal').innerHTML = heads + blanks + days;

  // ---------- Routine builder ----------
  let blocks = [['Heel Walk', 18, 'c1'], ['Spin', 8, 'c2'], ['Follow the Hand', 22, 'c3'], ['Sit Pretty', 10, 'c4'], ['Calm Connection', 14, 'c5']];
  const SONG = 168;
  function renderLanes() {
    const used = blocks.reduce((a, b) => a + b[1], 0);
    let t = 0;
    $('#lanes').innerHTML = blocks.map((b, i) => {
      const start = t; t += b[1];
      return `<button class="block ${b[2]}" data-block="${i}" style="flex:${b[1]} 0 0" title="Remove ${b[0]}"><b>${b[0]}</b>${fmt(start).slice(1)}–${fmt(t).slice(1)}</button>`;
    }).join('') + (used < SONG ? `<div style="flex:${SONG - used} 0 0;border-radius:14px;box-shadow:inset 0 0 0 1.5px rgba(36,48,54,.15);display:grid;place-items:center;font-size:12px;color:var(--ink-3)">Free · ${SONG - used}s</div>` : '');
    $('#routineInfo').textContent = `${blocks.length} moves · ${used}s of ${SONG}s planned · tap a move to remove it`;
  }
  $('#palette').innerHTML = MOVES.slice(0, 7).map((m) => `<button data-add="${m[0]}"><img src="img/${m[1]}.jpg" alt="">${m[0]}</button>`).join('');
  $('#palette').addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    const used = blocks.reduce((a, x) => a + x[1], 0);
    if (used + 10 > SONG) { toast('The song is full. Remove a move first.'); return; }
    blocks = [...blocks, [b.dataset.add, 10, 'c' + ((blocks.length % 5) + 1)]];
    renderLanes();
  });
  $('#lanes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-block]');
    if (!b) return;
    blocks = blocks.filter((_, i) => i !== +b.dataset.block);
    renderLanes();
  });
  renderLanes();

  // ---------- Upload ----------
  $('#upFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    $('#drop').classList.add('has');
    $('#dropTitle').textContent = f.name;
    $('#dropSub').textContent = `${(f.size / 1048576).toFixed(1)} MB · ready to send`;
  });
  const drop = $('#drop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('has'); });
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { $('#dropTitle').textContent = f.name; $('#dropSub').textContent = 'Ready to send'; }
  });
  $('#uploadForm').addEventListener('submit', (e) => {
    e.preventDefault();
    toast('Video sent. Roni will reply in your Feedback tab.');
    setTimeout(() => (location.hash = '#feedback'), 900);
  });

  // ---------- Feedback timeline ----------
  $('#fbComments').addEventListener('click', (e) => {
    const c = e.target.closest('.comment');
    if (!c) return;
    $$('#fbComments .comment').forEach((x) => x.classList.toggle('on', x === c));
    $('#fbKnob').style.left = c.dataset.pos + '%';
    $('#fbFill').style.width = c.dataset.pos + '%';
    $('#fbTime').textContent = `${c.dataset.t} / 00:34`;
  });

  // ---------- Community / help / reset forms ----------
  $('#qaForm').addEventListener('submit', (e) => { e.preventDefault(); if (!$('#qaQ').value.trim()) { toast('Write your question first'); return; } $('#qaQ').value = ''; toast('Your question is on the list for January 14'); });
  $('#bugForm').addEventListener('submit', (e) => { e.preventDefault(); if (!$('#bugText').value.trim()) { toast('Tell us what happened first'); return; } $('#bugText').value = ''; toast('Thanks. The team will look into it.'); });
  $('#resetForm').addEventListener('submit', (e) => { e.preventDefault(); $('#resetDone').hidden = false; });
  $('#markRead').addEventListener('click', () => { $$('.notif.unread').forEach((n) => n.classList.remove('unread')); toast('All caught up'); });

  // ---------- Settings: delete confirm ----------
  $('#delBtn').addEventListener('click', () => ($('#delConfirm').hidden = false));
  $('#delCancel').addEventListener('click', () => ($('#delConfirm').hidden = true));

  // ---------- Studio queue ----------
  const QUEUE = [
    ['Sarah & Luna', 'luna', 'Sit Pretty', 'Today', 'New'],
    ['Maya & Pepper', 'milo', 'Spin', '1 day', 'New'],
    ['Tom & Kira', 'luna', 'Hand Target', '2 days', 'New'],
    ['Lea & Bo', 'milo', 'Follow the Hand', '3 days', 'Overdue'],
  ];
  $('#queue').innerHTML = QUEUE.map((q, i) => `
    <button class="queue-row ${i === 0 ? 'on' : ''}" data-q="${i}">
      <span class="who"><img src="img/${q[1]}.jpg" alt=""><b>${q[0]}</b></span>
      <span class="hide-sm">${q[2]}</span><span class="faint hide-sm">${q[3]}</span>
      <span class="pill ${q[4] === 'Overdue' ? 'danger' : 'learning'}">${q[4]}</span>
    </button>`).join('');
  $('#queue').addEventListener('click', (e) => {
    const r = e.target.closest('[data-q]');
    if (r) $$('#queue .queue-row').forEach((x) => x.classList.toggle('on', x === r));
  });

  // ---------- Onboarding ----------
  const ONB = [
    { img: 'p-steps', quote: '"Every dog dances differently. Tell me about yours."', next: "Let's begin" },
    { img: 'p-hug', quote: '"The bond comes first. Every move grows from it."', next: 'Continue' },
    { img: 'p-up', quote: '"Dancing is just play with a shape to it."', next: 'Build my plan' },
    { img: 'p-back', quote: '"Ten good minutes beat an hour of trying hard."', next: 'Go to my home' },
  ];
  let step = 1;
  function paintStep() {
    $$('#onbPanel [data-step]').forEach((el) => (el.hidden = +el.dataset.step !== step));
    $$('#stepper > div').forEach((el, i) => { el.classList.toggle('on', i + 1 === step); el.classList.toggle('done', i + 1 < step); });
    const s = ONB[step - 1];
    $('#onbImg').src = `img/${s.img}.jpg`;
    $('#onbQuote').lastElementChild.textContent = s.quote;
    $('#onbNext').innerHTML = `${s.next}<span class="ms sm">arrow_forward</span>`;
    $('#onbBack').hidden = step === 1;
  }
  $('#onbNext').addEventListener('click', () => {
    if (step === 4) { location.hash = '#home-new'; step = 1; paintStep(); return; }
    step += 1;
    paintStep();
  });
  $('#onbBack').addEventListener('click', () => { step = Math.max(1, step - 1); paintStep(); });
  $('#dogPhoto').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    $('#dogPhotoBox').innerHTML = `<img src="${url}" alt="Your dog">`;
  });
  $('#dogName').addEventListener('input', (e) => {
    const v = e.target.value.trim() || 'your dog';
    $$('#onbPanel [data-dogname]').forEach((el) => (el.textContent = v));
  });
  paintStep();

  // ---------- Header search jumps to results ----------
  $('#q').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    $('#bigSearch').value = e.target.value || 'spin';
    location.hash = '#search';
  });

  route();
})();
