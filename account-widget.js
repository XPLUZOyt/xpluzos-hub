/* Xpluzo's Hub client-only account popup.
 * Include on a page with: <script src="account-widget.js" defer></script>
 * Account records are compatible with account.html and remain in this browser.
 */
(() => {
  "use strict";
  if (document.getElementById("xh-account-trigger")) return;

  const ACCOUNTS_KEY = "xpluzosHub.localAccounts.v1";
  const SESSION_KEY = "xpluzosHub.localSession.v1";
  const style = document.createElement("style");
  style.textContent = `
    #xh-account-trigger { position:fixed; right:22px; bottom:22px; z-index:2000; padding:12px 17px; border:1px solid rgba(57,255,136,.5); border-radius:12px; background:#39ff88; color:#031008; box-shadow:0 6px 28px rgba(0,0,0,.4),0 0 24px rgba(57,255,136,.2); font:800 14px Inter,system-ui,sans-serif; cursor:pointer }
    #xh-account-trigger:hover { background:#8affb9; transform:translateY(-2px) }
    #xh-account-dialog { width:min(440px,calc(100% - 28px)); max-height:calc(100% - 28px); padding:0; border:1px solid rgba(57,255,136,.25); border-radius:20px; color:#f2fff6; background:#07130c; box-shadow:0 24px 90px rgba(0,0,0,.65); font:15px Inter,system-ui,sans-serif }
    #xh-account-dialog::backdrop { background:rgba(0,0,0,.76); backdrop-filter:blur(7px) }
    #xh-account-dialog * { box-sizing:border-box }
    .xh-inner { padding:27px }
    .xh-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:22px }
    .xh-head h2 { margin:0 0 6px; font-size:1.45rem }
    .xh-head p { margin:0; color:#91a69a; font-size:.86rem; line-height:1.5 }
    .xh-close { width:36px; height:36px; flex:none; border:1px solid rgba(255,255,255,.14); border-radius:9px; color:#f2fff6; background:rgba(255,255,255,.05); font-size:21px; cursor:pointer }
    .xh-tabs { display:grid; grid-template-columns:1fr 1fr; gap:7px; padding:5px; margin-bottom:20px; border:1px solid rgba(57,255,136,.15); border-radius:11px; background:rgba(0,0,0,.25) }
    .xh-tabs button { padding:10px 6px; border:0; border-radius:8px; color:#91a69a; background:transparent; font:700 13px inherit; cursor:pointer }
    .xh-tabs button[aria-selected=true] { color:#031008; background:#39ff88 }
    .xh-field { display:block; margin:15px 0 7px; font-size:.86rem; font-weight:700 }
    .xh-input { width:100%; padding:12px 13px; border:1px solid rgba(255,255,255,.15); border-radius:9px; outline:none; color:#f2fff6; background:rgba(0,0,0,.28); font:inherit }
    .xh-input:focus { border-color:#39ff88; box-shadow:0 0 0 3px rgba(57,255,136,.1) }
    .xh-hint { margin:7px 0 0; color:#91a69a; font-size:.76rem; line-height:1.45 }
    .xh-submit { width:100%; margin-top:20px; padding:12px; border:0; border-radius:9px; color:#031008; background:#39ff88; font:800 14px Inter,system-ui,sans-serif; cursor:pointer }
    .xh-submit:disabled { opacity:.65; cursor:wait }
    .xh-message { min-height:1.35em; margin:12px 0 0; color:#8affb9; font-size:.84rem; line-height:1.45 }
    .xh-message[data-error=true] { color:#ff9a9a }
    .xh-privacy { margin:13px 0 0; padding:10px; border-radius:8px; color:#91a69a; background:rgba(255,255,255,.04); font-size:.74rem; line-height:1.5 }
    @media(max-width:500px) { #xh-account-trigger { right:14px; bottom:14px } .xh-inner { padding:21px } }
  `;
  document.head.appendChild(style);

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.id = "xh-account-trigger";
  trigger.textContent = "👤 Sign in / Create account";
  trigger.setAttribute("aria-haspopup", "dialog");
  document.body.appendChild(trigger);

  const dialog = document.createElement("dialog");
  dialog.id = "xh-account-dialog";
  dialog.setAttribute("aria-labelledby", "xh-title");
  dialog.innerHTML = `
    <div class="xh-inner">
      <div class="xh-head"><div><h2 id="xh-title">Your Xpluzo's Hub account</h2><p>Sign in or create an account to continue.</p></div><button class="xh-close" type="button" aria-label="Close">×</button></div>
      <div class="xh-tabs" role="tablist" aria-label="Account action"><button type="button" role="tab" data-mode="login" aria-selected="true">Log in</button><button type="button" role="tab" data-mode="signup" aria-selected="false">Create account</button></div>
      <form class="xh-form"><label class="xh-field" for="xh-username">Username</label><input class="xh-input" id="xh-username" name="username" autocomplete="username" minlength="3" maxlength="24" pattern="[A-Za-z0-9_-]+" required><p class="xh-hint">3–24 characters: letters, numbers, underscores, or hyphens.</p><label class="xh-field" for="xh-password">Password</label><input class="xh-input" id="xh-password" name="password" type="password" autocomplete="current-password" minlength="8" required><p class="xh-hint xh-password-hint" hidden>Use at least 8 characters.</p><button class="xh-submit" type="submit">Log in</button></form>
      <p class="xh-message" role="status" aria-live="polite"></p><p class="xh-privacy">Accounts are stored only in this browser. This is not secure authentication; don't reuse an important password. No account data is sent to a server.</p>
    </div>`;
  document.body.appendChild(dialog);

  const form = dialog.querySelector(".xh-form");
  const usernameField = dialog.querySelector("#xh-username");
  const passwordField = dialog.querySelector("#xh-password");
  const submitButton = dialog.querySelector(".xh-submit");
  const message = dialog.querySelector(".xh-message");
  const passwordHint = dialog.querySelector(".xh-password-hint");
  let mode = "login";
  const setMessage = (text, error = false) => {
    message.textContent = text;
    message.dataset.error = String(error);
  };
  const normalize = (value) => value.trim().toLowerCase();
  function readAccounts() {
    const data = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}");
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  }
  function hex(bytes) { return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""); }
  function unhex(value) {
    if (typeof value !== "string" || !/^(?:[0-9a-f]{2})+$/i.test(value)) return null;
    return new Uint8Array(value.match(/.{2}/g).map((part) => parseInt(part, 16)));
  }
  async function passwordHash(password, salt) {
    if (!crypto.subtle || !crypto.getRandomValues) throw new Error("Secure browser crypto is unavailable. Use HTTPS or localhost.");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations:310000, hash:"SHA-256" }, key, 256);
    return hex(new Uint8Array(bits));
  }
  function switchMode(nextMode) {
    mode = nextMode;
    dialog.querySelectorAll("[data-mode]").forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.mode === mode)));
    submitButton.textContent = mode === "signup" ? "Create account" : "Log in";
    passwordHint.hidden = mode !== "signup";
    passwordField.autocomplete = mode === "signup" ? "new-password" : "current-password";
    setMessage("");
  }
  trigger.addEventListener("click", () => {
    setMessage("");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    usernameField.focus();
  });
  dialog.querySelector(".xh-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  dialog.querySelectorAll("[data-mode]").forEach((tab) => tab.addEventListener("click", () => switchMode(tab.dataset.mode)));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const username = normalize(usernameField.value);
    const password = passwordField.value;
    submitButton.disabled = true;
    setMessage(mode === "signup" ? "Creating your local account…" : "Checking your account…");
    try {
      const accounts = readAccounts();
      if (mode === "signup") {
        if (accounts[username]) { setMessage("That username already exists in this browser. Try logging in.", true); return; }
        const salt = crypto.getRandomValues(new Uint8Array(16));
        accounts[username] = { salt: hex(salt), hash: await passwordHash(password, salt) };
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
      } else {
        const account = accounts[username];
        const salt = account && unhex(account.salt);
        if (!account || !salt || typeof account.hash !== "string") { setMessage("Username or password is incorrect.", true); return; }
        const candidate = await passwordHash(password, salt);
        if (candidate.length !== account.hash.length || ![...candidate].every((char, i) => char === account.hash[i])) { setMessage("Username or password is incorrect.", true); return; }
      }
      sessionStorage.setItem(SESSION_KEY, username);
      passwordField.value = "";
      setMessage("Signed in. Closing…");
      window.setTimeout(() => dialog.close(), 250);
    } catch (error) {
      setMessage(error.message || "Couldn't access local browser storage.", true);
    } finally {
      submitButton.disabled = false;
    }
  });
})();
