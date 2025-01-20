<script lang="ts">
  import { auth } from "$lib/firebaseConfig";
  import {
    createUserWithEmailAndPassword,
    updateProfile,
    sendEmailVerification,
  } from "firebase/auth";
  import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

  import { goto } from "$app/navigation";

  let name = "";
  let email = "";
  let password = "";
  let repeatPassword = "";
  let errorMessage = "";
  let isSubmitting = false;
  let toastMessage = "";
  let showToast = false;

  // send the user info to the database after getting the user id from firebase
  async function saveUserToDatabase(
    user_id: string,
    email: string,
    name?: string
  ) {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SERVER_BASE_URL}/api/user`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id, email, name }),
        }
      );

      if (!response.ok) {
        console.error("Failed to save user:", await response.text());
      }
    } catch (error) {
      console.error("Error saving user to database:", error);
    }
  }

  // sing in with email and password
  async function handleSignUp() {
    if (!email || !password || !repeatPassword || !name) {
      errorMessage = "Please fill in all fields.";
      return;
    }

    if (password !== repeatPassword) {
      errorMessage = "Passwords do not match.";
      return;
    }

    if (password.length < 6) {
      errorMessage = "Password must be at least 6 characters long.";
      return;
    }

    try {
      isSubmitting = true;
      const userData = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      // get the user ifd from firebase
      const user = userData.user;

      //add the users name from the form to firebase
      await updateProfile(user, { displayName: name });

      await saveUserToDatabase(
        user.uid,
        user.email ?? "withoutemail@anything.com",
        name
      );

      await sendEmailVerification(user);

      toastMessage = "Verification email sent. Please check your inbox.";
      showToast = true;
      setTimeout(() => (showToast = false), 3000);

      goto("/login");
    } catch (error: unknown) {
      errorMessage = error instanceof Error ? error.message : "Sign-up failed.";
      console.error(error);
    } finally {
      isSubmitting = false;
    }
  }

  //sign up with google
  async function handleGoogleSignUp() {
    try {
      isSubmitting = true;
      const result = await FirebaseAuthentication.signInWithGoogle();
      const userData = result.user;
      const user = userData;

      if (user) {
        await saveUserToDatabase(
          user.uid,
          user.email ?? "withoutemail@anything.com",
          user.displayName ?? "Your Name"
        );

        toastMessage = "Google sign-up successful!";
        showToast = true;

        setTimeout(() => (showToast = false), 3000);

        goto("/login");
      }
    } catch (error: unknown) {
      errorMessage =
        error instanceof Error ? error.message : "Google sign-in failed.";
      console.error(error);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="signup-container">
  {#if showToast}
    <div class="toast">{toastMessage}</div>
  {/if}

  <div class="card">
    <h1>Create an Account</h1>

    <form on:submit|preventDefault={handleSignUp}>
      <div class="form-group">
        <label for="name">Name</label>
        <input
          type="text"
          id="name"
          bind:value={name}
          placeholder="Enter your name"
          required
        />
      </div>

      <div class="form-group">
        <label for="email">Email</label>
        <input
          type="email"
          id="email"
          bind:value={email}
          placeholder="Enter your email"
          required
        />
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          type="password"
          id="password"
          bind:value={password}
          placeholder="Enter your password"
          required
        />
      </div>

      <div class="form-group">
        <label for="repeatPassword">Repeat Password</label>
        <input
          type="password"
          id="repeatPassword"
          bind:value={repeatPassword}
          placeholder="Repeat your password"
          required
        />
      </div>

      {#if errorMessage}
        <p class="error-message">{errorMessage}</p>
      {/if}

      <button type="submit" class="signup-button" disabled={isSubmitting}>
        {isSubmitting ? "Signing Up..." : "Sign Up"}
      </button>
    </form>

    <div class="google-login">
      <p>Or sign up with:</p>
      <button
        on:click={handleGoogleSignUp}
        class="google-login-button"
        disabled={isSubmitting}
      >
        <img src="/google.png" alt="Google Icon" /> Google
      </button>
    </div>

    <p class="login-link">
      Already have an account? <button
        class="link-button"
        on:click={() => goto("/login")}>Log In</button
      >
    </p>
  </div>
</div>

<style>
  .signup-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    background-color: #ffffff;
    min-height: 100vh;
    position: relative;
    padding-top: 50px;
    padding-bottom: 80px;
  }

  .card {
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 350px;
  }

  h1 {
    font-size: 28px;
    margin-bottom: 15px;
    text-align: center;
    color: #333333;
  }

  .form-group {
    margin-bottom: 15px;
  }

  .form-group label {
    display: block;
    font-weight: bold;
    margin-bottom: 5px;
    color: #444444;
  }

  .form-group input {
    width: 100%;
    max-width: 350px;
    padding: 10px;
    border: 1px solid #cccccc;
    border-radius: 5px;
    font-size: 14px;
    box-sizing: border-box;
  }

  .form-group input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 5px rgba(0, 123, 255, 0.3);
  }

  .error-message {
    color: red;
    font-size: 13px;
    margin-top: 10px;
    text-align: center;
  }

  .signup-button {
    width: 100%;
    max-width: 350px;
    padding: 10px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 16px;
    margin-top: 10px;
  }

  .signup-button:hover {
    background-color: #0056b3;
  }

  .signup-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  .google-login {
    margin-top: 20px;
    text-align: center;
  }

  .google-login-button {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: white;
    color: #007bff;
    border: 1px solid #007bff;
    padding: 10px;
    border-radius: 5px;
    cursor: pointer;
    width: 100%;
    max-width: 350px;
  }

  .google-login-button img {
    width: 20px;
    height: 20px;
    margin-right: 5px;
  }

  .google-login-button:hover {
    background-color: #007bff;
    color: white;
  }

  .login-link {
    margin-top: 15px;
    font-size: 14px;
    text-align: center;
  }

  .link-button {
    background: none;
    color: #007bff;
    border: none;
    text-decoration: underline;
    cursor: pointer;
    font-size: inherit;
  }

  .link-button:hover {
    text-decoration: none;
  }

  .toast {
    position: fixed;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #007bff;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    animation: fade-in-out 3s ease-out;
  }

  @keyframes fade-in-out {
    0% {
      opacity: 0;
      transform: translateY(10px);
    }
    10% {
      opacity: 1;
      transform: translateY(0);
    }
    90% {
      opacity: 1;
      transform: translateY(0);
    }
    100% {
      opacity: 0;
      transform: translateY(10px);
    }
  }
</style>
