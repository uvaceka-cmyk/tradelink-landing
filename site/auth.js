/* =========================================================
   TradeLink — účty
   Registrace, přihlášení, odhlášení a obnova hesla přes Supabase.
   Typ účtu se odvozuje z volby na recepci (?role=).
   ========================================================= */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.58.0/+esm';

/* ---------- role z recepce → typ účtu ---------- */
export const ROLES = {
  'hledam-zamestnance': {
    title: 'Hledám zaměstnance',
    account: 'firma',
    accountLabel: 'Firemní účet'
  },
  'hledam-zakazky': {
    title: 'Hledám zakázky',
    account: 'firma',
    accountLabel: 'Účet firmy nebo živnostníka'
  },
  'hledam-praci': {
    title: 'Hledám práci',
    account: 'osoba',
    accountLabel: 'Osobní účet'
  },
  'chci-zadat-zakazku': {
    title: 'Chci zadat zakázku',
    account: 'osoba',
    accountLabel: 'Osobní účet'
  }
};

export const DEFAULT_ROLE = 'hledam-praci';

export function roleFromUrl() {
  var role = new URLSearchParams(window.location.search).get('role');
  return ROLES[role] ? role : DEFAULT_ROLE;
}

/* ---------- klient ---------- */
var cfg = window.TRADELINK_SUPABASE || {};
export const configured = Boolean(cfg.url && cfg.anonKey);
export const supabase = configured ? createClient(cfg.url, cfg.anonKey) : null;

/* ---------- pomocníci pro formuláře ---------- */
export function status(el, message, kind) {
  if (!el) return;
  el.textContent = message || '';
  el.className = 'form__status' + (kind ? ' form__status--' + kind : '');
  el.hidden = !message;
}

export function busy(form, isBusy, labelBusy) {
  var button = form.querySelector('button[type="submit"]');
  if (!button) return;
  if (isBusy) {
    button.dataset.label = button.textContent;
    button.textContent = labelBusy || 'Pracuji…';
  } else if (button.dataset.label) {
    button.textContent = button.dataset.label;
  }
  button.disabled = isBusy;
  form.querySelectorAll('input,select').forEach(function (i) { i.disabled = isBusy; });
}

export function requireConfig(statusEl) {
  if (configured) return true;
  status(statusEl,
    'Účty zatím nejsou připojené k databázi. Doplň údaje v supabase-config.js.',
    'error');
  return false;
}

/* Chybové hlášky Supabase jsou anglicky — přeložíme ty časté. */
export function czechError(error) {
  var m = (error && error.message) || '';
  if (/Invalid login credentials/i.test(m)) return 'Nesprávný e-mail nebo heslo.';
  if (/Email not confirmed/i.test(m)) return 'E-mail ještě není potvrzený. Zkontrolujte schránku.';
  if (/User already registered/i.test(m)) return 'Na tento e-mail už účet existuje. Zkuste se přihlásit.';
  if (/Password should be at least/i.test(m)) return 'Heslo musí mít alespoň 8 znaků.';
  if (/rate limit|too many requests/i.test(m)) return 'Příliš mnoho pokusů. Zkuste to za chvíli.';
  if (/Unable to validate email address/i.test(m)) return 'E-mailová adresa nevypadá platně.';
  if (/New password should be different/i.test(m)) return 'Nové heslo musí být jiné než to původní.';
  return m || 'Něco se nepovedlo. Zkuste to prosím znovu.';
}

/* ---------- stav přihlášení v navigaci ---------- */
export async function paintNav() {
  var slot = document.getElementById('nav-account');
  if (!slot || !configured) return null;

  var session = (await supabase.auth.getSession()).data.session;
  if (session) {
    slot.textContent = 'Můj účet';
    slot.setAttribute('href', 'ucet.html');
  } else {
    slot.textContent = 'Přihlásit se';
    slot.setAttribute('href', 'prihlaseni.html');
  }
  return session;
}
