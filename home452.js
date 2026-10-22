/* Aria 홈(랜딩) 452 — 스크롤 장면 판(게시 = aria-site 루트 /home452.js · defer)
   · 장면 바꾸기 = IntersectionObserver(가는 선 하나: 데스크톱 = 화면 가운데 · 폰 = 붙은 화면 판 아래 글 자리)
   · 장면 막대의 빨간 지금 선 = 스크롤 한 번에 rAF 한 번 · transform 만 씀(레이아웃 쓰기 0)
   · 동작 줄이기면 손대지 않음(머리 인라인 스크립트가 .story-on 을 안 붙임 → 정지 판) */
(function () {
  'use strict';
  window.__ariaStory = 1;
  var d = document, root = d.documentElement;
  var story = d.querySelector('.story');
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;

  // 끝 장면 마스코트: 보이면 한 번 깜빡(정본 0.16초) — 동작 줄이기면 없음
  var mascot = d.querySelector('.mascot');
  if (mascot && 'IntersectionObserver' in window && !(mq && mq.matches)) {
    var mo = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) {
        mo.disconnect();
        setTimeout(function () { mascot.classList.add('blink'); }, 450);
      }
    }, { threshold: 0.9 });
    mo.observe(mascot);
  }

  if (!story || !('IntersectionObserver' in window)) { root.classList.remove('story-on'); return; }

  var steps = [].slice.call(story.querySelectorAll('.step'));
  var scrs = [].slice.call(story.querySelectorAll('.scr'));
  var links = [].slice.call(story.querySelectorAll('.rail a'));
  var stage = story.querySelector('.stage');
  var now = story.querySelector('.rail-now');
  var active = -1, io = null, raf = 0, ro = null, on = false, stageH = 0;

  function desk() { return window.innerWidth >= 960; }
  function lineY() {
    var vh = window.innerHeight;
    if (desk()) return Math.round(vh * 0.5);
    return Math.round(stageH + (vh - stageH) * 0.3);
  }

  function setActive(i) {
    i = Math.max(0, Math.min(steps.length - 1, i));
    if (i === active) return;
    active = i;
    for (var k = 0; k < steps.length; k++) {
      steps[k].classList.toggle('is-on', k === i);
      if (scrs[k]) scrs[k].classList.toggle('on', k === i);
      if (links[k]) {
        links[k].classList.toggle('done', k < i);
        if (k === i) { if (links[k].getAttribute('aria-current') !== 'step') links[k].setAttribute('aria-current', 'step'); }
        else if (links[k].hasAttribute('aria-current')) links[k].removeAttribute('aria-current');
      }
    }
    schedule();
  }

  // 빨간 지금 선: 지금 장면 칸 안에서 그 장면을 얼마나 지났는지만큼
  function tick() {
    raf = 0;
    if (!on || !now) return;
    var y = lineY();
    // 크게 건너뛴 스크롤(맨 위로 · 맨 아래로)은 IntersectionObserver 가 놓칠 수 있어 위치로 한 번 더 맞춤
    var idx = 0;
    for (var k = 0; k < steps.length; k++) if (steps[k].getBoundingClientRect().top <= y) idx = k;
    if (idx !== active) { setActive(idx); return; }
    var top = steps[active].getBoundingClientRect().top;
    var next = steps[active + 1] ? steps[active + 1].getBoundingClientRect().top : steps[active].getBoundingClientRect().bottom;
    var f = (y - top) / Math.max(1, next - top);
    f = f < 0 ? 0 : f > 1 ? 1 : f;
    var a = links[active];
    if (!a) return;
    var x = a.offsetLeft + 3 + f * (a.offsetWidth - 6);
    now.style.setProperty('--x', x.toFixed(1) + 'px');
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(tick); }

  function observe() {
    if (io) io.disconnect();
    var y = lineY(), vh = window.innerHeight;
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var i = steps.indexOf(e.target);
        if (e.isIntersecting) setActive(i);
        else if (i === active && e.boundingClientRect.top > y) setActive(i - 1);   // 위로 되돌아감
      });
    }, { rootMargin: (-y) + 'px 0px ' + (-(vh - y - 1)) + 'px 0px' });
    steps.forEach(function (s) { io.observe(s); });
  }

  // 붙은 판 높이 = ResizeObserver 가 레이아웃 뒤에 알려 준 값만 씀(스크립트가 레이아웃을 억지로 부르지 않게)
  function measure() {
    if (!on) return;
    story.style.setProperty('--stage-h', stageH + 'px');
    observe();
    schedule();
  }
  function onStage(entries) {
    var e = entries[entries.length - 1];
    var b = e.borderBoxSize && (e.borderBoxSize[0] || e.borderBoxSize);
    stageH = Math.round(b && b.blockSize ? b.blockSize : e.target.getBoundingClientRect().height);
    measure();
  }

  var rt = 0;
  function onResize() { clearTimeout(rt); rt = setTimeout(measure, 120); }

  function start() {
    if (on) return;
    on = true;
    root.classList.add('story-on');
    if (active < 0) setActive(0);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);
    if ('ResizeObserver' in window) { ro = new ResizeObserver(onStage); ro.observe(stage); }
    else requestAnimationFrame(function () { stageH = Math.round(stage.getBoundingClientRect().height); measure(); });
  }
  function stop() {
    if (!on) return;
    on = false;
    root.classList.remove('story-on');
    if (io) io.disconnect();
    if (ro) ro.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', onResize);
  }

  // 장면 막대 누름 = 그 장면 글로(폰에선 붙은 판 아래 글 자리에 오게)
  links.forEach(function (a, i) {
    a.addEventListener('click', function (ev) {
      if (!on) return;
      ev.preventDefault();
      var s = steps[i];
      var y = window.scrollY + s.getBoundingClientRect().top - (desk() ? (window.innerHeight - s.offsetHeight) / 2 : stage.getBoundingClientRect().height + 8);
      if (i === 0) y = 0;
      window.scrollTo({ top: Math.max(0, y), behavior: mq && mq.matches ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', i === 0 ? location.pathname + location.search : '#' + s.id);
    });
  });

  if (mq && mq.matches) stop(); else start();
  if (mq) {
    var onMq = function () { if (mq.matches) stop(); else start(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }
})();
