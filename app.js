/* ================================================================
   Editor Code Arena — app.js
   ================================================================ */

/* ----------------------------------------------------------------
   ИКОНКИ — прямые URL (не нужны локальные файлы)
   ---------------------------------------------------------------- */

// Стрелка отправки (send) — простая SVG через data URI
const ICON_SEND_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23111' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='5' y1='12' x2='19' y2='12'/%3E%3Cpolyline points='12 5 19 12 12 19'/%3E%3C/svg%3E";

// DeepSeek — синий кит (Wikimedia Commons, PNG превью)
const ICON_DEEPSEEK_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Deepseek-logo-icon.png/512px-Deepseek-logo-icon.png";

// ChatGPT / OpenAI — официальный логотип
const ICON_CHATGPT_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/512px-ChatGPT_logo.svg.png";

// Gemini — официальный логотип Google Gemini
const ICON_GEMINI_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/512px-Google_Gemini_logo.svg.png";

// Мусорка — inline SVG data URI (чёрная корзина, без emoji)
const ICON_TRASH_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='3 6 5 6 21 6'/%3E%3Cpath d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/%3E%3Cpath d='M10 11v6M14 11v6'/%3E%3Crect x='9' y='2' width='6' height='4' rx='1'/%3E%3C/svg%3E";

// Иконка ошибки — красный круг с восклицательным знаком (inline SVG)
const ICON_ERROR_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='30' fill='%23fddede' stroke='%23cc0000' stroke-width='3'/%3E%3Ctext x='32' y='46' text-anchor='middle' font-size='36' font-family='serif' fill='%23cc0000'%3E!%3C/text%3E%3C/svg%3E";

/* ----------------------------------------------------------------
   FIREBASE CONFIG
   ---------------------------------------------------------------- */
const firebaseConfig = {
  apiKey:            "AIzaSyDPnJbudjIZ2HXpwNmuVO4oHI2aig8Z6jo",
  authDomain:        "eplaypart2.firebaseapp.com",
  projectId:         "eplaypart2",
  storageBucket:     "eplaypart2.appspot.com",
  messagingSenderId: "648051637999",
  appId:             "1:648051637999:web:a9f9476f83f970d90ce51a",
  databaseURL:       "https://eplaypart2-default-rtdb.firebaseio.com"
};

/* ----------------------------------------------------------------
   OPENROUTER API KEYS
   ---------------------------------------------------------------- */
