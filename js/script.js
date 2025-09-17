// ==============================
// LearnBot script.js (Merged)
// Combines old class-based UI with new Markdown, KaTeX, and file upload features
// Dependencies:
// - marked.js, DOMPurify, KaTeX, Font Awesome (new)
// - Bootstrap (old)
// ==============================

const API_BASE = "http://127.0.0.1:5000";
/* window.API_BASE_URL = "http://127.0.0.1:5000"; */

class LearnBotUI {
  constructor() {
    this.initializeElements();
    this.bindEvents();
    this.setupTextareaAutoResize();
    this.setupModelSelector();
    this.loadChatHistory();
    window.learnbotUI = this;
    
    // Add debug logs here
    console.log('learnbotUI', window.learnbotUI);
    console.log('chatMessages el:', document.getElementById('chatMessages'));
    console.log('alt container:', document.getElementById('chat-container'));
    
    this.showWelcomeModal(false);
  }

  initializeElements() {
    // Sidebar elements (old)
    this.sidebar = document.getElementById("sidebar");
    this.sidebarOverlay = document.getElementById("sidebarOverlay");
    this.toggleSidebarBtn = document.getElementById("toggleSidebar");
    this.closeSidebarBtn = document.getElementById("closeSidebar");
    this.newChatBtn = document.getElementById("newChatBtn");

    // Chat elements (mix of old and new)
    this.chatMessages = document.getElementById("chatMessages") || document.getElementById("chat-container");
    this.messageInput = document.getElementById("messageInput") || document.getElementById("user-input");
    this.sendBtn = document.getElementById("sendBtn") || document.getElementById("send-btn");
    this.fileInput = document.getElementById("fileInput") || document.getElementById("file-input");
    this.imageInput = document.getElementById("imageInput");
    this.fileUploadBtn = document.getElementById("fileUploadBtn");
    this.uploadMenu = document.getElementById("uploadMenu");
    this.filePreview = document.getElementById("filePreview");
    this.explanationLevelBtn = document.getElementById("explanationLevelBtn");
    this.explanationLevelMenu = document.getElementById("explanationLevelMenu");
    this.modelSelector = document.getElementById("modelSelect") || document.getElementById("provider-select");

    // State (old)
    this.selectedFile = null;
    this.isProcessing = false;
    this.currentExplanationLevel = "layman";
    this.selectedProvider = sessionStorage.getItem("learnbot_provider") || "gemini";

    // Keys (mix: old key, new MAX_HISTORY)
    this.CHAT_KEY = "learnbot_chat_history";
    this.WELCOME_BEHAVIOR_KEY = "learnbot_welcome_behavior";
    this.MAX_HISTORY = 200;
    if (!sessionStorage.getItem(this.WELCOME_BEHAVIOR_KEY)) {
      sessionStorage.setItem(this.WELCOME_BEHAVIOR_KEY, 'always');
    }

    // Inject spinner CSS (new)
    const style = document.createElement("style");
    style.textContent = `
      .spinner {
        border: 2px solid #f3f3f3;
        border-top: 2px solid #555;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        display: inline-block;
        animation: spin 1s linear infinite;
      }
      @keyframes spin { 100% { transform: rotate(360deg); } }
      /* .message { max-height: 300px; overflow-y: auto; } */
    `;
    document.head.appendChild(style);
  }

