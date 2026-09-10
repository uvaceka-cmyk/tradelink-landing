/* =========================================================
   TradeLink — přechod mezi scénami (atrium → recepce)
   Žádná SPA, žádná knihovna: jen krátká CSS animace před
   běžnou navigací na další HTML stránku, a jemné probuzení
   scény po příchodu. Respektuje prefers-reduced-motion.
   ========================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EXIT_MS = 1150;

  /* ---------- video příjezdu k pultu ----------
     Jen na desktopu a bez úsporného režimu dat; jinak zůstává CSS
     přiblížení. Když video není připravené nebo se nespustí, použije
     se CSS varianta — přechod nikdy nečeká na síť. */
  var video = document.querySelector('.atrium__next video');
  var conn = navigator.connection || {};
  var wantVideo = Boolean(video) && !reduced &&
    window.matchMedia('(min-width: 900px)').matches && !conn.saveData;
  if (wantVideo) {
    video.preload = 'auto';
    try { video.load(); } catch (e) { wantVideo = false; }
  }

  var VIDEO_RATE = 1;      /* klip má přesně 2,0 s, hraje se jednou v reálném čase */
  var VIDEO_MAX_MS = 2600; /* pojistka, kdyby 'ended' nepřišlo */

  function leaveWithVideo(href) {
    document.body.classList.add('is-video');
    var done = false;
    function go() {
      if (done) return; done = true;
      /* recepce se podle toho vykreslí hned v klidové poloze — poslední snímek
         klipu je její pozadí, takže bez prolnutí a bez skoku */
      try { sessionStorage.setItem('tl-arrive-video', '1'); } catch (e) {}
      window.location.href = href;
    }
    video.addEventListener('ended', go, { once: true });
    video.addEventListener('error', go, { once: true });
    window.setTimeout(go, VIDEO_MAX_MS);
    video.playbackRate = VIDEO_RATE;
    var p = video.play();
    if (p && p.catch) p.catch(go);
  }

  /* ---------- příchod na scénu ---------- */
  var enter = document.querySelector('[data-enter]');
  if (enter) {
    if (reduced) {
      enter.classList.add('is-entered');
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { enter.classList.add('is-entered'); });
      });
    }
  }

  /* ---------- odchod ze scény před navigací ---------- */
  var links = document.querySelectorAll('[data-transition]');
  var leaving = false;

  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = link.getAttribute('href');
      if (!href || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || leaving) return;

      e.preventDefault();
      leaving = true;

      if (reduced) {
        window.location.href = href;
        return;
      }

      link.classList.add('is-pressed');
      /* kamera přijede k pultu: video, když je stažené; jinak se fotka
         atria přiblíží a prolne do fotky recepce. Nav a výtah stojí mimo
         animované vrstvy a dál reagují. */
      document.body.classList.add('is-leaving');
      if (wantVideo && video.readyState >= 3) {
        leaveWithVideo(href);
        return;
      }
      window.setTimeout(function () { window.location.href = href; }, EXIT_MS);
    });
  });
})();