const API_KEYS = {
  'gpt':      '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',
  'gemini':   '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',
  'deepseek': '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'
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/* ----------------------------------------------------------------
   STATE
   ---------------------------------------------------------------- */
let currentUser   = null;
let currentChatId = null;
let chatHistory   = [];
let isSending     = false;

/* ----------------------------------------------------------------
   FIREBASE INIT
   ---------------------------------------------------------------- */
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.database();

/* ----------------------------------------------------------------
   DOM REFS
   ---------------------------------------------------------------- */
const sidebar              = document.getElementById('sidebar');
const sidebarOverlay       = document.getElementById('sidebar-overlay');
const btnMenu              = document.getElementById('btn-menu');
const btnNewChat           = document.getElementById('btn-new-chat');
const chatListEl           = document.getElementById('chat-list');
const btnGoogleSignin      = document.getElementById('btn-google-signin');
const btnGoogleSigninMain  = document.getElementById('btn-google-signin-main');
const profileInfo          = document.getElementById('profile-info');
const profileName          = document.getElementById('profile-name');
const profileEmail         = document.getElementById('profile-email');
const btnSignout           = document.getElementById('btn-signout');
const chatWindow           = document.getElementById('chat-window');
const authNotice           = document.getElementById('auth-notice');
const typingIndicator      = document.getElementById('typing-indicator');
const inputArea            = document.getElementById('input-area');
const inputForm            = document.getElementById('input-form');
const userInput            = document.getElementById('user-input');
const btnSend              = document.getElementById('btn-send');
const modelSelect          = document.getElementById('model-select');
const modelIcon            = document.getElementById('model-icon');
const sendIconEl           = document.getElementById('send-icon');
const adminModal           = document.getElementById('admin-modal');
const adminBroadcastText   = document.getElementById('admin-broadcast-text');
const btnAdminSend         = document.getElementById('btn-admin-send');
const btnAdminClose        = document.getElementById('btn-admin-close');
const adminStatus          = document.getElementById('admin-status');

/* ----------------------------------------------------------------
   APPLY ICONS ON LOAD
   ---------------------------------------------------------------- */
(function applyIcons() {
  sendIconEl.src = ICON_SEND_URL;
  updateModelIcon(modelSelect.value);
})();

function getModelIconUrl(modelId) {
  if (modelId.includes('deepseek'))                          return ICON_DEEPSEEK_URL;
  if (modelId.includes('openai') || modelId.includes('gpt')) return ICON_CHATGPT_URL;
  if (modelId.includes('google') || modelId.includes('gemini')) return ICON_GEMINI_URL;
  return '';
}

function updateModelIcon(modelId) {
  const src = getModelIconUrl(modelId);
  modelIcon.src = src;
  modelIcon.style.display = src ? 'block' : 'none';
}

/* ----------------------------------------------------------------
   API KEY ROUTING
   ---------------------------------------------------------------- */
function getApiKey(modelId) {
  if (modelId.includes('openai') || modelId.includes('gpt'))     return API_KEYS['gpt'];
  if (modelId.includes('gemini') || modelId.includes('google'))  return API_KEYS['gemini'];
  if (modelId.includes('deepseek'))                              return API_KEYS['deepseek'];
  return API_KEYS['gpt'];
}

/* ----------------------------------------------------------------
   SIDEBAR TOGGLE
   ---------------------------------------------------------------- */
btnMenu.addEventListener('click', toggleSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

function toggleSidebar() {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
}
function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('visible');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
}

/* ----------------------------------------------------------------
   MODEL SELECTOR
   ---------------------------------------------------------------- */
modelSelect.addEventListener('change', () => updateModelIcon(modelSelect.value));

/* ----------------------------------------------------------------
   AUTH
   ---------------------------------------------------------------- */
const googleProvider = new firebase.auth.GoogleAuthProvider();

function signIn() {
  auth.signInWithPopup(googleProvider).catch(err => console.log('Auth error:', err));
}

btnGoogleSignin.addEventListener('click', signIn);
btnGoogleSigninMain.addEventListener('click', signIn);
btnSignout.addEventListener('click', () => {
  auth.signOut().catch(err => console.log('Signout error:', err));
});

auth.onAuthStateChanged(user => {
  if (user) { currentUser = user; onLogin(); }
  else       { currentUser = null; onLogout(); }
});

function onLogin() {
  btnGoogleSignin.style.display = 'none';
  profileInfo.classList.add('visible');
  profileName.textContent  = currentUser.displayName || 'Пользователь';
  profileEmail.textContent = currentUser.email || '';

  inputArea.classList.remove('locked');
  btnSend.disabled = false;
  authNotice.classList.add('hidden');

  loadChatList();
  startNewChat();
}

function onLogout() {
  btnGoogleSignin.style.display = '';
  profileInfo.classList.remove('visible');
  profileName.textContent  = '';
  profileEmail.textContent = '';

  inputArea.classList.add('locked');
  btnSend.disabled = true;
  authNotice.classList.remove('hidden');

  clearChatWindow();
  chatListEl.innerHTML = '';
  currentChatId = null;
  chatHistory   = [];
  closeSidebar();
}

/* ----------------------------------------------------------------
   CHAT LIST (sidebar)
   ---------------------------------------------------------------- */
let chatListRef = null;

function loadChatList() {
  if (!currentUser) return;
  if (chatListRef) chatListRef.off();

  chatListRef = db.ref(`users/${currentUser.uid}/chats`);
  chatListRef.on('value', snapshot => {
    renderChatList(snapshot.val() || {});
  });
}

function renderChatList(data) {
  chatListEl.innerHTML = '';
  const entries = Object.entries(data).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));

  entries.forEach(([id, chat]) => {
    const item = document.createElement('div');
    item.className = 'chat-item' + (id === currentChatId ? ' active' : '');
    item.dataset.id = id;

    const titleEl = document.createElement('span');
    titleEl.className = 'chat-item-title';
    titleEl.textContent = chat.title || 'Без названия';

    const delBtn = document.createElement('button');
    delBtn.className = 'chat-item-delete';
    delBtn.title = 'Удалить';
    delBtn.setAttribute('aria-label', 'Удалить чат');

    const trashImg = document.createElement('img');
    trashImg.src = ICON_TRASH_URL;
    trashImg.className = 'icon-trash';
    trashImg.alt = '';
    delBtn.appendChild(trashImg);

    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      deleteChat(id);
    });

    item.appendChild(titleEl);
    item.appendChild(delBtn);
    item.addEventListener('click', () => { loadChat(id, chat); closeSidebar(); });
    chatListEl.appendChild(item);
  });
}

