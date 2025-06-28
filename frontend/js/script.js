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
    this.fileUploadBtn = document.getElementById("fileUploadBtn")
    this.filePreview = document.getElementById("filePreview")
    this.explanationLevel = document.getElementById("explanationLevel")

    // State
    this.selectedFile = null
    this.isProcessing = false
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
    this.fileUploadBtn?.addEventListener("click", () => this.fileInput?.click())
    this.fileInput?.addEventListener("change", (e) => this.handleFileSelect(e))

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
      this.messageInput.style.height = "auto"
      this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + "px"
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
    // Clear chat messages except welcome message
    const welcomeMessage = this.chatMessages?.querySelector(".welcome-message")
    if (this.chatMessages) {
      this.chatMessages.innerHTML = ""
      if (welcomeMessage) {
        this.chatMessages.appendChild(welcomeMessage.cloneNode(true))
      }
    }

    // Clear input
    if (this.messageInput) {
      this.messageInput.value = ""
      this.messageInput.style.height = "auto"
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

  async sendMessage() {
    if (this.isProcessing) return

    const messageText = this.messageInput?.value.trim()
    const explanationLevel = this.explanationLevel?.value

    if (!messageText && !this.selectedFile) return

    this.isProcessing = true
    this.handleInputChange()

    // Hide welcome message
    const welcomeMessage = this.chatMessages?.querySelector(".welcome-message")
    if (welcomeMessage) {
      welcomeMessage.style.display = "none"
    }

    // Add user message
    this.addUserMessage(messageText, this.selectedFile)

    // Clear input
    if (this.messageInput) {
      this.messageInput.value = ""
      this.messageInput.style.height = "auto"
    }
    this.removeFile()

    // Show typing indicator
    const typingId = this.addTypingIndicator()

    try {
      // Simulate API call
      await this.simulateAPICall(messageText, this.selectedFile, explanationLevel)

      // Remove typing indicator
      this.removeTypingIndicator(typingId)

      // Add bot response
      this.addBotMessage(this.generateResponse(messageText, explanationLevel))
    } catch (error) {
      console.error("Error sending message:", error)
      this.removeTypingIndicator(typingId)
      this.addBotMessage("Sorry, I encountered an error. Please try again.")
    } finally {
      this.isProcessing = false
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

  async simulateAPICall(message, file, explanationLevel) {
    // Simulate network delay
    const delay = Math.random() * 2000 + 1000 // 1-3 seconds
    await new Promise((resolve) => setTimeout(resolve, delay))

    // Here you would make the actual API call to your Flask backend
    // const response = await fetch('/api/chat', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //         message: message,
    //         file: file ? await this.fileToBase64(file) : null,
    //         explanation_level: explanationLevel
    //     })
    // });
    // return await response.json();
  }

  generateResponse(message, explanationLevel) {
    const responses = {
      layman: [
        "I'll explain this in simple, everyday terms that anyone can understand.",
        "Let me break this down using common examples and plain language.",
        "Here's the concept explained in straightforward terms without technical jargon.",
      ],
      child: [
        "Let me explain this like you're 12 years old, using fun examples!",
        "Imagine this concept like a simple story that's easy to follow.",
        "I'll use simple words and fun comparisons to help you understand.",
      ],
    }

    const levelResponses = responses[explanationLevel] || responses.layman
    const randomResponse = levelResponses[Math.floor(Math.random() * levelResponses.length)]

    return `${randomResponse}\n\nBased on your question about "${message}", here's my explanation...\n\n[This is a placeholder response. In a real implementation, this would be generated by your AI backend based on the user's input and selected explanation level.]`
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
