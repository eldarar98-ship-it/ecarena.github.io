import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, get, push, remove, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDPnJbudjIZ2HXpwNmuVO4oHI2aig8Z6jo",
  authDomain: "eplaypart2.firebaseapp.com",
  databaseURL: "https://eplaypart2-default-rtdb.firebaseio.com",
  projectId: "eplaypart2",
  storageBucket: "eplaypart2.firebasestorage.app",
  messagingSenderId: "648051637999",
  appId: "1:648051637999:web:a9f9476f83f970d90ce51a",
  measurementId: "G-J28D6G5PDY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

/* ---------- Static configuration ---------- */

const API_KEYS = {
  'gpt': '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',
  'gemini': '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',
  'deepseek': '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'
};

const MODELS = [
  { brand: 'DeepSeek', label: 'DeepSeek V3',        id: 'deepseek/deepseek-chat' },
  { brand: 'DeepSeek', label: 'DeepSeek R1',        id: 'deepseek/deepseek-r1' },
  { brand: 'ChatGPT',  label: 'ChatGPT 4o',         id: 'openai/gpt-4o' },
  { brand: 'ChatGPT',  label: 'ChatGPT 4o-mini',    id: 'openai/gpt-4o-mini' },
  { brand: 'ChatGPT',  label: 'ChatGPT 5.5',        id: 'openai/gpt-5.5' },
  { brand: 'ChatGPT',  label: 'ChatGPT OSS-20B',    id: 'openai/gpt-oss-20b' },
  { brand: 'Gemini',   label: 'Gemini 3.5 Flash',   id: 'google/gemini-3.5-flash' },
  { brand: 'Gemini',   label: 'Gemini 2.5 Pro',     id: 'google/gemini-2.5-pro' }
];

const DEFAULT_MODEL = 'openai/gpt-4o';

const ICONS = {
  logo:    'https://i.ibb.co.com/jv6fcQPn/181-20260624015724.png', // 7 - ECArena shield (main logo)
  send:    'https://i.ibb.co.com/r2TPfZn3/182-20260624020605.png', // 6 - send button
  trash:   'https://i.ibb.co.com/cKtNxYJH/186-20260624022516.png', // 4 - delete chat
  alert:   'https://i.ibb.co.com/GvtWFKNx/185-20260624020808.png', // 5 - error alert
  deepseek:'https://i.ibb.co.com/Q3Jz1mLt/183.png',                 // 1 - DeepSeek logo
  chatgpt: 'https://i.ibb.co.com/Z1RQ8nTb/184.png',                 // 2 - ChatGPT logo
  gemini:  'https://i.ibb.co.com/tPvwW3T4/images-1.jpg'            // 3 - Gemini logo
};

const state = {
  currentUser: null,
  displayName: null,
  currentChatId: null,
  currentModel: DEFAULT_MODEL,
  chats: {},
  sending: false,
  unsub: null
};

/* ---------- DOM references ---------- */
const $ = (id) => document.getElementById(id);
const authOverlay   = $('authOverlay');
const loginInput    = $('loginInput');
const passwordInput = $('passwordInput');
const authBtn       = $('authBtn');
const authError     = $('authError');

const adminOverlay   = $('adminOverlay');
const adminClose     = $('adminClose');
const broadcastInput = $('broadcastInput');
const broadcastBtn   = $('broadcastBtn');
const broadcastStatus= $('broadcastStatus');

const backdrop   = $('backdrop');
const sidebar    = $('sidebar');
const newChatBtn = $('newChatBtn');
const chatList   = $('chatList');
const logoutBtn  = $('logoutBtn');

const menuBtn     = $('menuBtn');
const modelSelect = $('modelSelect');
const messagesEl  = $('messages');
const messageInput= $('messageInput');
const sendBtn     = $('sendBtn');

