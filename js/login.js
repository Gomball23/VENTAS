import { supabase } from "./supabase.js";

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const errorMessage = document.getElementById("errorMessage");

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    errorMessage.textContent = "";

    loginButton.disabled = true;
    loginButton.textContent = "INGRESANDO...";

    try {

        const { data, error } =
            await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

        if (error) {
            throw error;
        }

        console.log("Administrador autenticado:", data.user);

        window.location.href = "dashboard.html";

    } catch (error) {

        console.error(error);

        errorMessage.textContent =
            "Correo o contraseña incorrectos.";

        loginButton.disabled = false;
        loginButton.textContent = "INICIAR SESIÓN";
    }

});