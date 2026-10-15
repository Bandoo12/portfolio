/**
 * Шифрует демо-страницу паролем: AES-256-GCM, ключ из PBKDF2-SHA256.
 * В репозиторий попадает только шифротекст — исходник демо не публикуется.
 *   node scripts/encrypt-demo.mjs <исходник> <результат> <пароль>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pbkdf2Sync, randomBytes, createCipheriv } from 'node:crypto';

const [src, out, password] = process.argv.slice(2);
if (!src || !out || !password) {
  console.error('usage: node scripts/encrypt-demo.mjs <src> <out> <password>');
  process.exit(1);
}

const ITER = 250000;
const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(password, salt, ITER, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const body = Buffer.concat([cipher.update(readFileSync(src)), cipher.final(), cipher.getAuthTag()]);

const page = `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>PayHost — Provider Balances</title>
<style>
  :root{--bg:#F0F2F5;--card:#FFFFFF;--fg:#141414;--fg-2:#53575F;--border:rgba(163,171,187,.26);--brand:#0075FF;--negative:#D93600;--r:4px}
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;display:flex;align-items:center;justify-content:center;padding:24px;
       background:var(--bg);color:var(--fg);
       font:400 14px/20px Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  form{width:100%;max-width:320px;background:var(--card);border:1px solid var(--border);
       border-radius:8px;padding:24px;display:flex;flex-direction:column;gap:12px}
  h1{margin:0;font-size:16px;line-height:24px;font-weight:600}
  p{margin:0;color:var(--fg-2);font-size:13px;line-height:18px}
  input{height:40px;padding:0 12px;border:1px solid var(--border);border-radius:var(--r);
        background:var(--card);color:var(--fg);font:inherit;outline:none}
  input:focus{border-color:var(--brand)}
  button{height:40px;border:0;border-radius:var(--r);background:var(--brand);color:#fff;
         font:600 14px/20px inherit;cursor:pointer}
  button[disabled]{opacity:.6;cursor:default}
  .err{color:var(--negative);font-size:13px;line-height:18px;min-height:18px}
</style>
</head><body>
<form id="gate" autocomplete="off">
  <h1>Provider Balances</h1>
  <p>Прототип закрыт паролем. Введите пароль, чтобы открыть.</p>
  <input id="pw" type="password" placeholder="Пароль" autocomplete="current-password" required>
  <button id="go" type="submit">Открыть</button>
  <div class="err" id="err"></div>
</form>
<script>
/* всё в IIFE: страница прототипа объявляет свои глобальные const, имена не должны пересечься */
(function(){
const SALT=${JSON.stringify(salt.toString('base64'))},IV=${JSON.stringify(iv.toString('base64'))},
      DATA=${JSON.stringify(body.toString('base64'))},ITER=${ITER};
const b2a=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const form=document.getElementById('gate'),pw=document.getElementById('pw'),
      go=document.getElementById('go'),err=document.getElementById('err');
form.addEventListener('submit',async e=>{
  e.preventDefault();
  err.textContent='';go.disabled=true;go.textContent='Расшифровка…';
  try{
    const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw.value),'PBKDF2',false,['deriveKey']);
    const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b2a(SALT),iterations:ITER,hash:'SHA-256'},
      base,{name:'AES-GCM',length:256},false,['decrypt']);
    const html=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b2a(IV)},key,b2a(DATA)));
    document.open();document.write(html);document.close();
  }catch(_){
    err.textContent='Неверный пароль';go.disabled=false;go.textContent='Открыть';pw.select();
  }
});
pw.focus();
})();
<\/script>
</body></html>
`;
writeFileSync(out, page);
console.log(`${out}: ${(page.length/1024).toFixed(1)} KB, ${ITER} итераций PBKDF2`);