/* ---------- Helpers ---------- */
function sanitizeUsername(name) {
  return name.replace(/[.#$\/[\]]/g, '_').trim();
}

function getKeyForModel(modelId) {
  const m = String(modelId || '').toLowerCase();
  if (m.includes('gpt') || m.includes('openai')) return API_KEYS.gpt;
  if (m.includes('gemini')) return API_KEYS.gemini;
  if (m.includes('deepseek')) return API_KEYS.deepseek;
  return API_KEYS.gpt;
}

function getBrand(modelId) {
  const m = String(modelId || '').toLowerCase();
  if (m.includes('deepseek')) return 'DeepSeek';
  if (m.includes('gpt') || m.includes('openai')) return 'ChatGPT';
  if (m.includes('gemini')) return 'Gemini';
  return 'Model';
}

function brandLogo(brand) {
  if (brand === 'DeepSeek') return ICONS.deepseek;
  if (brand === 'ChatGPT') return ICONS.chatgpt;
  if (brand === 'Gemini') return ICONS.gemini;
  return ICONS.logo;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderInline(text) {
  return escapeHtml(text).replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/* ---------- Model select ---------- */
function populateModels() {
  const groups = {};
  MODELS.forEach(m => { (groups[m.brand] = groups[m.brand] || []).push(m); });
  modelSelect.innerHTML = '';
  Object.keys(groups).forEach(brand => {
    const og = document.createElement('optgroup');
    og.label = brand;
    groups[brand].forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label;
      og.appendChild(opt);
    });
    modelSelect.appendChild(og);
  });
  modelSelect.value = DEFAULT_MODEL;
}

/* ---------- Authorization ---------- */
async function handleAuth() {
  const rawName = loginInput.value.trim();
  const password = passwordInput.value;
  authError.textContent = '';
  if (!rawName || !password) { authError.textContent = 'Заполните все поля.'; return; }

  const username = sanitizeUsername(rawName);
  authBtn.disabled = true;
  authError.textContent = 'Авторизация...';

  try {
    const cred = await signInAnonymously(auth);
    const uid = cred.user.uid;
    const userRef = ref(database, `users/${username}`);
    const snap = await get(userRef);

    if (!snap.exists()) {
      await set(userRef, { password: password, uid: uid, createdAt: Date.now() });
      loginUser(username, rawName);
    } else {
      const data = snap.val();
      if (data.password === password) {
        await set(ref(database, `users/${username}/uid`), uid);
        loginUser(username, rawName);
      } else {
        authError.textContent = 'Неверный пароль';
      }
    }
  } catch (e) {
    console.log('Auth error', e);
    authError.textContent = 'Ошибка авторизации. Повторите попытку.';
  } finally {
    authBtn.disabled = false;
  }
}

function loginUser(username, displayName) {
  state.currentUser = username;
  state.displayName = displayName || username;
  state.currentChatId = null;
  authError.textContent = '';
  authOverlay.classList.add('hidden');
  modelSelect.value = DEFAULT_MODEL;
  subscribeToChats(username);
}

function logout() {
  if (state.unsub) { state.unsub(); state.unsub = null; }
  state.currentUser = null;
  state.displayName = null;
  state.currentChatId = null;
  state.chats = {};
  state.sending = false;
  loginInput.value = '';
  passwordInput.value = '';
  authError.textContent = '';
  renderSidebar();
  messagesEl.innerHTML = '';
  closeSidebar();
  authOverlay.classList.remove('hidden');
  loginInput.focus();
}

/* ---------- Chat data (real-time) ---------- */
function subscribeToChats(username) {
  if (state.unsub) state.unsub();
  const chatsRef = ref(database, `users/${username}/chats`);
  state.unsub = onValue(chatsRef, (snap) => {
    state.chats = snap.val() || {};
    renderSidebar();
    renderMessages();
  });
}

async function ensureChat() {
  if (state.currentChatId) return state.currentChatId;
  const chatsRef = ref(database, `users/${state.currentUser}/chats`);
  const newRef = push(chatsRef);
  state.currentChatId = newRef.key;
  await set(newRef, { title: '', model: modelSelect.value, createdAt: Date.now() });
  return newRef.key;
}

function newChat() {
  state.currentChatId = null;
  modelSelect.value = DEFAULT_MODEL;
  renderSidebar();
  renderMessages();
  closeSidebar();
  messageInput.focus();
}

function selectChat(id) {
  state.currentChatId = id;
  const chat = state.chats[id];
  if (chat && chat.model) modelSelect.value = chat.model;
  renderMessages();
  closeSidebar();
}

async function deleteChat(id) {
  if (!window.confirm('Удалить выбранный чат? Действие необратимо.')) return;
  await remove(ref(database, `users/${state.currentUser}/chats/${id}`));
  if (state.currentChatId === id) {
    state.currentChatId = null;
    renderMessages();
  }
}

/* ---------- OpenRouter call with key routing + error masking ---------- */
async function callModel(modelId, history) {
  const apiKey = getKeyForModel(modelId);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': location.origin,
        'X-Title': 'ECArena'
      },
      body: JSON.stringify({ model: modelId, messages: history })
    });
    if (!res.ok) {
      const t = await res.text();
      console.log('OpenRouter HTTP error', res.status, t);
      throw new Error('http_' + res.status);
    }
    const data = await res.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) {
      console.log('OpenRouter empty content', JSON.stringify(data));
      throw new Error('empty');
    }
    return content;
  } catch (e) {
    console.log('OpenRouter request failed', e);
    return null;
  }
}

