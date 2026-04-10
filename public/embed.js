(function () {
  'use strict';

  if (document.getElementById('dbjcb-root')) return;

  // ─── Config ────────────────────────────────────────────────────────────────
  var P = '#1a5c6b';

  var CONFIG = {
    practiceId: 'e4137916-7d89-4262-bc3c-ce2added3dc2',
    apiUrl: 'https://dbj-chatbot.vercel.app/api/chat',
    name: 'Bright Smile Dental',
    primaryColor: P,
    greetingDelay: 15000,
    greetingMessage: "Looking for a new dentist? I can help you find the right fit.",
    quickReplies: [
      { label: 'Book appointment', icon: 'calendar', msg: "I'd like to book an appointment" },
      { label: 'Insurance questions', icon: 'shield',   msg: 'What insurance do you accept?' },
      { label: 'I have a toothache',  icon: 'alert',    msg: 'I have a toothache and need help' },
      { label: 'Hours & location',    icon: 'pin',      msg: 'What are your hours and location?' },
    ],
  };

  // ─── State ─────────────────────────────────────────────────────────────────
  var isOpen           = false;
  var msgs             = [];
  var isTyping         = false;
  var showInit         = true;
  var showGreeting     = false;
  var greetingDismissed = false;

  // ─── SVG icons ─────────────────────────────────────────────────────────────
  var ICONS = {
    logoFab:  '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    logoHdr:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 3-1.5 5-3.5 7L12 22l-3.5-6C6.5 14 5 12 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2"/></svg>',
    logoAvt:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 3-1.5 5-3.5 7L12 22l-3.5-6C6.5 14 5 12 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2"/></svg>',
    logoGrt:  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 3-1.5 5-3.5 7L12 22l-3.5-6C6.5 14 5 12 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2"/></svg>',
    closeHdr: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    closeX:   '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    send:     '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    person:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    calendar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    shield:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    alert:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    pin:      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  };

  // ─── DOM refs ──────────────────────────────────────────────────────────────
  var fab, fabBadge, chatWindow, chatBody, chatInput, sendBtn, greetingWrap, chipsWrap;

  // ─── Styles ────────────────────────────────────────────────────────────────
  function injectStyles() {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap';
    document.head.appendChild(link);

    var style = document.createElement('style');
    style.id = 'dbjcb-styles';
    style.textContent = [
      '@keyframes dbjcb-fade{from{opacity:0}to{opacity:1}}',
      '@keyframes dbjcb-dot{0%,60%,100%{opacity:.3;transform:scale(.85)}30%{opacity:1;transform:scale(1)}}',
      '@keyframes dbjcb-slide{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}',
      '@keyframes dbjcb-greet{from{opacity:0;transform:translateY(8px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}',
      '@keyframes dbjcb-pulse{0%{transform:scale(1)}50%{transform:scale(1.2)}100%{transform:scale(1)}}',

      '.dbjcb-win{position:fixed;bottom:96px;right:24px;width:380px;max-width:calc(100vw - 32px);height:580px;max-height:calc(100vh - 120px);background:#fff;border-radius:20px;box-shadow:0 12px 48px rgba(0,0,0,.15),0 2px 8px rgba(0,0,0,.08);display:flex;flex-direction:column;overflow:hidden;border:1px solid #e2e6eb;animation:dbjcb-slide .3s cubic-bezier(.16,1,.3,1);z-index:99998;font-family:"DM Sans",sans-serif;-webkit-font-smoothing:antialiased;}',

      '@media(max-width:500px){.dbjcb-win{bottom:0!important;right:0!important;left:0!important;width:100%!important;max-width:100%!important;height:100vh!important;height:100dvh!important;max-height:100vh!important;border-radius:0!important;border:none!important;}}',

      '.dbjcb-hdr{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 14px;background:' + P + ';flex-shrink:0;}',
      '.dbjcb-hdr-left{display:flex;align-items:center;gap:12px;}',
      '.dbjcb-hdr-icon{width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;}',
      '.dbjcb-hdr-name{font-size:15px;font-weight:600;color:#fff;font-family:"DM Sans",sans-serif;}',
      '.dbjcb-hdr-status{font-size:12px;color:rgba(255,255,255,.8);display:flex;align-items:center;gap:6px;font-family:"DM Sans",sans-serif;}',
      '.dbjcb-status-dot{width:7px;height:7px;border-radius:50%;background:#2dd4a8;display:inline-block;}',
      '.dbjcb-close-btn{background:rgba(255,255,255,.12);border:none;color:#fff;cursor:pointer;padding:6px;border-radius:10px;display:flex;align-items:center;justify-content:center;}',

      '.dbjcb-body{flex:1;overflow-y:auto;padding:16px 16px 8px;display:flex;flex-direction:column;gap:6px;scroll-behavior:smooth;}',

      '.dbjcb-welcome{text-align:center;padding:8px 12px 14px;}',
      '.dbjcb-welcome-title{font-size:16px;font-weight:600;margin:0 0 4px;color:#1a1d21;font-family:"DM Sans",sans-serif;}',
      '.dbjcb-welcome-sub{font-size:11.5px;color:#5f6b7a;margin:0;opacity:.7;font-family:"DM Sans",sans-serif;}',

      '.dbjcb-chips{display:flex;flex-wrap:wrap;gap:7px;padding:6px 0;}',
      '.dbjcb-chip{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;font-size:13px;font-weight:500;font-family:"DM Sans",sans-serif;color:#1a1d21;background:#f4f6f8;border:1.5px solid #e2e6eb;border-radius:50px;cursor:pointer;white-space:nowrap;transition:border-color .15s,background .15s;}',
      '.dbjcb-chip:hover{border-color:' + P + ';background:#eef6f7;}',

      '.dbjcb-row{display:flex;align-items:flex-end;gap:8px;animation:dbjcb-fade .25s ease;}',
      '.dbjcb-row-user{justify-content:flex-end;}',
      '.dbjcb-avatar{width:28px;height:28px;border-radius:9px;background:' + P + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
      '.dbjcb-bbl-user{max-width:78%;padding:10px 14px;font-size:13.5px;line-height:1.55;word-break:break-word;white-space:pre-wrap;box-shadow:0 1px 3px rgba(0,0,0,.06);background:' + P + ';color:#fff;border-radius:18px 18px 6px 18px;margin-left:auto;font-family:"DM Sans",sans-serif;}',
      '.dbjcb-bbl-bot{max-width:78%;padding:10px 14px;font-size:13.5px;line-height:1.55;word-break:break-word;white-space:pre-wrap;box-shadow:0 1px 3px rgba(0,0,0,.06);background:#f4f6f8;color:#1a1d21;border-radius:18px 18px 18px 6px;font-family:"DM Sans",sans-serif;}',

      '.dbjcb-typing{display:flex;align-items:flex-end;gap:8px;animation:dbjcb-fade .3s ease;}',
      '.dbjcb-typing-bbl{background:#f4f6f8;border-radius:18px 18px 18px 6px;padding:12px 18px;display:flex;gap:5px;}',
      '.dbjcb-dot{width:7px;height:7px;border-radius:50%;background:#5f6b7a;display:block;animation:dbjcb-dot 1.1s ease-in-out infinite;}',

      '.dbjcb-handoff{padding:0 16px;flex-shrink:0;border-top:1px solid #e2e6eb;}',
      '.dbjcb-handoff-btn{display:flex;align-items:center;gap:7px;background:none;border:none;font-family:"DM Sans",sans-serif;font-size:12.5px;font-weight:500;color:#5f6b7a;cursor:pointer;padding:10px 0;width:100%;justify-content:center;transition:color .15s;}',
      '.dbjcb-handoff-btn:hover{color:' + P + ';}',

      '.dbjcb-input-area{display:flex;align-items:center;gap:8px;padding:10px 12px 14px;flex-shrink:0;}',
      '@media(max-width:500px){.dbjcb-input-area{padding-bottom:max(14px,env(safe-area-inset-bottom));}}',
      '.dbjcb-input{flex:1;padding:10px 14px;font-size:16px;font-family:"DM Sans",sans-serif;border:1.5px solid #e2e6eb;border-radius:50px;outline:none;color:#1a1d21;background:#f4f6f8;transition:border-color .15s;}',
      '.dbjcb-input:focus{border-color:' + P + ';}',
      '.dbjcb-send-btn{width:38px;height:38px;border-radius:50%;border:none;background:' + P + ';cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s;}',

      '.dbjcb-fab{position:fixed;bottom:24px;right:24px;width:58px;height:58px;border-radius:50%;border:none;background:' + P + ';cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.2);transition:transform .2s cubic-bezier(.16,1,.3,1),opacity .2s;z-index:99999;}',
      '.dbjcb-fab-hidden{transform:scale(0);opacity:0;pointer-events:none;}',
      '.dbjcb-badge{position:absolute;top:-2px;right:-2px;width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid #fff;animation:dbjcb-pulse 2s ease-in-out infinite;z-index:2;}',

      '.dbjcb-greet-wrap{position:fixed;bottom:96px;right:24px;animation:dbjcb-greet .4s cubic-bezier(.16,1,.3,1);z-index:99999;font-family:"DM Sans",sans-serif;-webkit-font-smoothing:antialiased;cursor:pointer;}',
      '.dbjcb-greet-bubble{background:#fff;border-radius:16px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.12),0 1px 4px rgba(0,0,0,.06);max-width:280px;min-width:200px;position:relative;border:1px solid #e2e6eb;}',
      '.dbjcb-greet-x{position:absolute;top:8px;right:8px;background:#f4f4f4;cursor:pointer;width:28px;height:28px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:50%;border:none;z-index:10;}',
      '.dbjcb-greet-x:hover{background:#e0e0e0;}',
      '.dbjcb-greet-tail{width:14px;height:14px;background:#fff;border-right:1px solid #e2e6eb;border-bottom:1px solid #e2e6eb;transform:rotate(45deg);position:absolute;bottom:-7px;right:28px;box-shadow:2px 2px 4px rgba(0,0,0,.04);}',

      '@media(max-width:500px){.dbjcb-greet-wrap{right:16px;bottom:92px;}.dbjcb-fab{bottom:20px;right:16px;}}',
    ].join('');
    document.head.appendChild(style);
  }

  // ─── DOM builders ──────────────────────────────────────────────────────────
  function makeAvatar() {
    var d = document.createElement('div');
    d.className = 'dbjcb-avatar';
    d.innerHTML = ICONS.logoAvt;
    return d;
  }

  function buildWindow() {
    // Header
    var hdrIcon = document.createElement('div');
    hdrIcon.className = 'dbjcb-hdr-icon';
    hdrIcon.innerHTML = ICONS.logoHdr;

    var hdrName = document.createElement('div');
    hdrName.className = 'dbjcb-hdr-name';
    hdrName.textContent = CONFIG.name;

    var hdrStatus = document.createElement('div');
    hdrStatus.className = 'dbjcb-hdr-status';
    hdrStatus.innerHTML = '<span class="dbjcb-status-dot"></span> AI Assistant';

    var hdrText = document.createElement('div');
    hdrText.appendChild(hdrName);
    hdrText.appendChild(hdrStatus);

    var hdrLeft = document.createElement('div');
    hdrLeft.className = 'dbjcb-hdr-left';
    hdrLeft.appendChild(hdrIcon);
    hdrLeft.appendChild(hdrText);

    var closeBtn = document.createElement('button');
    closeBtn.className = 'dbjcb-close-btn';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = ICONS.closeHdr;
    closeBtn.addEventListener('click', closeChat);

    var hdr = document.createElement('div');
    hdr.className = 'dbjcb-hdr';
    hdr.appendChild(hdrLeft);
    hdr.appendChild(closeBtn);

    // Body
    chatBody = document.createElement('div');
    chatBody.className = 'dbjcb-body';

    var welcomeTitle = document.createElement('p');
    welcomeTitle.className = 'dbjcb-welcome-title';
    welcomeTitle.textContent = 'Hi! How can we help you today?';

    var welcomeSub = document.createElement('p');
    welcomeSub.className = 'dbjcb-welcome-sub';
    welcomeSub.textContent = 'Powered by AI \u00b7 Responses may not be 100% accurate';

    var welcome = document.createElement('div');
    welcome.className = 'dbjcb-welcome';
    welcome.appendChild(welcomeTitle);
    welcome.appendChild(welcomeSub);
    chatBody.appendChild(welcome);

    chipsWrap = document.createElement('div');
    chipsWrap.className = 'dbjcb-chips';
    CONFIG.quickReplies.forEach(function (r) {
      var chip = document.createElement('button');
      chip.className = 'dbjcb-chip';
      chip.innerHTML = ICONS[r.icon] + ' ' + r.label;
      chip.addEventListener('click', function () { sendMsg(r.msg); });
      chipsWrap.appendChild(chip);
    });
    chatBody.appendChild(chipsWrap);

    // Handoff bar
    var handoffBtn = document.createElement('button');
    handoffBtn.className = 'dbjcb-handoff-btn';
    handoffBtn.innerHTML = ICONS.person + ' Talk to our team';

    var handoff = document.createElement('div');
    handoff.className = 'dbjcb-handoff';
    handoff.appendChild(handoffBtn);

    // Input area
    chatInput = document.createElement('input');
    chatInput.className = 'dbjcb-input';
    chatInput.type = 'text';
    chatInput.placeholder = 'Type a message...';
    chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
    });
    chatInput.addEventListener('input', syncSendBtn);

    sendBtn = document.createElement('button');
    sendBtn.className = 'dbjcb-send-btn';
    sendBtn.setAttribute('aria-label', 'Send');
    sendBtn.innerHTML = ICONS.send;
    sendBtn.style.opacity = '0.35';
    sendBtn.disabled = true;
    sendBtn.addEventListener('click', handleSend);

    var inputArea = document.createElement('div');
    inputArea.className = 'dbjcb-input-area';
    inputArea.appendChild(chatInput);
    inputArea.appendChild(sendBtn);

    // Assemble
    chatWindow = document.createElement('div');
    chatWindow.className = 'dbjcb-win';
    chatWindow.style.display = 'none';
    chatWindow.appendChild(hdr);
    chatWindow.appendChild(chatBody);
    chatWindow.appendChild(handoff);
    chatWindow.appendChild(inputArea);

    return chatWindow;
  }

  function buildGreeting() {
    var xBtn = document.createElement('div');
    xBtn.className = 'dbjcb-greet-x';
    xBtn.setAttribute('data-dismiss', 'true');
    xBtn.innerHTML = ICONS.closeX;

    var logoBox = document.createElement('div');
    logoBox.style.cssText = 'width:22px;height:22px;border-radius:6px;background:' + P + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    logoBox.innerHTML = ICONS.logoGrt;

    var nameSpan = document.createElement('span');
    nameSpan.style.cssText = 'font-size:12px;font-weight:600;color:#333;';
    nameSpan.textContent = CONFIG.name;

    var headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex;align-items:center;gap:7px;margin-bottom:6px;';
    headerRow.appendChild(logoBox);
    headerRow.appendChild(nameSpan);

    var msgP = document.createElement('p');
    msgP.style.cssText = 'font-size:13.5px;color:#444;margin:0;line-height:1.45;padding-right:24px;';
    msgP.textContent = CONFIG.greetingMessage;

    var bubble = document.createElement('div');
    bubble.className = 'dbjcb-greet-bubble';
    bubble.appendChild(xBtn);
    bubble.appendChild(headerRow);
    bubble.appendChild(msgP);

    var tail = document.createElement('div');
    tail.className = 'dbjcb-greet-tail';

    greetingWrap = document.createElement('div');
    greetingWrap.className = 'dbjcb-greet-wrap';
    greetingWrap.style.display = 'none';
    greetingWrap.appendChild(bubble);
    greetingWrap.appendChild(tail);

    greetingWrap.addEventListener('mousedown', function (e) {
      if (e.target.closest('[data-dismiss]')) {
        dismissGreeting();
      } else {
        openChat();
      }
    });

    return greetingWrap;
  }

  function buildFab() {
    fab = document.createElement('button');
    fab.className = 'dbjcb-fab';
    fab.setAttribute('aria-label', 'Chat');
    fab.innerHTML = ICONS.logoFab;
    fab.addEventListener('click', toggleChat);

    fabBadge = document.createElement('span');
    fabBadge.className = 'dbjcb-badge';
    fabBadge.style.display = 'none';
    fab.appendChild(fabBadge);

    return fab;
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  function renderMessages() {
    var existing = chatBody.querySelectorAll('.dbjcb-row, .dbjcb-typing');
    for (var i = 0; i < existing.length; i++) existing[i].remove();

    msgs.forEach(function (m) {
      var row = document.createElement('div');
      row.className = 'dbjcb-row' + (m.role === 'user' ? ' dbjcb-row-user' : '');

      if (m.role === 'assistant') row.appendChild(makeAvatar());

      var bbl = document.createElement('div');
      bbl.className = m.role === 'user' ? 'dbjcb-bbl-user' : 'dbjcb-bbl-bot';
      bbl.textContent = m.text;
      row.appendChild(bbl);

      chatBody.appendChild(row);
    });

    if (isTyping) {
      var typingRow = document.createElement('div');
      typingRow.className = 'dbjcb-typing';
      typingRow.appendChild(makeAvatar());

      var typingBbl = document.createElement('div');
      typingBbl.className = 'dbjcb-typing-bbl';
      [0, 1, 2].forEach(function (i) {
        var dot = document.createElement('span');
        dot.className = 'dbjcb-dot';
        dot.style.animationDelay = (i * 0.18) + 's';
        typingBbl.appendChild(dot);
      });
      typingRow.appendChild(typingBbl);
      chatBody.appendChild(typingRow);
    }

    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function syncSendBtn() {
    var hasText = chatInput.value.trim().length > 0;
    sendBtn.disabled = !hasText;
    sendBtn.style.opacity = hasText ? '1' : '0.35';
  }

  function hideChips() {
    if (chipsWrap) chipsWrap.style.display = 'none';
  }

  // ─── Actions ───────────────────────────────────────────────────────────────
  function openChat() {
    isOpen = true;
    showGreeting = false;
    greetingDismissed = true;
    chatWindow.style.display = 'flex';
    fab.classList.add('dbjcb-fab-hidden');
    greetingWrap.style.display = 'none';
    fabBadge.style.display = 'none';
    setTimeout(function () { if (chatInput) chatInput.focus(); }, 100);
  }

  function closeChat() {
    isOpen = false;
    chatWindow.style.display = 'none';
    fab.classList.remove('dbjcb-fab-hidden');
  }

  function toggleChat() {
    if (isOpen) closeChat(); else openChat();
  }

  function dismissGreeting() {
    showGreeting = false;
    greetingDismissed = true;
    greetingWrap.style.display = 'none';
    fabBadge.style.display = 'none';
  }

  function sendMsg(text) {
    if (showInit) { showInit = false; hideChips(); }

    var userMsg = { role: 'user', text: text };
    msgs.push(userMsg);
    isTyping = true;
    renderMessages();

    var payload = {
      practiceId: CONFIG.practiceId,
      messages: msgs.map(function (m) { return { role: m.role, content: m.text }; }),
    };

    fetch(CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(function (res) {
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var assistantText = '';
      isTyping = false;
      msgs.push({ role: 'assistant', text: '' });
      renderMessages();

      function read() {
        return reader.read().then(function (result) {
          if (result.done) return;
          var chunk = decoder.decode(result.value, { stream: true });
          var lines = chunk.split('\n').filter(function (l) { return l.indexOf('data: ') === 0; });
          lines.forEach(function (line) {
            try {
              var json = JSON.parse(line.slice(6));
              if (json.type === 'text') {
                assistantText += json.text;
                msgs[msgs.length - 1].text = assistantText;
                renderMessages();
              }
            } catch (e) {}
          });
          return read();
        });
      }
      return read();
    }).catch(function () {
      isTyping = false;
      msgs.push({ role: 'assistant', text: "I'm having trouble connecting right now. Please call us at (617) 555-0123 and we\u2019ll be happy to help." });
      renderMessages();
    });
  }

  function handleSend() {
    var text = chatInput.value.trim();
    if (text) { sendMsg(text); chatInput.value = ''; syncSendBtn(); }
  }

  // ─── Init ──────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();

    var root = document.createElement('div');
    root.id = 'dbjcb-root';
    root.appendChild(buildWindow());
    root.appendChild(buildGreeting());
    root.appendChild(buildFab());
    document.body.appendChild(root);

    setTimeout(function () {
      if (!isOpen && !greetingDismissed) {
        showGreeting = true;
        greetingWrap.style.display = 'block';
        fabBadge.style.display = 'block';
      }
    }, CONFIG.greetingDelay);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
