<script lang="ts">
  import { auth, googleAuthProvider } from '../../lib/firebaseConfig';
  import { sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
  import { goto } from '$app/navigation';
  import { userId } from '../../lib/store';
  import { Preferences } from "@capacitor/preferences";
  import {onMount} from 'svelte';


  let email = '';
  let password = '';
  let errorMessage = '';
  let showToast = false;
  let toastMessage = '';
  let isForgotPasswordDisabled = false;
  let forgotPasswordMessage = '';


  // check the prefrences to see if they are a new user or not > direct them t the correct page 
  async function checkPreferences(user_id: string) {
    try {
      const response = await fetch(`${import.meta.env.VITE_SERVER_BASE_URL}/api/preferences/${user_id}`);
      if (response.ok) {
        return true; 
      } 
      if (response.status === 404) {
        return false; 
      }
      throw new Error('Failed to check preferences.');
    } catch (error) {
      console.error('Error checking preferences:', error);
      return false;
    }
  }

  // directs to either the dashboard or to the prefrences page if the use r dosent have prefrences in the database 
  async function redirectToDashboardOrPreferences(user_id: string) {
    const hasPreferences = await checkPreferences(user_id);
    if (hasPreferences) {
      goto('/dashboard');
    } else {
      goto('/preference');
    }
  }


  // login up with email and password 
  async function handleEmailLogin() {
    if (!email || !password) {
      errorMessage = "Please fill in both email and password.";
      return;
    }

    try {
      const userData = await signInWithEmailAndPassword(auth, email, password);
      const user = userData.user;
      if (user) {
        userId.set(user.uid);
      }
      await redirectToDashboardOrPreferences(user.uid);
    } catch (error: unknown) {
      errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error(error);
    }
  }

  // google login 
  async function handleGoogleLogin() {
    try {
      const userData = await signInWithPopup(auth, googleAuthProvider);
      const user = userData.user;
      if (user) {
        userId.set(user.uid);
      }
      await redirectToDashboardOrPreferences(user.uid);
    } catch (error: unknown) {
      errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error(error);
    }
  }
   
  // to send the password reset link 
  async function handlePasswordReset() {
    if (isForgotPasswordDisabled) return;

    if (!email) {
      errorMessage = "Please enter your email address to reset the password.";
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      forgotPasswordMessage = 'Password reset email sent. You can try again in a minute.';
      // restrict the user from spaming passwrod reset requests 
      isForgotPasswordDisabled = true;
      setTimeout(() => isForgotPasswordDisabled = false, 60000); 
    } catch (error: unknown) {
      errorMessage = error instanceof Error ? error.message : 'Failed to send reset password email.';
      console.error(error);
    }
  }

  onMount(async () => {
  const userData = await Preferences.get({ key: 'firebase_user' });
  if (userData.value) {
    const user = JSON.parse(userData.value);
    userId.set(user.uid);
    // add the session toke so the user can stay logged in 
    const token = await auth.currentUser?.getIdToken(true);
  } else {
    
    goto('/login');
  }
});
</script>

<div class="login-container">
  {#if showToast}
    <div class="toast">{toastMessage}</div>
  {/if}

  <h1>Welcome Back!</h1>
  <p>Please log in to continue.</p>

  <div class="form-group">
    <label for="email">Email</label>
    <input type="email" id="email" bind:value={email} placeholder="Enter your email" />
  </div>

  <div class="form-group">
    <label for="password">Password</label>
    <input type="password" id="password" bind:value={password} placeholder="Enter your password" />
  </div>

  {#if errorMessage}
    <p class="error-message">{errorMessage}</p>
  {/if}

  <button class="login-button" on:click={handleEmailLogin}>Log In</button>

  <button 
    class="forgot-password" 
    on:click|preventDefault={handlePasswordReset} 
    disabled={isForgotPasswordDisabled}>
    Forgot Password?
  </button>

  {#if forgotPasswordMessage}
    <p class="forgot-password-message">{forgotPasswordMessage}</p>
  {/if}

  <hr class="divider" />

  <button class="google-login-button" on:click={handleGoogleLogin}>
    <img src="/google.png" alt="Google Icon" /> Log In with Google
  </button>

  <p class="signup-link">
    Don't have an account? <button class="signup-button" on:click={() => goto('/signup')}>Sign Up</button>
  </p>
</div>

<style>
  .login-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center; /* Centers vertically */
    padding: 10px;
    background-color: #ffffff;
    min-height: 100vh;
    position: relative; /* Allow spacing adjustments */
    padding-top: 25px; /* Extra padding on top */
    padding-bottom: 80px; /* Ensures empty space on the bottom */
  }

  h1 {
    font-size: 28px;
    margin-bottom: 10px;
    color: #333333;
  }

  p {
    color: #666666;
    margin-bottom: 20px;
  }

  .form-group {
    width: 100%;
    max-width: 400px;
    margin-bottom: 15px;
  }

  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    color: #444444;
  }

  .form-group input {
    width: 100%; /* Ensures the input takes the full width of the container */
    max-width: 370px; /* Adjusted to prevent spilling out of the page */
    padding: 10px;
    border: 1px solid #cccccc;
    border-radius: 10px;
    font-size: 14px;
    box-sizing: border-box; /* Ensures padding doesn't exceed the max-width */
  }


  .form-group input:focus {
    outline: none;
    border-color: #007BFF;
    box-shadow: 0 0 5px rgba(0, 123, 255, 0.3);
  }

  .error-message {
    color: red;
    font-size: 13px;
    margin-top: 10px;
    text-align: center;
  }

  .login-button {
    background-color: #007BFF;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    width: 100%;
    max-width: 400px;
    font-size: 16px;
    margin-top: 10px;
  }

  .login-button:hover {
    background-color: #0056b3;
  }

  .forgot-password {
    background: none;
    color: #007BFF;
    border: none;
    text-decoration: underline;
    cursor: pointer;
    font-size: 14px;
    margin-top: 10px;
  }

  .forgot-password:disabled {
    color: gray;
    cursor: not-allowed;
  }

  .forgot-password-message {
    color: #007BFF;
    font-size: 13px;
    margin-top: 5px;
    text-align: center;
  }

  .divider {
    margin: 20px 0;
    width: 100%;
    max-width: 400px;
    border: none;
    height: 1px;
    background-color: #cccccc;
  }

  .google-login-button {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: white;
    color: #007BFF;
    border: 1px solid #007BFF;
    padding: 10px;
    border-radius: 5px;
    cursor: pointer;
    width: 100%;
    max-width: 400px;
  }

  .google-login-button img {
    width: 20px;
    height: 20px;
    margin-right: 5px;
  }

  .google-login-button:hover {
    background-color: #007BFF;
    color: white;
  }

  .signup-link {
    margin-top: 10px;
    font-size: 14px;
  }

  .signup-button {
    background: none;
    color: #007BFF;
    border: none;
    text-decoration: underline;
    cursor: pointer;
    font-size: inherit;
  }

  .signup-button:hover {
    text-decoration: none;
  }

  .toast {
    position: fixed;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    background-color: #007BFF;
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