function deleteChat(chatId) {
  if (!currentUser) return;
  db.ref(`users/${currentUser.uid}/chats/${chatId}`).remove()
    .catch(err => console.log('Delete chat error:', err));
  if (chatId === currentChatId) startNewChat();
}

/* ----------------------------------------------------------------
   CHAT LOADING & NEW CHAT
   ---------------------------------------------------------------- */
function startNewChat() {
  currentChatId = null;
  chatHistory   = [];
  clearChatWindow();
  userInput.value = '';
  autoResize();
}

function loadChat(id, chat) {
  currentChatId = id;
  chatHistory   = chat.messages ? Object.values(chat.messages) : [];
  clearChatWindow();
  chatHistory.forEach(msg => appendMessage(msg.role, msg.content, msg.sender || null, false));
  scrollToBottom();
}

btnNewChat.addEventListener('click', () => { startNewChat(); closeSidebar(); });

/* ----------------------------------------------------------------
   CLEAR CHAT WINDOW
   ---------------------------------------------------------------- */
function clearChatWindow() {
  chatWindow.querySelectorAll('.message').forEach(m => m.remove());
}

/* ----------------------------------------------------------------
   RENDER MESSAGE
   ---------------------------------------------------------------- */
function appendMessage(role, content, sender, scroll) {
  const wrap = document.createElement('div');
  wrap.className = 'message';

  if (role === 'system') {
    // Системное сообщение (рассылка от ECArena)
    wrap.classList.add('message-system');

    const label = document.createElement('div');
    label.className = 'msg-label';
    label.textContent = sender || 'ECArena';

    const body = document.createElement('div');
    body.className = 'msg-body';
    body.textContent = content;

    wrap.appendChild(label);
    wrap.appendChild(body);

  } else if (role === 'error') {
    // Блок ошибки — картинка error + текст
    wrap.classList.add('message-error');

    const errorImg = document.createElement('img');
    errorImg.src = ICON_ERROR_URL;
    errorImg.alt = '';
    errorImg.className = 'error-icon';

    const errorText = document.createElement('div');
    errorText.className = 'error-text';
    errorText.textContent = content;

    wrap.appendChild(errorImg);
    wrap.appendChild(errorText);

  } else if (role === 'user') {
    wrap.classList.add('message-user');

    const label = document.createElement('div');
    label.className = 'msg-label';
    label.textContent = 'Вы';

    const body = document.createElement('div');
    body.className = 'msg-body';
    body.textContent = content;

    wrap.appendChild(label);
    wrap.appendChild(body);

  } else {
    // assistant
    wrap.classList.add('message-assistant');

    const label = document.createElement('div');
    label.className = 'msg-label';

    const iconSrc = getModelIconUrl(modelSelect.value);
    if (iconSrc) {
      const img = document.createElement('img');
      img.src = iconSrc;
      img.alt = '';
      label.appendChild(img);
    }
    label.appendChild(document.createTextNode(sender || getModelLabel(modelSelect.value)));

    const body = document.createElement('div');
    body.className = 'msg-body';
    body.innerHTML = renderMarkdown(content);

    body.querySelectorAll('.code-block-wrap').forEach(block => {
      const copyBtn = block.querySelector('.btn-copy-code');
      const code    = block.querySelector('code');
      if (copyBtn && code) {
        copyBtn.addEventListener('click', () => copyToClipboard(code.textContent, copyBtn));
      }
    });

    wrap.appendChild(label);
    wrap.appendChild(body);
  }

  chatWindow.appendChild(wrap);
  if (scroll !== false) scrollToBottom();
  return wrap;
}

function getModelLabel(modelId) {
  const opt = document.querySelector(`#model-select option[value="${modelId}"]`);
  return opt ? opt.textContent : modelId;
}

/* ----------------------------------------------------------------
   MARKDOWN RENDERER
   ---------------------------------------------------------------- */
function renderMarkdown(text) {
  let result = '';
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    result += processInline(text.slice(lastIndex, match.index));
    const lang = match[1] || 'text';
    const code = escapeHtml(match[2]);
    result += `<div class="code-block-wrap">
      <div class="code-block-header">
        <span class="code-block-lang">${escapeHtml(lang)}</span>
        <button class="btn-copy-code" type="button">Копировать</button>
      </div>
      <pre class="code-block"><code>${code}</code></pre>
    </div>`;
    lastIndex = match.index + match[0].length;
  }

  result += processInline(text.slice(lastIndex));
  return result;
}

function processInline(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = 'Скопировано';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  }).catch(err => console.log('Copy error:', err));
}

/* ----------------------------------------------------------------
   SCROLL
   ---------------------------------------------------------------- */
