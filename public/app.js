const chat = document.getElementById("chat");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");

function add(role, text) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function send() {
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  add("user", text);

  const loader = document.createElement("div");
  loader.className = "system";
  loader.textContent = "Thinking…";
  chat.appendChild(loader);
  chat.scrollTop = chat.scrollHeight;

  try {
    const res = await fetch("/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });

    loader.remove();

    if (!res.ok) {
      add("assistant", `❌ Server error (${res.status})`);
      return;
    }

    const data = await res.json();
    add("assistant", data.reply || "No reply received");

  } catch (err) {
    loader.remove();
    add("assistant", "❌ Network error — check console");
    console.error(err);
  }
}

sendBtn.onclick = send;
input.onkeydown = e => e.key === "Enter" && send();
