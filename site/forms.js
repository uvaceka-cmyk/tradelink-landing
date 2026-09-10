/* =========================================================
   TradeLink — vylepšení formulářů
   Jen ovládání a vzhled, žádná práce s daty:
   1) přepínač viditelnosti hesla u každého input[type=password]
   2) TL.confirm() — potvrzovací dialog místo window.confirm
   Bez JS všechno funguje dál: heslo je skryté, dialog se nepoužije.
   ========================================================= */
(function () {
  'use strict';

  var ICON_SHOW =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>' +
    '</svg>';
  var ICON_HIDE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3.2 3.9M6.7 6.7C4 8.6 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.7 0 3.2-.5 4.5-1.2"/>' +
      '<path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>' +
    '</svg>';

  /* ---------- 1) viditelnost hesla ---------- */
  function enhancePassword(input) {
    if (input.closest('.field__control')) return;

    var wrap = document.createElement('div');
    wrap.className = 'field__control';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'field__eye';
    btn.setAttribute('aria-label', 'Zobrazit heslo');
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = ICON_SHOW + ICON_HIDE;

    btn.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      btn.setAttribute('aria-label', show ? 'Skrýt heslo' : 'Zobrazit heslo');
      wrap.classList.toggle('is-visible', show);
      input.focus({ preventScroll: true });
    });

    wrap.appendChild(btn);
  }

  document.querySelectorAll('input[type="password"]').forEach(enhancePassword);

  /* ---------- 2) potvrzovací dialog ---------- */
  var dialog = null;

  function build() {
    dialog = document.createElement('dialog');
    dialog.className = 'tl-dialog';
    dialog.innerHTML =
      '<form method="dialog">' +
        '<h2 data-title></h2>' +
        '<p data-text></p>' +
        '<div class="actions">' +
          '<button class="btn btn--ghost" type="submit" value="cancel" data-cancel></button>' +
          '<button class="btn" type="submit" value="ok" data-ok></button>' +
        '</div>' +
      '</form>';
    document.body.appendChild(dialog);
    return dialog;
  }

  /* TL.confirm({ title, text, ok, cancel, danger }) → Promise<boolean> */
  function confirmDialog(opts) {
    opts = opts || {};
    if (typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) {
      return Promise.resolve(window.confirm((opts.title ? opts.title + ' ' : '') + (opts.text || '')));
    }

    var d = dialog || build();
    d.querySelector('[data-title]').textContent = opts.title || 'Opravdu?';
    d.querySelector('[data-text]').textContent = opts.text || '';
    d.querySelector('[data-cancel]').textContent = opts.cancel || 'Zrušit';
    var ok = d.querySelector('[data-ok]');
    ok.textContent = opts.ok || 'Potvrdit';
    ok.className = 'btn' + (opts.danger ? ' btn--ghost btn--danger' : '');

    return new Promise(function (resolve) {
      function done() {
        d.removeEventListener('close', done);
        resolve(d.returnValue === 'ok');
        d.returnValue = '';
      }
      d.addEventListener('close', done);
      d.returnValue = '';
      d.showModal();
      d.querySelector('[data-cancel]').focus();
    });
  }

  window.TL = window.TL || {};
  window.TL.confirm = confirmDialog;
})();
