class LearnBotUI {
  constructor() {
    this.initializeElements()
    this.bindEvents()
    this.setupTextareaAutoResize()
    this.setupModelSelector()
    this.showWelcomeModal()
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
    this.modelSelector = document.getElementById("modelSelect") // it's a <select>

    // State
    this.selectedFile = null
    this.isProcessing = false
    this.currentExplanationLevel = "layman"

    // provider persisted in sessionStorage per your request
    this.selectedProvider = sessionStorage.getItem("learnbot_provider") || "gemini"
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

    // Upload menu events
    this.fileUploadBtn?.addEventListener("click", (e) => {
      e.stopPropagation()
      this.toggleUploadMenu()
    })

    document.getElementById("uploadImage")?.addEventListener("click", () => {
      this.imageInput?.click()
      this.hideUploadMenu()
    })

    document.getElementById("uploadFile")?.addEventListener("click", () => {
      this.fileInput?.click()
      this.hideUploadMenu()
    })

    this.fileInput?.addEventListener("change", (e) => this.handleFileSelect(e))
    this.imageInput?.addEventListener("change", (e) => this.handleFileSelect(e))

    // Explanation level events
    this.explanationLevelBtn?.addEventListener("click", (e) => {
      e.stopPropagation()
      this.toggleExplanationMenu()
    })

    const explanationOptions = document.querySelectorAll(".explanation-option")
    explanationOptions.forEach((option) => {
      option.addEventListener("click", () => {
        this.selectExplanationLevel(option.dataset.value)
      })
    })

    // Close menus when clicking outside
    document.addEventListener("click", () => {
      this.hideUploadMenu()
      this.hideExplanationMenu()
    })

    // File preview events
    const removeFileBtn = this.filePreview?.querySelector(".remove-file")
    removeFileBtn?.addEventListener("click", () => this.removeFile())

    // Chat history events
    const chatItems = document.querySelectorAll(".chat-item")
    chatItems.forEach((item) => {
      item.addEventListener("click", () => this.selectChat(item))
    })

    // Window resize event
    window.addEventListener("resize", () => this.handleResize())

    // Model selector change (sessionStorage)
    if (this.modelSelector) {
      // set select initial value from sessionStorage
      this.modelSelector.value = sessionStorage.getItem("learnbot_provider") || this.selectedProvider
      this.modelSelector.addEventListener("change", (e) => {
        const val = e.target.value
        this.setProvider(val)
      })
    }
  }

  setupTextareaAutoResize() {
    if (!this.messageInput) return

    this.messageInput.addEventListener("input", () => {
      this.messageInput.style.height = "auto"
      const newHeight = Math.min(this.messageInput.scrollHeight, 200)
      this.messageInput.style.height = newHeight + "px"

      const inputRow = this.messageInput.closest(".input-row")
      if (inputRow) {
        const minHeight = Math.max(48, newHeight + 24)
        inputRow.style.minHeight = minHeight + "px"
      }
    })

    this.messageInput.addEventListener("paste", () => {
      setTimeout(() => {
        this.messageInput.style.height = "auto"
        const newHeight = Math.min(this.messageInput.scrollHeight, 200)
        this.messageInput.style.height = newHeight + "px"

        const inputRow = this.messageInput.closest(".input-row")
        if (inputRow) {
          const minHeight = Math.max(48, newHeight + 24)
          inputRow.style.minHeight = minHeight + "px"
        }
      }, 0)
    })
  }

  // model provider helpers
  setProvider(provider) {
    this.selectedProvider = provider
    sessionStorage.setItem("learnbot_provider", provider)
    // small UX note
    this.addBotMessage(`Switched to ${provider === "t5" ? "Local T5" : "LearnBot (Gemini)"} — provider will persist this session.`)
  }

