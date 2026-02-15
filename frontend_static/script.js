const form = document.getElementById("loginForm");
const messageDiv = document.getElementById("message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch("http://localhost:5000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      messageDiv.style.color = "green";
      messageDiv.textContent = `Login successful! Welcome ${data.accountType}`;
    } else {
      messageDiv.style.color = "red";
      messageDiv.textContent = data.error;
    }
  } catch (err) {
    messageDiv.style.color = "red";
    messageDiv.textContent = "Server not reachable";
  }
});
