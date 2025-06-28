document.getElementById("chat-form").addEventListener("submit", function (e) {
  e.preventDefault();

  const input = document.getElementById("textInput").value.trim();
  const file = document.getElementById("fileInput").files[0];
  const level = document.getElementById("levelSelect").value;

  if (!input && !file) return;

  // Show user message
  addMessage(input || file.name, "user");

  // Fake loading / placeholder bot response
  setTimeout(() => {
    addMessage("Processing... (real response will come from backend)", "bot");
  }, 500);

  // TODO: Add fetch() call to backend
});

function addMessage(text, sender) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);
  msg.textContent = text;

  document.getElementById("chat-area").appendChild(msg);
  document.getElementById("chat-area").scrollTop = document.getElementById("chat-area").scrollHeight;
}