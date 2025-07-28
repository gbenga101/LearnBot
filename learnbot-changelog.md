# LearnBot Project Changelog

## [Current Version] - UI & UX Improvements

### Issues Reported:
- Desktop interface layout not displaying properly; parts are hidden or missing.
- Dropdown for explanation level ("Layman's Terms" / "12-Year-Old Level") should be an icon toggle on mobile only.
- No chat history saving required yet; instead, show course suggestions as buttons for quick student questions.

### Solutions & Updates:

#### 1. Desktop Layout Fix:
- Suspected CSS media queries or layout structure issue.
- Recommendation: Use Bootstrap grid system (`container-fluid`, `row`, `col-lg-*`) to structure sidebar and main content.
- Ensure sidebar visible and main content sized correctly on desktop (min-width: 992px).
- Sidebar should be fixed or relative, not hidden by transform or z-index on desktop.
- Awaiting further code review from user for exact fix.

#### 2. Dropdown Toggle Icon on Mobile:

- **HTML Structure Update:**

  ```html
  <div id="explanationWrapper" class="position-relative">
    <button id="explanationToggle" class="btn btn-sm d-lg-none" aria-label="Choose explanation level">
      <i class="bi bi-sliders"></i>
    </button>

    <select id="explanationLevel" class="form-select d-none d-lg-block">
      <option value="layman">Layman's Terms</option>
      <option value="child">12-Year-Old</option>
    </select>
  </div>
  ```

- **CSS:**

  ```css
  #explanationWrapper select {
    position: absolute;
    top: 40px;
    right: 0;
    z-index: 999;
    width: 200px;
  }

  @media (min-width: 992px) {
    #explanationWrapper select {
      position: static;
      width: auto;
      z-index: auto;
    }
  }
  ```

- **JavaScript (add in `bindEvents` or equivalent):**

  ```js
  const explanationToggle = document.getElementById("explanationToggle")
  const explanationSelect = document.getElementById("explanationLevel")

  if (explanationToggle && explanationSelect) {
    explanationToggle.addEventListener("click", () => {
      explanationSelect.classList.toggle("d-none")
    })
  }
  ```

- Outcome: On mobile, the explanation level dropdown is hidden behind an icon and toggles on click. On desktop, dropdown always visible.

#### 3. Suggested Courses Instead of Chat History:

- **Static suggestion buttons in chat area:**

  ```html
  <div class="suggested-courses mb-3">
    <h6>Try asking about:</h6>
    <div class="d-flex flex-wrap gap-2">
      <button class="btn btn-outline-primary btn-sm">Computer Science</button>
      <button class="btn btn-outline-primary btn-sm">Economics</button>
      <button class="btn btn-outline-primary btn-sm">Physics</button>
      <button class="btn btn-outline-primary btn-sm">Mathematics</button>
    </div>
  </div>
  ```

- **Optional JavaScript to send question on click:**

  ```js
  document.querySelectorAll(".suggested-courses button").forEach(btn => {
    btn.addEventListener("click", () => {
      if (this.messageInput) {
        this.messageInput.value = btn.textContent
        this.handleInputChange()
        this.sendMessage()
      }
    })
  })
  ```

- Place this inside the chat messages container near the welcome message.

---

### Notes:
- No chat history is saved at this stage; suggested courses serve as clickable prompts.
- Await user confirmation or further code to debug desktop layout issue.
- Always follow mobile-first responsive design principles.
- Always ensure that UI/UX documentation, code comments, and user-facing instructions are updated to reflect the latest changes with each release.

---

### Reminder for all future steps:

> **DO NOT hallucinate any part. If unsure about anything, ASK before proceeding.**

---

*End of Update*