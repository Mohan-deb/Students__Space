
const params = new URLSearchParams(window.location.search);
const message = params.get("message");

if (message === "success") {
    alert("Account created successfully!");
} else if (message === "emailnotfound") {
    alert("Email Not Found")
} else if (message === "wrongpassword") {
    alert("Wrong Password")
}