/* ---------- Send flow ---------- */
function setSending(v) {
  state.sending = v;
  sendBtn.disabled = v;
}

function showLoading() {
  let el = document.getElementById('loadingMsg');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loadingMsg';
    el.className = 'msg assistant';
    const h = document.createElement('div');
    h.className = 'msg-header loading-header';
    h.textContent = 'Генерация ответа';
    el.appendChild(h);
  }
  messagesEl.appendChild(el);
  scrollToBottom();
}

function hideLoading() {
  const el = document.getElementById('loadingMsg');
  if (el) el.remove();
}

async function handleSend() {
  if (state.sending) return;
  const text = messageInput.value.trim();
  if (!text) return;

  if (text === '/admin') {
    messageInput.value = '';
    autoResize();
    openAdmin();
    return;
  }

  setSending(true);
  messageInput.value = '';
  autoResize();

  try {
    const chatId = await ensureChat();
    const modelId = modelSelect.value;

    showLoading();

    await push(ref(database, `users/${state.currentUser}/chats/${chatId}/messages`), {
      role: 'user', content: text, ts: Date.now()
    });

    const chat = state.chats[chatId];
    if (!chat || !chat.title) {
      await set(ref(database, `users/${state.currentUser}/chats/${chatId}/title`), text.slice(0, 25));
    }

    const msgSnap = await get(ref(database, `users/${state.currentUser}/chats/${chatId}/messages`));
    const msgsObj = msgSnap.val() || {};
    const history = Object.keys(msgsObj).sort().map(k => msgsObj[k])
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    const reply = await callModel(modelId, history);
    hideLoading();

    if (reply === null) {
      await push(ref(database, `users/${state.currentUser}/chats/${chatId}/messages`), {
        role: 'system', subtype: 'error', sender: 'ECArena',
        content: 'Модель перегружена, повторите запрос позже.', ts: Date.now()
      });
    } else {
      await push(ref(database, `users/${state.currentUser}/chats/${chatId}/messages`), {
        role: 'assistant', model: modelId, content: reply, ts: Date.now()
      });
    }
  } catch (e) {
    console.log('Send error', e);
    hideLoading();
    try {
      await push(ref(database, `users/${state.currentUser}/chats/${state.currentChatId}/messages`), {
        role: 'system', subtype: 'error', sender: 'ECArena',
        content: 'Модель перегружена, повторите запрос позже.', ts: Date.now()
      });
    } catch (_) {}
  } finally {
    setSending(false);
  }
}

/* ---------- Rendering ---------- */
function renderSidebar() {
  chatList.innerHTML = '';
  const ids = Object.keys(state.chats).sort((a, b) => {
    const ca = (state.chats[a] && state.chats[a].createdAt) || 0;
    const cb = (state.chats[b] && state.chats[b].createdAt) || 0;
    return cb - ca;
  });

  if (ids.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'chat-list-empty';
    empty.textContent = 'Нет сохранённых чатов';
    chatList.appendChild(empty);
    return;
  }

  ids.forEach(id => {
    const chat = state.chats[id];
    const item = document.createElement('div');
    item.className = 'chat-item' + (id === state.currentChatId ? ' active' : '');

    const title = document.createElement('div');
    title.className = 'chat-title';
    title.textContent = (chat && chat.title) ? chat.title : 'Новый чат';
    title.addEventListener('click', () => selectChat(id));

    const del = document.createElement('button');
    del.className = 'chat-delete';
    del.title = 'Удалить чат';
    const delImg = document.createElement('img');
    delImg.src = ICONS.trash;
    delImg.alt = 'Удалить';
    del.appendChild(delImg);
    del.addEventListener('click', (e) => { e.stopPropagation(); deleteChat(id); });

    item.appendChild(title);
    item.appendChild(del);
    chatList.appendChild(item);
  });
}

