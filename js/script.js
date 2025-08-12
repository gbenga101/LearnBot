class LearnBotUI {
  constructor() {
    this.initializeElements()
    this.bindEvents()
    this.setupTextareaAutoResize()
    this.setupModelSelector()
    this.loadChatHistory() // restore previous messages (sessionStorage)

    // expose instance for external controls (Info button, console)
    window.learnbotUI = this

    // show welcome modal on load (force = false respects 'session' mode)
    this.showWelcomeModal(false)
  }

  initializeElements() {
    // Sidebar elements
    this.sidebar = document.getElementById("sidebar")
    this.sidebarOverlay = document.getElementById("sidebarOverlay")
    this.toggleSidebarBtn = document.getElementById("toggleSidebar")
    this.closeSidebarBtn = document.getElementById("closeSidebar")
    this.newChatBtn = document.getElementById("newChatBtn")

    // Chat elements
    this.chatMessages = document.getElementById("chatMessages")
    this.messageInput = document.getElementById("messageInput")
    this.sendBtn = document.getElementById("sendBtn")
    this.fileInput = document.getElementById("fileInput")
    this.imageInput = document.getElementById("imageInput")
    this.fileUploadBtn = document.getElementById("fileUploadBtn")
    this.uploadMenu = document.getElementById("uploadMenu")
    this.filePreview = document.getElementById("filePreview")
    this.explanationLevelBtn = document.getElementById("explanationLevelBtn")
    this.explanationLevelMenu = document.getElementById("explanationLevelMenu")
    this.modelSelector = document.getElementById("modelSelect") // header selector

    // State
    this.selectedFile = null
    this.isProcessing = false
    this.currentExplanationLevel = "layman"

    // persisted provider
    this.selectedProvider = sessionStorage.getItem("learnbot_provider") || "gemini"

    // keys
    this.CHAT_KEY = "learnbot_chat_history"
    this.WELCOME_BEHAVIOR_KEY = "learnbot_welcome_behavior"
    if (!sessionStorage.getItem(this.WELCOME_BEHAVIOR_KEY)) {
      sessionStorage.setItem(this.WELCOME_BEHAVIOR_KEY, 'always')
    }
  }

  bindEvents() {
    // Sidebar events
    this.toggleSidebarBtn?.addEventListener("click", () => this.toggleSidebar())
    this.closeSidebarBtn?.addEventListener("click", () => this.closeSidebar())
    this.sidebarOverlay?.addEventListener("click", () => this.closeSidebar())
    this.newChatBtn?.addEventListener("click", () => this.startNewChat())

    // Input events
    this.messageInput?.addEventListener("input", () => this.handleInputChange())
    this.messageInput?.addEventListener("keydown", (e) => this.handleKeyDown(e))
    this.sendBtn?.addEventListener("click", () => this.sendMessage())

    // Upload menu
    this.fileUploadBtn?.addEventListener("click", (e) => { e.stopPropagation(); this.toggleUploadMenu() })
    document.getElementById("uploadImage")?.addEventListener("click", () => { this.imageInput?.click(); this.hideUploadMenu() })
    document.getElementById("uploadFile")?.addEventListener("click", () => { this.fileInput?.click(); this.hideUploadMenu() })
    this.fileInput?.addEventListener("change", (e) => this.handleFileSelect(e))
    this.imageInput?.addEventListener("change", (e) => this.handleFileSelect(e))

    // Explanation level
    this.explanationLevelBtn?.addEventListener("click", (e) => { e.stopPropagation(); this.toggleExplanationMenu() })
    const explanationOptions = document.querySelectorAll(".explanation-option")
    explanationOptions.forEach((option) => option.addEventListener('click', () => this.selectExplanationLevel(option.dataset.value)))

    // Close menus when clicking outside
    document.addEventListener('click', () => { this.hideUploadMenu(); this.hideExplanationMenu() })

    // File preview remove
    this.filePreview?.querySelector('.remove-file')?.addEventListener('click', () => this.removeFile())

    // Window resize
    window.addEventListener('resize', () => this.handleResize())

    // Model selector
    if (this.modelSelector) {
      this.modelSelector.value = sessionStorage.getItem('learnbot_provider') || this.selectedProvider
      this.modelSelector.addEventListener('change', (e) => this.setProvider(e.target.value))
    }

    // Info button
    document.getElementById('infoBtn')?.addEventListener('click', () => {
      sessionStorage.removeItem('learnbot_welcomed')
      this.showWelcomeModal(true)
    })

    // Dev toggle: Shift+W
    document.addEventListener('keydown', (e) => {
      if (e.shiftKey && e.key.toLowerCase() === 'w') {
        const current = sessionStorage.getItem(this.WELCOME_BEHAVIOR_KEY) || 'always'
        const next = current === 'always' ? 'session' : 'always'
        sessionStorage.setItem(this.WELCOME_BEHAVIOR_KEY, next)
        this.addBotMessage(`Welcome modal behavior set to: ${next} (dev toggle)`)
      }
    })
  }

  setupTextareaAutoResize() {
    if (!this.messageInput) return
    this.messageInput.addEventListener('input', () => {
      this.messageInput.style.height = 'auto'
      const newHeight = Math.min(this.messageInput.scrollHeight, 200)
      this.messageInput.style.height = newHeight + 'px'
      const inputRow = this.messageInput.closest('.input-row')
      if (inputRow) inputRow.style.minHeight = Math.max(48, newHeight + 24) + 'px'
    })
  }

  setupModelSelector() {
    if (this.modelSelector) {
      this.modelSelector.value = sessionStorage.getItem('learnbot_provider') || this.selectedProvider
    }
  }

  setProvider(provider) {
    this.selectedProvider = provider
    sessionStorage.setItem('learnbot_provider', provider)
    this.addBotMessage(`Switched to ${provider === 't5' ? 'Local T5' : 'LearnBot (Gemini)'} — provider saved for this session.`)
  }

  showWelcomeModal(force = false) {
    const behavior = sessionStorage.getItem(this.WELCOME_BEHAVIOR_KEY) || 'always'
    if (!force && behavior === 'session' && sessionStorage.getItem('learnbot_welcomed')) return

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
    `

    document.body.insertAdjacentHTML('beforeend', modalHtml)
    const modalEl = document.getElementById('learnbotWelcomeModal')
    const bsModal = new bootstrap.Modal(modalEl)
    bsModal.show()

    const chk = document.getElementById('welcomeSessionOnly')
    if (chk) {
      chk.checked = (behavior === 'session')
      chk.addEventListener('change', (e) => {
        const val = e.target.checked ? 'session' : 'always'
        sessionStorage.setItem(this.WELCOME_BEHAVIOR_KEY, val)
        this.addBotMessage(`Welcome modal behavior set to: ${val}`)
      })
    }

    document.getElementById('learnbotWelcomeClose').addEventListener('click', () => bsModal.hide())

    modalEl.addEventListener('hidden.bs.modal', () => {
      const behaviorNow = sessionStorage.getItem(this.WELCOME_BEHAVIOR_KEY) || 'always'
      if (behaviorNow === 'session') sessionStorage.setItem('learnbot_welcomed', '1')
      modalEl.remove()
    })
  }

  toggleSidebar() {
    this.sidebar?.classList.toggle('show')
    this.sidebarOverlay?.classList.toggle('show')
  }

  closeSidebar() {
    this.sidebar?.classList.remove('show')
    this.sidebarOverlay?.classList.remove('show')
  }

  handleResize() {
    if (window.innerWidth >= 992) this.closeSidebar()
  }

  startNewChat() {
    if (this.chatMessages) {
      this.chatMessages.innerHTML = `
        <div class="welcome-message">
          <h2 class="welcome-title">How can I help, uniqueGbengah?</h2>
        </div>
      `
    }
    if (this.messageInput) {
      this.messageInput.value = ''
      this.messageInput.style.height = 'auto'
      const inputRow = this.messageInput.closest('.input-row')
      if (inputRow) inputRow.style.minHeight = '48px'
    }
    this.removeFile()

    // clear history storage
    sessionStorage.removeItem(this.CHAT_KEY)
    // refresh sidebar
    this.renderSidebarHistory()
    this.handleInputChange()
  }

  selectChat(chatItem) {
    // keep existing behaviour: mark active
    const chatItems = document.querySelectorAll('.chat-item')
    chatItems.forEach(item => item.classList.remove('active'))
    chatItem.classList.add('active')
    if (window.innerWidth < 992) this.closeSidebar()
  }

  handleInputChange() {
    const hasText = this.messageInput?.value.trim().length > 0
    const hasFile = this.selectedFile !== null
    if (this.sendBtn) this.sendBtn.disabled = (!hasText && !hasFile) || this.isProcessing
  }

  handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!this.sendBtn?.disabled) this.sendMessage()
    }
  }

  handleFileSelect(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const allowedTypes = ['application/pdf','image/jpeg','image/jpg','image/png']
    if (!allowedTypes.includes(file.type)) { alert('Please select a PDF or image file (JPG, PNG).'); return }
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) { alert('File size must be less than 10MB.'); return }
    this.selectedFile = file
    this.showFilePreview(file)
    this.handleInputChange()
  }

  showFilePreview(file) {
    if (!this.filePreview) return
    const fileName = this.filePreview.querySelector('.file-name')
    if (fileName) fileName.textContent = file.name
    this.filePreview.style.display = 'block'
  }

  removeFile() {
    this.selectedFile = null
    if (this.fileInput) this.fileInput.value = ''
    if (this.filePreview) this.filePreview.style.display = 'none'
    this.handleInputChange()
  }

  toggleUploadMenu() { this.uploadMenu?.classList.toggle('show'); this.hideExplanationMenu() }
  hideUploadMenu() { this.uploadMenu?.classList.remove('show') }
  toggleExplanationMenu() { this.explanationLevelMenu?.classList.toggle('show'); this.hideUploadMenu() }
  hideExplanationMenu() { this.explanationLevelMenu?.classList.remove('show') }

  selectExplanationLevel(level) {
    this.currentExplanationLevel = level
    const options = document.querySelectorAll('.explanation-option')
    options.forEach(opt => { opt.classList.remove('active'); if (opt.dataset.value === level) opt.classList.add('active') })
    this.hideExplanationMenu()
  }

  // ---------------- main send logic (reads provider fresh each time) ----------------
  async sendMessage() {
    if (this.isProcessing) return

    const messageText = this.messageInput?.value.trim() || ''
    const explanationLevel = this.currentExplanationLevel
    if (!messageText && !this.selectedFile) return
    if (!explanationLevel) { this.addBotMessage('Please select an explanation level before sending your message.'); return }

    // fresh-read provider from selector/sessionStorage
    const provider = (this.modelSelector && this.modelSelector.value) || sessionStorage.getItem('learnbot_provider') || this.selectedProvider || 'gemini'
    // persist selection
    sessionStorage.setItem('learnbot_provider', provider)
    this.selectedProvider = provider

    this.isProcessing = true
    this.sendBtn && (this.sendBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...')
    this.handleInputChange()

    // hide welcome
    const welcomeMessage = this.chatMessages?.querySelector('.welcome-message')
    if (welcomeMessage) this.chatMessages.innerHTML = ''

    // add user message to UI and history
    this.addUserMessage(messageText, this.selectedFile)

    // clear input and file
    if (this.messageInput) { this.messageInput.value = ''; this.messageInput.style.height = 'auto' }
    this.removeFile()

    // typing indicator
    const typingId = this.addTypingIndicator()

    // build payload
    const apiUrl = window.API_BASE_URL || 'http://127.0.0.1:5000/simplify'
    const payload = { text: messageText, level: explanationLevel, provider }
    console.log('Sending to API:', apiUrl, payload)

    try {
      const response = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      try {
        const data = await response.json()
        this.removeTypingIndicator(typingId)
        if (response.ok && data && typeof data.simplified_text === 'string') {
          this.addBotMessage(data.simplified_text)
        } else if (data && data.error) {
          this.addBotMessage(data.error)
        } else {
          // fallback display raw body if present
          this.addBotMessage('Oops — unexpected response from server.')
        }
      } catch (errJson) {
        this.removeTypingIndicator(typingId)
        this.addBotMessage('Received an invalid response from the server.')
      }
    } catch (err) {
      console.error('Error sending message:', err)
      this.removeTypingIndicator(typingId)
      this.addBotMessage('Sorry, I encountered an error. Please try again.')
    } finally {
      this.isProcessing = false
      this.sendBtn && (this.sendBtn.innerHTML = 'Send')
      this.handleInputChange()
      // update sidebar history after operation
      this.renderSidebarHistory()
    }
  }

  addUserMessage(text, file) {
    if (!this.chatMessages) return
    const messageDiv = document.createElement('div')
    messageDiv.className = 'message user'
    let content = ''
    if (file) {
      const fileIcon = file.type && file.type.includes('pdf') ? 'bi-file-earmark-pdf' : 'bi-image'
      content += `<div class="file-attachment mb-2"><i class="bi ${fileIcon} me-2"></i><span>${this.escapeHtml(file.name)}</span></div>`
    }
    if (text) content += `<div>${this.escapeHtml(text)}</div>`

    messageDiv.innerHTML = `
      <div class="message-content">${content}</div>
      <div class="message-avatar"><i class="bi bi-person"></i></div>
    `
    this.chatMessages.appendChild(messageDiv)
    this.scrollToBottom()

    // save to history
    this.pushChatHistory({ role: 'user', text: text, ts: Date.now() })
  }

  addBotMessage(text) {
    if (!this.chatMessages) return
    const messageDiv = document.createElement('div')
    messageDiv.className = 'message bot'
    messageDiv.innerHTML = `
      <div class="message-avatar"><i class="bi bi-robot"></i></div>
      <div class="message-content">${this.escapeHtml(text)}</div>
    `
    this.chatMessages.appendChild(messageDiv)
    this.scrollToBottom()

    // save to history
    this.pushChatHistory({ role: 'bot', text: text, ts: Date.now() })
  }

  addTypingIndicator() {
    if (!this.chatMessages) return null
    const typingId = 'typing-' + Date.now()
    const typingDiv = document.createElement('div')
    typingDiv.className = 'message bot'
    typingDiv.id = typingId
    typingDiv.innerHTML = `
      <div class="message-avatar"><i class="bi bi-robot"></i></div>
      <div class="message-content"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div>
    `
    this.chatMessages.appendChild(typingDiv)
    this.scrollToBottom()
    return typingId
  }

  removeTypingIndicator(typingId) {
    if (!typingId) return
    const el = document.getElementById(typingId)
    if (el) el.remove()
  }

  // ---------------- history helpers ----------------
  pushChatHistory(entry) {
    try {
      const raw = sessionStorage.getItem(this.CHAT_KEY)
      const arr = raw ? JSON.parse(raw) : []
      arr.push(entry)
      // keep last 40 messages
      const trimmed = arr.slice(-40)
      sessionStorage.setItem(this.CHAT_KEY, JSON.stringify(trimmed))
      // update sidebar immediately
      this.renderSidebarHistory()
    } catch (e) {
      console.warn('Failed to persist chat history', e)
    }
  }

  loadChatHistory() {
    try {
      const raw = sessionStorage.getItem(this.CHAT_KEY)
      if (!raw) return
      const arr = JSON.parse(raw)
      // render chat area without re-persisting
      this.chatMessages.innerHTML = ''
      arr.forEach(item => {
        const div = document.createElement('div')
        div.className = `message ${item.role === 'user' ? 'user' : 'bot'}`
        if (item.role === 'user') {
          div.innerHTML = `<div class="message-content">${this.escapeHtml(item.text)}</div><div class="message-avatar"><i class="bi bi-person"></i></div>`
        } else {
          div.innerHTML = `<div class="message-avatar"><i class="bi bi-robot"></i></div><div class="message-content">${this.escapeHtml(item.text)}</div>`
        }
        this.chatMessages.appendChild(div)
      })
      this.scrollToBottom()
      // render sidebar entries
      this.renderSidebarHistory()
    } catch (e) {
      console.warn('Failed to load chat history', e)
    }
  }

  renderSidebarHistory() {
    const historyContainer = document.querySelector('.chat-history')
    if (!historyContainer) return

    // clear and build header
    historyContainer.innerHTML = ''
    const title = document.createElement('div')
    title.className = 'chat-section-title'
    title.textContent = 'Recent'
    historyContainer.appendChild(title)

    const raw = sessionStorage.getItem(this.CHAT_KEY)
    const arr = raw ? JSON.parse(raw) : []
    const userEntries = arr.filter(e => e.role === 'user').slice(-20).reverse()

    if (userEntries.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'chat-item'
      empty.innerHTML = '<span>No recent queries</span>'
      historyContainer.appendChild(empty)
      return
    }

    userEntries.forEach((entry, idx) => {
      const item = document.createElement('div')
      item.className = 'chat-item'
      item.dataset.full = entry.text
      const span = document.createElement('span')
      span.innerHTML = this.escapeHtml(entry.text.length > 60 ? entry.text.slice(0,60) + '…' : entry.text)
      item.appendChild(span)

      // single click: populate input
      item.addEventListener('click', () => {
        if (this.messageInput) {
          this.messageInput.value = entry.text
          this.handleInputChange()
          this.messageInput.focus()
        }
      })

      // double click: populate and send immediately
      item.addEventListener('dblclick', async () => {
        if (this.messageInput) {
          this.messageInput.value = entry.text
          this.handleInputChange()
          await this.sendMessage()
        }
      })

      historyContainer.appendChild(item)
    })
  }

  // ---------------- end history helpers ----------------

  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (err) => reject(err)
    })
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  scrollToBottom() {
    if (this.chatMessages) this.chatMessages.scrollTop = this.chatMessages.scrollHeight
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => new LearnBotUI())