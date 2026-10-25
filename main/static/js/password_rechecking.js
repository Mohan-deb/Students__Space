const signupForm = document.getElementById("signupform");

if (signupForm) {
    signupForm.addEventListener("submit", function (event) {
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirm_password").value;

        if (password !== confirmPassword) {
            event.preventDefault();
            alert("Re-Enter Password do not match!");
        }
    });
}