  bindEvents() {
    // Sidebar events (old)
    this.toggleSidebarBtn?.addEventListener("click", () => this.toggleSidebar());
    this.closeSidebarBtn?.addEventListener("click", () => this.closeSidebar());
    this.sidebarOverlay?.addEventListener("click", () => this.closeSidebar());
    this.newChatBtn?.addEventListener("click", () => this.startNewChat());

    // Input events (old + new Enter keypress)
    this.messageInput?.addEventListener("input", () => this.handleInputChange());
    this.messageInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!this.sendBtn?.disabled) this.sendMessage();
      }
    });
    this.sendBtn?.addEventListener("click", () => this.sendMessage());

    // Upload menu (old + new file types)
    this.fileUploadBtn?.addEventListener("click", (e) => { e.stopPropagation(); this.toggleUploadMenu(); });
    document.getElementById("uploadImage")?.addEventListener("click", () => { this.imageInput?.click(); this.hideUploadMenu(); });
    document.getElementById("uploadFile")?.addEventListener("click", () => { this.fileInput?.click(); this.hideUploadMenu(); });
    this.fileInput?.addEventListener("change", (e) => this.handleFileSelect(e));
    this.imageInput?.addEventListener("change", (e) => this.handleFileSelect(e));

    // Explanation level (old)
    this.explanationLevelBtn?.addEventListener("click", (e) => { e.stopPropagation(); this.toggleExplanationMenu(); });
    const explanationOptions = document.querySelectorAll(".explanation-option");
    explanationOptions.forEach((option) => option.addEventListener('click', () => this.selectExplanationLevel(option.dataset.value)));

    // Outside click handler (old)
    document.addEventListener('click', (e) => {
      try {
        this.hideUploadMenu();
        this.hideExplanationMenu();
        if (this.sidebar?.classList.contains('show') && window.innerWidth < 992) {
          const clickedInsideSidebar = this.sidebar.contains(e.target);
          const clickedToggle = this.toggleSidebarBtn?.contains(e.target);
          if (!clickedInsideSidebar && !clickedToggle) this.closeSidebar();
        }
      } catch (err) {
        console.warn('Error in outside-click handler', err);
      }
    });

    // File preview remove (old)
    this.filePreview?.querySelector('.remove-file')?.addEventListener('click', () => this.removeFile());

    // Window resize (old)
    window.addEventListener('resize', () => this.handleResize());

    // Model selector (old + new feedback)
    if (this.modelSelector) {
      this.modelSelector.value = sessionStorage.getItem('learnbot_provider') || this.selectedProvider;
      this.modelSelector.addEventListener('change', (e) => this.setProvider(e.target.value));
    }

    // Info button (old)
    document.getElementById('infoBtn')?.addEventListener('click', () => {
      sessionStorage.removeItem('learnbot_welcomed');
      this.showWelcomeModal(true);
    });

    // Dev toggle: Shift+W (old)
    document.addEventListener('keydown', (e) => {
      if (e.shiftKey && e.key.toLowerCase() === 'w') {
        const current = sessionStorage.getItem(this.WELCOME_BEHAVIOR_KEY) || 'always';
        const next = current === 'always' ? 'session' : 'always';
        sessionStorage.setItem(this.WELCOME_BEHAVIOR_KEY, next);
        this.createMessageBubble(`Welcome modal behavior set to: ${next} (dev toggle)`, 'bot');
      }
    });
  }

  setupTextareaAutoResize() {
    if (!this.messageInput) return;
    this.messageInput.addEventListener('input', () => {
      this.messageInput.style.height = 'auto';
      const newHeight = Math.min(this.messageInput.scrollHeight, 200);
      this.messageInput.style.height = newHeight + 'px';
      const inputRow = this.messageInput.closest('.input-row');
      if (inputRow) inputRow.style.minHeight = Math.max(48, newHeight + 24) + 'px';
    });
  }

  setupModelSelector() {
    if (this.modelSelector) {
      this.modelSelector.value = sessionStorage.getItem('learnbot_provider') || this.selectedProvider;
    }
  }

  setProvider(provider) {
    this.selectedProvider = provider;
    sessionStorage.setItem("learnbot_provider", provider);
    let label = provider === "t5" ? "Local T5" : provider === "gemini" ? "LearnBot (Gemini)" : provider === "openai" ? "OpenAI" : provider;
    this.createMessageBubble(`Switched to ${label} — provider saved for this session.`, 'bot');
  }

  showWelcomeModal(force = false) {
    const behavior = sessionStorage.getItem(this.WELCOME_BEHAVIOR_KEY) || 'always';
    if (!force && behavior === 'session' && sessionStorage.getItem('learnbot_welcomed')) return;

    const modalHtml = `
      <div class="modal fade" id="learnbotWelcomeModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-sm modal-dialog-centered">
          <div class="modal-content bg-dark text-light">
            <div class="modal-body">
              <h5>Hello — I'm <strong>LearnBot</strong> 👋</h5>
              <p class="small">Your AI study buddy that breaks complex course material into simple, easy-to-understand explanations.</p>
              <p class="small mb-1"><strong>Tip:</strong> Choose a model from the header and pick an explanation level using the gear icon.</p>
              <div class="d-flex justify-content-between mt-2">
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="welcomeSessionOnly">
                  <label class="form-check-label small" for="welcomeSessionOnly">Show once per tab</label>
                </div>
                <div>
                  <button class="btn btn-sm btn-outline-light" id="learnbotWelcomeClose">Got it</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('learnbotWelcomeModal');
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();

    const chk = document.getElementById('welcomeSessionOnly');
    if (chk) {
      chk.checked = (behavior === 'session');
      chk.addEventListener('change', (e) => {
        const val = e.target.checked ? 'session' : 'always';
        sessionStorage.setItem(this.WELCOME_BEHAVIOR_KEY, val);
        this.createMessageBubble(`Welcome modal behavior set to: ${val}`, 'bot');
      });
    }

    document.getElementById('learnbotWelcomeClose').addEventListener('click', () => bsModal.hide());

    modalEl.addEventListener('hidden.bs.modal', () => {
      const behaviorNow = sessionStorage.getItem(this.WELCOME_BEHAVIOR_KEY) || 'always';
      if (behaviorNow === 'session') sessionStorage.setItem('learnbot_welcomed', '1');
      modalEl.remove();
    });
  }

  toggleSidebar() {
    this.sidebar?.classList.toggle('show');
    this.sidebarOverlay?.classList.toggle('show');
  }

  closeSidebar() {
    this.sidebar?.classList.remove('show');
    this.sidebarOverlay?.classList.remove('show');
  }

  handleResize() {
    if (window.innerWidth >= 992) this.closeSidebar();
  }

  startNewChat() {
    // Add message count debug
    const messageCount = document.getElementById('chatMessages')?.children.length || 
                        document.getElementById('chat-container')?.children.length;
    console.log('Current message count:', messageCount);

    if (this.chatMessages) {
      this.chatMessages.innerHTML = `
        <div class="welcome-message">
          <h2 class="welcome-title">How can I help, uniqueGbengah?</h2>
        </div>
      `;
    }
    if (this.messageInput) {
      this.messageInput.value = '';
      this.messageInput.style.height = 'auto';
      const inputRow = this.messageInput.closest('.input-row');
      if (inputRow) inputRow.style.minHeight = '48px';
    }
    this.removeFile();
    sessionStorage.removeItem(this.CHAT_KEY);
    this.renderSidebarHistory();
    this.handleInputChange();
  }

  selectChat(chatItem) {
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => item.classList.remove('active'));
    chatItem.classList.add('active');
    if (window.innerWidth < 992) this.closeSidebar();
  }

  handleInputChange() {
    const hasText = this.messageInput?.value.trim().length > 0;
    const hasFile = this.selectedFile !== null;
    if (this.sendBtn) this.sendBtn.disabled = (!hasText && !hasFile) || this.isProcessing;
  }

  useDirectUploadSimplify() {
    const el = document.getElementById('directUploadToggle');
    if (!el) return false;
    return el.checked;
  }

  async handleFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    console.debug('[LearnBotUI] handleFileSelect', file.name, file.type);
    if (this.isProcessing) {
        this.createMessageBubble('Please wait until the current process is finished.', 'bot');
        return;
    }

    // File validation
    const allowedMIMEs = new Set([
        'application/pdf','image/jpeg','image/jpg','image/png','text/plain'
    ]);
    const allowedExts = new Set(['pdf','png','jpg','jpeg','txt','docx']);
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    if (!allowedMIMEs.has(file.type) && !allowedExts.has(ext)) {
        this.createMessageBubble('Please select a PDF, image (JPG/PNG), text, or Word file.', 'bot');
        return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        this.createMessageBubble('File size must be less than 10MB.', 'bot');
        return;
    }

    this.selectedFile = file;
    this.showFilePreview(file);
    this.handleInputChange();

    // Upload logic
    this.isProcessing = true;
    this.showSpinner();
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('provider', this.selectedProvider);
        formData.append('level', this.currentExplanationLevel);
        
        const endpoint = this.useDirectUploadSimplify() 
            ? `${API_BASE}/upload-and-simplify` 
            : `${API_BASE}/upload`;
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        // REPLACE EVERYTHING BELOW THIS LINE until the catch block
        if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            const errMsg = (errorBody && errorBody.error) ? errorBody.error : `${endpoint} returned ${response.status}`;
            throw new Error(errMsg);
        }

        const data = await response.json().catch(() => null);
        console.debug('[LearnBotUI] upload response (raw):', data, 'endpoint:', endpoint);

        const extracted = (data && (data.extracted_text || data.text)) || null;

        if (!extracted) {
            console.warn('[LearnBotUI] No extracted_text found in upload response. Full response:', data);
            try {
                this.createMessageBubble('⚠️ Debug upload response (no extracted_text):\n\n' + JSON.stringify(data, null, 2), 'bot');
            } catch (ex) {
                console.error('[LearnBotUI] createMessageBubble failed while showing debug response', ex);
                const container = document.getElementById('chatMessages') || document.getElementById('chat-container') || document.body;
                const el = document.createElement('pre');
                el.textContent = JSON.stringify(data, null, 2);
                container.appendChild(el);
            }
        } else {
            console.info('[LearnBotUI] extracted_text length=', extracted.length);
            try {
                this.createMessageBubble(`Extracted text:\n\n${extracted}`, 'bot');
            } catch (ex) {
                console.error('[LearnBotUI] createMessageBubble threw while showing extracted text', ex);
                const container = document.getElementById('chatMessages') || document.getElementById('chat-container') || document.body;
                const el = document.createElement('div');
                el.className = 'message bot';
                const pre = document.createElement('pre');
                pre.style.whiteSpace = 'pre-wrap';
                pre.textContent = extracted;
                el.appendChild(pre);
                container.appendChild(el);
            }

            if (!this.useDirectUploadSimplify()) {
                try {
                    const simplifyResponse = await fetch(`${API_BASE}/simplify`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            text: extracted,
                            level: this.currentExplanationLevel,
                            provider: this.selectedProvider
                        })
                    });

                    console.debug('[LearnBotUI] simplify response status', simplifyResponse.status);

                    if (!simplifyResponse.ok) {
                        const err = await simplifyResponse.json().catch(()=>null);
                        const msg = (err && err.error) ? err.error : `Simplify returned ${simplifyResponse.status}`;
                        throw new Error(msg);
                    }

                    const simpJson = await simplifyResponse.json().catch(()=>null);
                    console.debug('[LearnBotUI] simplify body', simpJson);

                    if (simpJson && simpJson.simplified_text) {
                        this.createMessageBubble(simpJson.simplified_text, 'bot');
                    } else {
                        this.createMessageBubble('⚠️ Simplify returned no simplified_text. See console for body.', 'bot');
                        console.warn('[LearnBotUI] simplify returned no simplified_text', simpJson);
                    }
                } catch (err) {
                    console.error('[LearnBotUI] simplify step failed', err);
                    this.createMessageBubble(`Error during simplification step: ${err.message}`, 'bot');
                }
            }
        }
        // END OF REPLACEMENT

    } catch (err) {
        this.createMessageBubble(`Error processing file: ${err.message}`, 'bot');
    } finally {
        this.isProcessing = false;
        this.hideSpinner();
        this.removeFile();
    }
  }

  showFilePreview(file) {
    if (!this.filePreview) return;
    const fileName = this.filePreview.querySelector('.file-name');
    if (fileName) fileName.textContent = file.name;
    this.filePreview.style.display = 'block';
  }

  removeFile() {
    this.selectedFile = null;
    if (this.fileInput) this.fileInput.value = '';
    if (this.imageInput) this.imageInput.value = '';
    if (this.filePreview) this.filePreview.style.display = 'none';
    this.handleInputChange();
  }

  toggleUploadMenu() { this.uploadMenu?.classList.toggle('show'); this.hideExplanationMenu(); }
  hideUploadMenu() { this.uploadMenu?.classList.remove('show'); }
  toggleExplanationMenu() { this.explanationLevelMenu?.classList.toggle('show'); this.hideUploadMenu(); }
  hideExplanationMenu() { this.explanationLevelMenu?.classList.remove('show'); }

  selectExplanationLevel(level) {
    this.currentExplanationLevel = level;
    const options = document.querySelectorAll('.explanation-option');
    options.forEach(opt => { opt.classList.remove('active'); if (opt.dataset.value === level) opt.classList.add('active'); });
    this.hideExplanationMenu();
  }

  showSpinner() {
    if (this.sendBtn) {
      this.sendBtn.innerHTML = `<span class="spinner"></span>`;
      this.sendBtn.disabled = true;
    }
  }

  hideSpinner() {
    if (this.sendBtn) {
      this.sendBtn.innerHTML = `<i class="fas fa-paper-plane"></i>`;
      this.sendBtn.disabled = false;
    }
  }

  async sendMessage() {
    if (this.isProcessing) return;
    const messageText = this.messageInput?.value.trim() || '';
    const explanationLevel = this.currentExplanationLevel || (document.getElementById("level-select")?.value || "layman");
    console.debug('[LearnBotUI] sendMessage', { provider: this.selectedProvider, level: explanationLevel });
    if (!messageText && !this.selectedFile) return;
    if (!explanationLevel) {
      this.createMessageBubble('Please select an explanation level before sending your message.', 'bot');
      return;
    }
    if (messageText.length > 5000) {
      this.createMessageBubble('Error: Input is too long (max 5000 characters).', 'bot');
      return;
    }

    const provider = this.modelSelector?.value || sessionStorage.getItem('learnbot_provider') || this.selectedProvider || 'gemini';
    sessionStorage.setItem('learnbot_provider', provider);
    this.selectedProvider = provider;

    this.isProcessing = true;
    this.showSpinner();
    this.handleInputChange();

    const welcomeMessage = this.chatMessages?.querySelector('.welcome-message');
    if (welcomeMessage) this.chatMessages.innerHTML = '';

    if (messageText) {
      this.createMessageBubble(messageText, 'user');
      this.messageInput.value = '';
      this.messageInput.style.height = 'auto';
    }

    // Fix API endpoint construction
    const apiUrl = 'http://127.0.0.1:5000/simplify';  // Use direct URL instead of complex construction
    console.debug('[LearnBotUI] sending to:', apiUrl);

    // Add endpoint validation
    if (!apiUrl.endsWith('/simplify')) {
        console.error('[LearnBotUI] Fatal: apiUrl does not target /simplify', apiUrl);
        this.createMessageBubble('Internal error: incorrect API endpoint configured. See console.', 'bot');
        this.isProcessing = false;
        this.hideSpinner();
        return;
    }

    const payload = { text: messageText, level: explanationLevel, provider };
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({error: `Server returned ${response.status}`}));
        throw new Error(error.error || 'Unexpected response from server');
      }

      const data = await response.json();
      if (data?.simplified_text) {
        this.createMessageBubble(data.simplified_text, 'bot');
      } else {
        throw new Error('No simplified text returned');
      }
    } catch (err) {
      console.error('[LearnBotUI] sendMessage failed:', err);
      this.createMessageBubble(`Error: ${err.message}`, 'bot');
    } finally {
      this.isProcessing = false;
      this.hideSpinner();
      this.handleInputChange();
      this.renderSidebarHistory();
    }
  }

  createMessageBubble(text, sender = 'bot') {
    if (!this.chatMessages) {
        console.warn('[LearnBotUI] chatMessages container missing — creating fallback container at body end.');
        this.chatMessages = document.createElement('div');
        this.chatMessages.id = 'chatMessages';
        this.chatMessages.style.padding = '12px';
        this.chatMessages.style.maxHeight = '60vh';
        this.chatMessages.style.overflowY = 'auto';
        document.body.appendChild(this.chatMessages);
    }

    console.debug('[LearnBotUI] createMessageBubble called', { sender, len: (text || '').length });

    const bubble = document.createElement('div');
    bubble.className = `message ${sender}`;
    bubble.setAttribute('aria-live', 'polite');

    let contentHtml = '';
    if (sender === 'user' && this.selectedFile) {
        const icon = (this.selectedFile.type || '').includes('pdf') ? 'bi-file-earmark-pdf' : 'bi-image';
        contentHtml += `<div class="file-attachment mb-2"><i class="bi ${icon} me-2"></i><span>${this.escapeHtml(this.selectedFile.name)}</span></div>`;
    }

    const rawText = String(text || '');
    const isLikelyOCR = (rawText.match(/\n/g) || []).length >= 2 && rawText.length > 200;

    try {
        if (isLikelyOCR) {
            contentHtml += `
                <div class="message-content">
                    <div class="ocr-toolbar">
                        <button class="copy-ocr-btn" type="button" aria-label="Copy OCR text">Copy</button>
                        <span class="ocr-meta">OCR · ${Math.min(rawText.length, 9999)} chars</span>
                    </div>
                    <pre class="ocr-text" style="white-space:pre-wrap;margin:0;">${this.escapeHtml(rawText)}</pre>
                </div>
            `;
        } else if (typeof marked === 'function' && typeof DOMPurify === 'object') {
            contentHtml += `<div class="message-content">${DOMPurify.sanitize(marked.parse(rawText))}</div>`;
        } else {
            contentHtml += `<div class="message-content"><pre style="white-space:pre-wrap;margin:0;">${this.escapeHtml(rawText)}</pre></div>`;
        }
    } catch (err) {
        console.error('[LearnBotUI] Markdown/DOMPurify render failed, falling back to plain text', err);
        contentHtml += `<div class="message-content"><pre style="white-space:pre-wrap;margin:0;">${this.escapeHtml(rawText)}</pre></div>`;
    }

    bubble.innerHTML = `
        <div class="message-avatar"><i class="bi ${sender === 'user' ? 'bi-person' : 'bi-robot'}"></i></div>
        ${contentHtml}
    `;

    this.chatMessages.appendChild(bubble);
    this.scrollToBottom();

    try {
        if (!isLikelyOCR && typeof renderMathInElement === 'function') {
            const el = bubble.querySelector('.message-content');
            if (el) renderMathInElement(el);
        }
    } catch (err) {
        console.warn('[LearnBotUI] KaTeX render failed (non-blocking):', err);
    }

    if (isLikelyOCR) {
        try {
            const btn = bubble.querySelector('.copy-ocr-btn');
            const pre = bubble.querySelector('pre.ocr-text');
            if (btn && pre) {
                btn.addEventListener('click', async () => {
                    try {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            await navigator.clipboard.writeText(pre.textContent);
                        } else {
                            const ta = document.createElement('textarea');
                            ta.value = pre.textContent;
                            document.body.appendChild(ta);
                            ta.select();
                            document.execCommand('copy');
                            ta.remove();
                        }
                        const original = btn.textContent;
                        btn.textContent = 'Copied';
                        btn.classList.add('copied');
                        setTimeout(() => {
                            btn.textContent = original || 'Copy';
                            btn.classList.remove('copied');
                        }, 1500);
                    } catch (err) {
                        console.error('[LearnBotUI] copy failed', err);
                        btn.textContent = 'Copy failed';
                        setTimeout(() => btn.textContent = 'Copy', 1500);
                    }
                });
            }
        } catch (err) {
            console.warn('[LearnBotUI] failed to attach OCR copy handler', err);
        }
    }

    try {
        this.pushChatHistory({ role: sender, text: text, ts: Date.now() });
    } catch (err) {
        console.warn('[LearnBotUI] pushChatHistory failed', err);
    }
}

  pushChatHistory(entry) {
    try {
      const raw = sessionStorage.getItem(this.CHAT_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(entry);
      const trimmed = arr.slice(-this.MAX_HISTORY);
      sessionStorage.setItem(this.CHAT_KEY, JSON.stringify(trimmed));
      this.renderSidebarHistory();
    } catch (e) {
      console.warn('Failed to persist chat history', e);
    }
  }

  loadChatHistory() {
    try {
      const raw = sessionStorage.getItem(this.CHAT_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      this.chatMessages.innerHTML = '';
      arr.forEach(item => {
        this.createMessageBubble(item.text, item.role);
      });
      this.scrollToBottom();
      this.renderSidebarHistory();
    } catch (e) {
      console.warn('Failed to load chat history', e);
    }
  }

  renderSidebarHistory() {
    const historyContainer = document.querySelector('.chat-history');
    if (!historyContainer) return;

    historyContainer.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'chat-section-title';
    title.textContent = 'Recent';
    historyContainer.appendChild(title);

    const raw = sessionStorage.getItem(this.CHAT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const userEntries = arr.filter(e => e.role === 'user').slice(-20).reverse();

    if (userEntries.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'chat-item';
      empty.innerHTML = '<span>No recent queries</span>';
      historyContainer.appendChild(empty);
      return;
    }

    userEntries.forEach((entry, idx) => {
      const item = document.createElement('div');
      item.className = 'chat-item';
      item.dataset.full = entry.text;
      const span = document.createElement('span');
      span.innerHTML = this.escapeHtml(entry.text.length > 60 ? entry.text.slice(0, 60) + '…' : entry.text);
      item.appendChild(span);

      item.addEventListener('click', () => {
        if (this.messageInput) {
          this.messageInput.value = entry.text;
          this.handleInputChange();
          this.messageInput.focus();
        }
        if (window.innerWidth < 992) this.closeSidebar();
      });

      item.addEventListener('dblclick', async () => {
        if (this.messageInput) {
          this.messageInput.value = entry.text;
          this.handleInputChange();
          if (window.innerWidth < 992) this.closeSidebar();
          await this.sendMessage();
        }
      });

      historyContainer.appendChild(item);
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  scrollToBottom() {
    if (this.chatMessages) this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }
}

document.addEventListener('DOMContentLoaded', () => new LearnBotUI());