function renderEmpty() {
  const wrap = document.createElement('div');
  wrap.className = 'empty-state';
  const img = document.createElement('img');
  img.src = ICONS.logo;
  img.alt = 'ECArena';
  const h = document.createElement('h2');
  h.textContent = 'Новый диалог';
  const p = document.createElement('p');
  p.textContent = 'Выберите модель в шапке и отправьте запрос, чтобы начать работу.';
  wrap.appendChild(img);
  wrap.appendChild(h);
  wrap.appendChild(p);
  messagesEl.appendChild(wrap);
}

function renderMessages() {
  const loadingEl = document.getElementById('loadingMsg');
  messagesEl.innerHTML = '';

  const chat = (state.currentUser && state.currentChatId) ? state.chats[state.currentChatId] : null;
  const msgsObj = (chat && chat.messages) ? chat.messages : null;
  const msgs = msgsObj
    ? Object.keys(msgsObj).map(k => msgsObj[k]).sort((a, b) => (a.ts || 0) - (b.ts || 0))
    : [];

  if (msgs.length === 0 && !loadingEl) {
    renderEmpty();
  } else {
    msgs.forEach(m => messagesEl.appendChild(renderMessage(m)));
  }

  if (loadingEl) messagesEl.appendChild(loadingEl);
  scrollToBottom();
}

function renderMessage(m) {
  const row = document.createElement('div');
  row.className = 'msg ' + (m.role || 'user');
  const header = document.createElement('div');
  header.className = 'msg-header';

  if (m.role === 'assistant') {
    const modelId = m.model || modelSelect.value;
    const brand = getBrand(modelId);
    const logo = document.createElement('img');
    logo.src = brandLogo(brand);
    logo.className = 'brand-icon';
    logo.alt = brand;
    const label = document.createElement('span');
    label.textContent = brand;
    header.appendChild(logo);
    header.appendChild(label);
    row.appendChild(header);

    const c = document.createElement('div');
    c.className = 'msg-content';
    c.appendChild(renderMarkdown(m.content || ''));
    row.appendChild(c);

  } else if (m.role === 'system') {
    if (m.subtype === 'error') row.classList.add('error');
    const icon = document.createElement('img');
    icon.src = (m.subtype === 'error') ? ICONS.alert : ICONS.logo;
    icon.className = 'alert-icon';
    icon.alt = '';
    const label = document.createElement('span');
    label.textContent = m.sender || 'Система';
    header.appendChild(icon);
    header.appendChild(label);
    row.appendChild(header);

    const box = document.createElement('div');
    box.className = 'msg-system-box';
    const c = document.createElement('div');
    c.className = 'msg-content';
    c.textContent = m.content || '';
    box.appendChild(c);
    row.appendChild(box);

  } else {
    header.textContent = state.displayName || 'Пользователь';
    row.appendChild(header);
    const c = document.createElement('div');
    c.className = 'msg-content';
    c.style.whiteSpace = 'pre-wrap';
    c.textContent = m.content || '';
    row.appendChild(c);
  }

  return row;
}

