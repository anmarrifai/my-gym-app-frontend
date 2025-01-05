<script>
  import { goto } from '$app/navigation'; 
</script>

<div class="welcome-page">
  <div class="content">
    <h1>
      Get <span class="highlight-green">Fit</span>, Stay <span class="highlight-green">Strong</span>
    </h1>
    <p>Your fitness journey starts here. Log in or sign up to begin!</p>

    <div class="button-group">
      <button on:click={() => goto('/login')} class="login-button">
        Log In
      </button>
      <button on:click={() => goto('/signup')} class="signup-button">
        Sign Up
      </button>
    </div>
  </div>
</div>

<style>
 
  .welcome-page {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #FFFFFF, #F8F9FA); 
    color: #333333;
    text-align: center;
    padding: 20px;
  }

  
  .content {
    max-width: 500px;
  }

  h1 {
    font-size: 36px;
    margin-bottom: 10px;
    font-weight: bold;
  }

  .highlight-green {
    color: #28A745; 
  }

  p {
    font-size: 18px;
    margin-bottom: 30px;
    line-height: 1.5;
  }

  
  .button-group {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .login-button {
    background-color: #007BFF;
    color: white;
    border: none;
    padding: 15px;
    border-radius: 50px;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.3s ease, box-shadow 0.3s ease;
  }

  .login-button:hover {
    background-color: #0056b3;
    box-shadow: 0 4px 10px rgba(0, 123, 255, 0.2); 
  }

  .signup-button {
    background-color: transparent;
    color: #007BFF;
    border: 2px solid #007BFF;
    padding: 15px;
    border-radius: 50px;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .signup-button:hover {
    background-color: #007BFF;
    color: white;
  }
</style>