function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* ----------------------------------------------------------------
   TEXTAREA AUTO-RESIZE
   ---------------------------------------------------------------- */
userInput.addEventListener('input', autoResize);

function autoResize() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
}

userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!isSending) handleSubmit();
  }
});

/* ----------------------------------------------------------------
   FORM SUBMIT
   ---------------------------------------------------------------- */
inputForm.addEventListener('submit', e => { e.preventDefault(); if (!isSending) handleSubmit(); });

async function handleSubmit() {
  if (!currentUser) return;
  const text = userInput.value.trim();
  if (!text) return;

  // ADMIN COMMAND
  if (text === '/admin') {
    userInput.value = '';
    autoResize();
    openAdminModal();
    return;
  }

  isSending = true;
  btnSend.disabled = true;
  userInput.value  = '';
  autoResize();

  appendMessage('user', text, null, true);
  chatHistory.push({ role: 'user', content: text });

  // Создание нового чата при первом сообщении
  if (!currentChatId) {
    currentChatId = db.ref(`users/${currentUser.uid}/chats`).push().key;
    const title = text.slice(0, 25) + (text.length > 25 ? '...' : '');
    await db.ref(`users/${currentUser.uid}/chats/${currentChatId}`).set({
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages:  {}
    });
  }

  await saveMessage({ role: 'user', content: text });

  typingIndicator.classList.add('visible');
  scrollToBottom();

  const modelId = modelSelect.value;
  const apiKey  = getApiKey(modelId);
  let assistantContent = '';

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
        'HTTP-Referer':  window.location.href,
        'X-Title':       'Editor Code Arena'
      },
      body: JSON.stringify({
        model: modelId,
        messages: chatHistory.map(m => ({
          role:    m.role === 'system' ? 'user' : m.role,
          content: m.content
        })),
        stream: false
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log('API error:', response.status, errText);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    assistantContent = data.choices?.[0]?.message?.content || '';
    if (!assistantContent) throw new Error('Empty response');

  } catch (err) {
    console.log('Request error:', err);
    assistantContent = null;
  }

  typingIndicator.classList.remove('visible');

  if (assistantContent === null) {
    // Показываем блок ошибки с иконкой
    appendMessage('error', 'Модель перегружена, повторите запрос позже.', null, true);
    // Убираем последний user-запрос из истории, чтобы можно было повторить
    chatHistory.pop();
  } else {
    chatHistory.push({ role: 'assistant', content: assistantContent });
    appendMessage('assistant', assistantContent, null, true);
    await saveMessage({ role: 'assistant', content: assistantContent, sender: getModelLabel(modelId) });
    await db.ref(`users/${currentUser.uid}/chats/${currentChatId}/updatedAt`).set(Date.now());
  }

  isSending = false;
  btnSend.disabled = false;
  userInput.focus();
}

/* ----------------------------------------------------------------
   SAVE MESSAGE TO FIREBASE
   ---------------------------------------------------------------- */
async function saveMessage(msg) {
  if (!currentUser || !currentChatId) return;
  await db.ref(`users/${currentUser.uid}/chats/${currentChatId}/messages`).push(msg);
}

/* ----------------------------------------------------------------
   ADMIN MODAL
   ---------------------------------------------------------------- */
function openAdminModal() {
  adminModal.classList.add('visible');
  adminBroadcastText.value = '';
  adminStatus.textContent  = '';
}

function closeAdminModal() {
  adminModal.classList.remove('visible');
}

btnAdminClose.addEventListener('click', closeAdminModal);
adminModal.addEventListener('click', e => { if (e.target === adminModal) closeAdminModal(); });

btnAdminSend.addEventListener('click', async () => {
  const msg = adminBroadcastText.value.trim();
  if (!msg) return;

  btnAdminSend.disabled   = true;
  adminStatus.textContent = 'Рассылка...';

  try {
    const snapshot = await db.ref('users').once('value');
    const users    = snapshot.val() || {};
    const promises = [];

    Object.entries(users).forEach(([uid, userData]) => {
      const chats = userData.chats || {};
      Object.keys(chats).forEach(chatId => {
        promises.push(
          db.ref(`users/${uid}/chats/${chatId}/messages`).push({
            role:    'system',
            sender:  'ECArena',
            content: msg
          })
        );
      });
    });

    await Promise.all(promises);
    adminStatus.textContent = `Готово. Отправлено в ${promises.length} чатов.`;
  } catch (err) {
    console.log('Broadcast error:', err);
    adminStatus.textContent = 'Ошибка рассылки. Подробности в консоли.';
  }

  btnAdminSend.disabled = false;
});