function createCodeBlock(code, lang) {
  const wrap = document.createElement('div');
  wrap.className = 'code-block';

  const bar = document.createElement('div');
  bar.className = 'code-bar';
  const langLabel = document.createElement('span');
  langLabel.className = 'code-lang';
  langLabel.textContent = lang || 'code';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.type = 'button';
  copyBtn.textContent = 'Копировать';
  copyBtn.addEventListener('click', () => {
    const done = () => { copyBtn.textContent = 'Скопировано'; setTimeout(() => { copyBtn.textContent = 'Копировать'; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done).catch(() => fallbackCopy(code, done));
    } else {
      fallbackCopy(code, done);
    }
  });

  bar.appendChild(langLabel);
  bar.appendChild(copyBtn);

  const pre = document.createElement('pre');
  const codeEl = document.createElement('code');
  codeEl.textContent = code;
  pre.appendChild(codeEl);

  wrap.appendChild(bar);
  wrap.appendChild(pre);
  return wrap;
}

function fallbackCopy(text, cb) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); cb(); } catch (e) {}
  document.body.removeChild(ta);
}

function renderMarkdown(text) {
  const container = document.createElement('div');
  const parts = String(text || '').split('```');
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      let lang = '';
      let code = part;
      const nl = part.indexOf('\n');
      if (nl !== -1) {
        const fl = part.slice(0, nl).trim();
        if (/^[a-zA-Z0-9_+.#\-]+$/.test(fl)) { lang = fl; code = part.slice(nl + 1); }
      }
      code = code.replace(/^\n+/, '').replace(/\n+$/, '');
      container.appendChild(createCodeBlock(code, lang));
    } else if (part.trim()) {
      const div = document.createElement('div');
      div.className = 'md-text';
      div.innerHTML = renderInline(part.replace(/^\n+/, '').replace(/\n+$/, ''));
      container.appendChild(div);
    }
  });
  return container;
}

/* ---------- Admin broadcast ---------- */
function openAdmin() {
  broadcastStatus.textContent = '';
  adminOverlay.classList.remove('hidden');
}
function closeAdmin() {
  adminOverlay.classList.add('hidden');
}

async function handleBroadcast() {
  const text = broadcastInput.value.trim();
  if (!text) { broadcastStatus.textContent = 'Текст рассылки пуст.'; return; }
  broadcastBtn.disabled = true;
  broadcastStatus.textContent = 'Выполняется рассылка...';

  let userCount = 0, chatCount = 0;
  try {
    const snap = await get(ref(database, 'users'));
    const users = snap.val() || {};
    for (const username of Object.keys(users)) {
      const chats = users[username] && users[username].chats;
      if (chats && typeof chats === 'object') {
        let hadChat = false;
        for (const chatId of Object.keys(chats)) {
          await push(ref(database, `users/${username}/chats/${chatId}/messages`), {
            role: 'system', sender: 'ECArena', content: text, ts: Date.now()
          });
          chatCount++;
          hadChat = true;
        }
        if (hadChat) userCount++;
      }
    }
    broadcastStatus.textContent = `Рассылка выполнена. Пользователей: ${userCount}. Чатов: ${chatCount}.`;
    broadcastInput.value = '';
  } catch (e) {
    console.log('Broadcast error', e);
    broadcastStatus.textContent = 'Ошибка рассылки. Повторите попытку.';
  } finally {
    broadcastBtn.disabled = false;
  }
}

/* ---------- UI helpers ---------- */
function toggleSidebar() {
  const open = document.body.classList.toggle('sidebar-open');
  backdrop.classList.toggle('hidden', !open);
}
function closeSidebar() {
  document.body.classList.remove('sidebar-open');
  backdrop.classList.add('hidden');
}
function autoResize() {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
}

/* ---------- Events ---------- */
function bindEvents() {
  menuBtn.addEventListener('click', toggleSidebar);
  backdrop.addEventListener('click', closeSidebar);
  newChatBtn.addEventListener('click', newChat);
  logoutBtn.addEventListener('click', logout);

  authBtn.addEventListener('click', handleAuth);
  loginInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') passwordInput.focus(); });
  passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAuth(); });

  sendBtn.addEventListener('click', handleSend);
  messageInput.addEventListener('input', autoResize);
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });

  modelSelect.addEventListener('change', () => {
    if (state.currentUser && state.currentChatId) {
      set(ref(database, `users/${state.currentUser}/chats/${state.currentChatId}/model`), modelSelect.value);
    }
  });

  adminClose.addEventListener('click', closeAdmin);
  broadcastBtn.addEventListener('click', handleBroadcast);
}

/* ---------- Init ---------- */
function init() {
  populateModels();
  bindEvents();
  autoResize();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
  }