  showWelcomeModal() {
    if (sessionStorage.getItem("learnbot_welcomed")) return

    const modalHtml = `
      <div class="modal fade" id="learnbotWelcomeModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-sm modal-dialog-centered">
          <div class="modal-content bg-dark text-light">
            <div class="modal-body">
              <h5>Hello — I'm <strong>LearnBot</strong> 👋</h5>
              <p class="small">Your AI study buddy that breaks complex course material into simple, easy-to-understand explanations.</p>
              <p class="small mb-1"><strong>Tip:</strong> Choose a model from the header (LearnBot / Local T5) and pick an explanation level using the gear icon.</p>
              <div class="d-flex justify-content-end">
                <button class="btn btn-sm btn-outline-light" id="learnbotWelcomeClose">Got it</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
    document.body.insertAdjacentHTML("beforeend", modalHtml)
    const modalEl = document.getElementById("learnbotWelcomeModal")
    const bsModal = new bootstrap.Modal(modalEl)
    bsModal.show()

    document.getElementById("learnbotWelcomeClose").addEventListener("click", () => {
      bsModal.hide()
    })

    modalEl.addEventListener("hidden.bs.modal", () => {
      sessionStorage.setItem("learnbot_welcomed", "1")
      modalEl.remove()
    })
  }

  toggleSidebar() {
    this.sidebar?.classList.toggle("show")
    this.sidebarOverlay?.classList.toggle("show")
  }

  closeSidebar() {
    this.sidebar?.classList.remove("show")
    this.sidebarOverlay?.classList.remove("show")
  }

  handleResize() {
    if (window.innerWidth >= 992) {
      this.closeSidebar()
    }
  }

  startNewChat() {
    if (this.chatMessages) {
      this.chatMessages.innerHTML = `
      <div class="welcome-message">
        <h2 class="welcome-title">How can I be of help to you Today?</h2>
      </div>
    `
    }
    if (this.messageInput) {
      this.messageInput.value = ""
      this.messageInput.style.height = "auto"
      const inputRow = this.messageInput.closest(".input-row")
      if (inputRow) inputRow.style.minHeight = "48px"
    }
    this.removeFile()
    const chatItems = document.querySelectorAll(".chat-item")
    chatItems.forEach((item) => item.classList.remove("active"))
    this.handleInputChange()
  }

  selectChat(chatItem) {
    const chatItems = document.querySelectorAll(".chat-item")
    chatItems.forEach((item) => item.classList.remove("active"))
    chatItem.classList.add("active")
    if (window.innerWidth < 992) this.closeSidebar()
  }

  handleInputChange() {
    const hasText = this.messageInput?.value.trim().length > 0
    const hasFile = this.selectedFile !== null
    if (this.sendBtn) {
      this.sendBtn.disabled = (!hasText && !hasFile) || this.isProcessing
    }
  }

  handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!this.sendBtn?.disabled) this.sendMessage()
    }
  }

  handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      alert("Please select a PDF or image file (JPG, PNG).")
      return
    }
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      alert("File size must be less than 10MB.")
      return
    }
    this.selectedFile = file
    this.showFilePreview(file)
    this.handleInputChange()
  }

  showFilePreview(file) {
    if (!this.filePreview) return
    const fileName = this.filePreview.querySelector(".file-name")
    if (fileName) fileName.textContent = file.name
    this.filePreview.style.display = "block"
  }

  removeFile() {
    this.selectedFile = null
    if (this.fileInput) this.fileInput.value = ""
    if (this.filePreview) this.filePreview.style.display = "none"
    this.handleInputChange()
  }

  toggleUploadMenu() {
    this.uploadMenu?.classList.toggle("show")
    this.hideExplanationMenu()
  }

  hideUploadMenu() {
    this.uploadMenu?.classList.remove("show")
  }

  toggleExplanationMenu() {
    this.explanationLevelMenu?.classList.toggle("show")
    this.hideUploadMenu()
  }

  hideExplanationMenu() {
    this.explanationLevelMenu?.classList.remove("show")
  }

  selectExplanationLevel(level) {
    this.currentExplanationLevel = level
    const options = document.querySelectorAll(".explanation-option")
    options.forEach((option) => {
      option.classList.remove("active")
      if (option.dataset.value === level) option.classList.add("active")
    })
    this.hideExplanationMenu()
  }

  async sendMessage() {
    if (this.isProcessing) return
    const messageText = this.messageInput?.value.trim()
    const explanationLevel = this.currentExplanationLevel
    if (!messageText && !this.selectedFile) return
    if (!explanationLevel) {
      this.addBotMessage("Please select an explanation level before sending your message.")
      return
    }

    this.isProcessing = true
    this.sendBtn && (this.sendBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...')
    this.handleInputChange()

    const welcomeMessage = this.chatMessages?.querySelector(".welcome-message")
    if (welcomeMessage) this.chatMessages.innerHTML = ""

    this.addUserMessage(messageText, this.selectedFile)
    if (this.messageInput) {
      this.messageInput.value = ""
      this.messageInput.style.height = "auto"
      const inputRow = this.messageInput.closest(".input-row")
      if (inputRow) inputRow.style.minHeight = "48px"
    }
    this.removeFile()

    const typingId = this.addTypingIndicator()

    try {
      const apiUrl = window.API_BASE_URL || "http://127.0.0.1:5000/simplify";
      const provider = sessionStorage.getItem("learnbot_provider") || this.selectedProvider || "gemini"

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: messageText,
          level: explanationLevel,
          provider: provider
        })
      });

      let data = {}
      try {
        data = await response.json()
      } catch (jsonError) {
        this.removeTypingIndicator(typingId)
        this.addBotMessage("Received an invalid response from the server.")
        return
      }
      this.removeTypingIndicator(typingId);

      if (response.ok && data && typeof data.simplified_text === "string") {
        this.addBotMessage(data.simplified_text || "No response received.")
      } else if (data && data.error) {
        this.addBotMessage(data.error)
      } else {
        this.addBotMessage("Oops! Something went wrong. Please try again.")
      }

    } catch (error) {
      console.error("Error sending message:", error)
      this.removeTypingIndicator(typingId)
      this.addBotMessage("Sorry, I encountered an error. Please try again.")
    } finally {
      this.isProcessing = false
      this.sendBtn && (this.sendBtn.innerHTML = 'Send')
      this.handleInputChange()
    }
  }

  addUserMessage(text, file) {
    if (!this.chatMessages) return

    const messageDiv = document.createElement("div")
    messageDiv.className = "message user"

    let content = ""
    if (file) {
      const fileIcon = file.type.includes("pdf") ? "bi-file-earmark-pdf" : "bi-image"
      content += `<div class="file-attachment mb-2">
                <i class="bi ${fileIcon} me-2"></i>
                <span>${file.name}</span>
            </div>`
    }
    if (text) {
      content += `<div>${this.escapeHtml(text)}</div>`
    }

    messageDiv.innerHTML = `
            <div class="message-content">
                ${content}
            </div>
            <div class="message-avatar">
                <i class="bi bi-person"></i>
            </div>
        `
    this.chatMessages.appendChild(messageDiv)
    this.scrollToBottom()
  }

  addBotMessage(text) {
    if (!this.chatMessages) return

    const messageDiv = document.createElement("div")
    messageDiv.className = "message bot"

    messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="bi bi-robot"></i>
            </div>
            <div class="message-content">
                ${this.escapeHtml(text)}
            </div>
        `
    this.chatMessages.appendChild(messageDiv)
    this.scrollToBottom()
  }

  addTypingIndicator() {
    if (!this.chatMessages) return null

    const typingId = "typing-" + Date.now()
    const typingDiv = document.createElement("div")
    typingDiv.className = "message bot"
    typingDiv.id = typingId

    typingDiv.innerHTML = `
            <div class="message-avatar">
                <i class="bi bi-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `

    this.chatMessages.appendChild(typingDiv)
    this.scrollToBottom()
    return typingId
  }

  removeTypingIndicator(typingId) {
    if (!typingId) return
    const typingElement = document.getElementById(typingId)
    if (typingElement) {
      typingElement.remove()
    }
  }

  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  scrollToBottom() {
    if (this.chatMessages) {
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new LearnBotUI()
})