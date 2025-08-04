class LearnBotUI {
  constructor() {
    this.initializeElements()
    this.bindEvents()
    this.setupTextareaAutoResize()
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

    // State
    this.selectedFile = null
    this.isProcessing = false
    this.currentExplanationLevel = "layman"
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
  }

  setupTextareaAutoResize() {
    if (!this.messageInput) return

    this.messageInput.addEventListener("input", () => {
      // Reset height to auto to get the correct scrollHeight
      this.messageInput.style.height = "auto"

      // Calculate new height based on content
      const newHeight = Math.min(this.messageInput.scrollHeight, 200)
      this.messageInput.style.height = newHeight + "px"

      // Update input row min-height to accommodate the textarea
      const inputRow = this.messageInput.closest(".input-row")
      if (inputRow) {
        const minHeight = Math.max(48, newHeight + 24) // 24px for padding
        inputRow.style.minHeight = minHeight + "px"
      }
    })

    // Handle paste events that might change height
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
    // Clear chat messages and show welcome
    if (this.chatMessages) {
      this.chatMessages.innerHTML = `
      <div class="welcome-message">
        <h2 class="welcome-title">How can I help, uniqueGbengah?</h2>
      </div>
    `
    }

    // Clear input
    if (this.messageInput) {
      this.messageInput.value = ""
      this.messageInput.style.height = "auto"

      // Reset input row height
      const inputRow = this.messageInput.closest(".input-row")
      if (inputRow) {
        inputRow.style.minHeight = "48px"
      }
    }

    // Remove file
    this.removeFile()

    // Update chat history
    const chatItems = document.querySelectorAll(".chat-item")
    chatItems.forEach((item) => item.classList.remove("active"))

    this.handleInputChange()
  }

  selectChat(chatItem) {
    const chatItems = document.querySelectorAll(".chat-item")
    chatItems.forEach((item) => item.classList.remove("active"))
    chatItem.classList.add("active")

    // Close sidebar on mobile after selection
    if (window.innerWidth < 992) {
      this.closeSidebar()
    }
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
      if (!this.sendBtn?.disabled) {
        this.sendMessage()
      }
    }
  }

  handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
    if (!allowedTypes.includes(file.type)) {
      alert("Please select a PDF or image file (JPG, PNG).")
      return
    }

    // Validate file size (10MB limit)
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
    if (fileName) {
      fileName.textContent = file.name
    }

    this.filePreview.style.display = "block"
  }

  removeFile() {
    this.selectedFile = null
    if (this.fileInput) {
      this.fileInput.value = ""
    }
    if (this.filePreview) {
      this.filePreview.style.display = "none"
    }
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

    // Update active state
    const options = document.querySelectorAll(".explanation-option")
    options.forEach((option) => {
      option.classList.remove("active")
      if (option.dataset.value === level) {
        option.classList.add("active")
      }
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

    // Hide welcome message and prepare chat area
    const welcomeMessage = this.chatMessages?.querySelector(".welcome-message")
    if (welcomeMessage) {
      this.chatMessages.innerHTML = ""
    }

    // Add user message
    this.addUserMessage(messageText, this.selectedFile)

    // Clear input
    if (this.messageInput) {
      this.messageInput.value = ""
      this.messageInput.style.height = "auto"

      // Reset input row height
      const inputRow = this.messageInput.closest(".input-row")
      if (inputRow) {
        inputRow.style.minHeight = "48px"
      }
    }
    this.removeFile()

    // Show typing indicator
    const typingId = this.addTypingIndicator()

    try {
      // Use dynamic API URL for deployment
      const apiUrl = window.API_BASE_URL || "http://127.0.0.1:5000/simplify"
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: messageText,
          level: explanationLevel
        })
      });

      let data = {}
      try {
        data = await response.json()
      } catch (jsonError) {
        this.addBotMessage("Received an invalid response from the server.")
        return
      }
      this.removeTypingIndicator(typingId);

      if (response.ok && data && typeof data.simplified_text === "string") {
        this.addBotMessage(data.simplified_text || "No response received.")
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