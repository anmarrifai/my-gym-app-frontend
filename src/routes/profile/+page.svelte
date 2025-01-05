<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { auth ,storage, ref, uploadBytes, getDownloadURL  } from "$lib/firebaseConfig";
  
  import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
  import { Preferences } from "@capacitor/preferences";
  interface UserData {
    name: string;
    email: string;
    profile_picture_url: string;
    split_name: string;
    days_per_week: number;
  }

  let userData: UserData | null = null;
  let isEditingName = false;
  let newName = "";
  let profilePictureFile: File | null = null;
  let errorMessage = "";
  let successMessage = "";
  let isDeleteModalVisible = false;

  async function fetchProfileData() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User is not logged in");

      const response = await fetch(
        `${import.meta.env.VITE_SERVER_BASE_URL}/api/user/details/${user.uid}`
      );

      if (response.ok) {
        userData = await response.json();
         // Prepopulate name field
      } else {
        throw new Error("Failed to fetch profile data.");
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "An error occurred.";
      console.error(error);
    }
  }

  
  async function uploadImageToFirebase(base64Data: string, filePath: string): Promise<string> {
    try {
      const response = await fetch(base64Data);
      const blob = await response.blob();

      const storageRef = ref(storage, filePath);
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return downloadURL;
    } catch (error) {
      console.error("Error uploading image to Firebase:", error);
      throw new Error("Failed to upload image.");
    }
  }

  async function updateProfilePicture(source: CameraSource) {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: source,
      });

      if (photo?.dataUrl) {
        const downloadURL = await uploadImageToFirebase(
          photo.dataUrl,
          `profile-pictures/${auth.currentUser?.uid}`
        );

        const response = await fetch(
          `${import.meta.env.VITE_SERVER_BASE_URL}/api/user/profile-picture`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: auth.currentUser?.uid,
              profile_picture_url: downloadURL,
            }),
          }
        );

        if (response.ok) {
          successMessage = "Profile picture updated successfully!";
          fetchProfileData(); // Refresh user data
        } else {
          throw new Error("Failed to update profile picture.");
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "An error occurred.";
      console.error(error);
    }
  }

  async function updateName() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User is not logged in");

    const response = await fetch(`${import.meta.env.VITE_SERVER_BASE_URL}/api/user/name`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.uid,
        name: newName,
      }),
    });

    if (response.ok) {
      successMessage = "Name updated successfully!";
      await fetchProfileData(); // Refresh user data
      isEditingName = false;
    } else {
      throw new Error("Failed to update name.");
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "An error occurred.";
    console.error(error);
  }
}

async function deleteAccount() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User is not logged in");

    const response = await fetch(`${import.meta.env.VITE_SERVER_BASE_URL}/api/user/${user.uid}`, {
      method: "DELETE",
    });

    if (response.ok) {
      logout();
    } else {
      throw new Error("Failed to delete account.");
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "An error occurred.";
    console.error(error);
  }
}


  async function logout() {
    await Preferences.remove({ key: 'firebase_user' }); // Clear the session
    await auth.signOut();
    goto("/login");
  }

  onMount(fetchProfileData);
</script>

<div class="profile-container">
  <!-- Profile Section -->
  <section class="profile-section">
    <div class="profile-picture">
      <div class="profile-picture-wrapper interactive">
        <img
          src={userData?.profile_picture_url || "/muscle-man.png"}
          alt="Profile Picture"
          class="profile-picture-img"
        />
      </div>
      <div class="photo-buttons">
        <button class="camera-button interactive" on:click={() => updateProfilePicture(CameraSource.Camera)}>
          <img src="/camera.png" alt="Camera Icon" class="icon" /> Take Photo
        </button>
        <button class="upload-button interactive" on:click={() => updateProfilePicture(CameraSource.Photos)}>
          <img src="/photo.png" alt="Upload Icon" class="icon" /> Upload Photo
        </button>
      </div>
    </div>
    <div class="user-info">
      <h2 class="user-name">{userData?.name || "Your Name"}</h2>
      <p class="user-email"><strong>Email:</strong> {userData?.email}</p>
      <p class="user-training-plan">
        <strong>Training Plan:</strong> {userData?.split_name || "None"} ({userData?.days_per_week || 0} Days/Week)
      </p>
    </div>
  </section>

  <!-- Settings Section -->
  <section class="settings-section">
    <h3 class="section-title">Settings</h3>
    <div class="settings-buttons">
      <button class="edit-name-button" on:click={() => (isEditingName = true)}>
        <img src="/edit-button.png" alt="Edit Icon" class="icon" /> Edit Name
      </button>
      <button class="edit-preferences-button" on:click={() => goto("/preference?redirect=profile")}>
        <img src="/preferences.png" alt="Preferences Icon" class="icon" /> Edit Preferences
      </button>
      <button class="delete-account-button danger" on:click={() => (isDeleteModalVisible = true)}>
        <img src="/delete.png" alt="Delete Icon" class="icon" /> Reset Account
      </button>
    </div>
  </section>

  <!-- Edit Name Modal -->
  {#if isEditingName}
    <div class="modal">
      <div class="modal-content">
        <h3 class="modal-title">Edit Name</h3>
        <input type="text" bind:value={newName} placeholder="Enter your new name" class="modal-input" />
        <div class="modal-buttons">
          <button class="save-button primary" on:click={updateName}>Save</button>
          <button class="cancel-button secondary" on:click={() => (isEditingName = false)}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Delete Confirmation Modal -->
  {#if isDeleteModalVisible}
    <div class="modal">
      <div class="modal-content">
        <h3 class="modal-title">Are you sure you want to reset your account?</h3>
        <div class="modal-buttons">
          <button class="delete-confirm-button danger" on:click={deleteAccount}>Yes, Reset</button>
          <button class="cancel-button secondary" on:click={() => (isDeleteModalVisible = false)}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- About Us Section -->
  <section class="about-section">
    <h3 class="section-title">About Us</h3>
    <p class="about-text">
      This app helps you track your fitness journey, manage workouts, and monitor progress.
    </p>
    <a href="mailto:tiger.lobed8662@eagereverest.com" class="feedback-link">Send Feedback</a>
  </section>

  <!-- Log Out Section -->

  <button class="logout-button danger" on:click={logout}>
    <img src="/logout.png" alt="Logout Icon" class="icon" /> Log Out
  </button>
  
</div>



<style>

/* General Styling */
.profile-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 16px;
  font-family: Arial, sans-serif;
  color: #333333; /* Dark gray */
  background-color: #f9f9f9; /* Light gray */
  margin-bottom: 60px;
}

/* Section Styling */
section {
  margin-bottom: 24px;
  padding: 16px;
  background: #ffffff; /* White */
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* Light shadow */
}

/* Profile Section */
.profile-picture-wrapper {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #4caf50; /* Green border */
  margin: 0 auto;
}

.profile-picture-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: 16px;
}

.photo-buttons button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #007bff; /* Blue */
  color: #ffffff; /* White text */
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s ease;
}

.photo-buttons button:hover {
  background-color: #0056b3; /* Darker blue */
}

.photo-buttons button img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.user-info {
  text-align: center;
}

.user-name {
  margin-top: 16px;
  font-size: 20px;
  font-weight: bold;
  color: #333333; /* Dark gray */
}

.user-email,
.user-training-plan {
  margin: 8px 0;
  font-size: 16px;
  color: #666666; /* Medium gray */
}

/* Settings Section */
.settings-buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-buttons button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #007bff; /* Blue */
  color: #ffffff; /* White text */
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s ease;
}

.settings-buttons button:hover {
  background-color: #0056b3; /* Darker blue */
}

.delete-account-button {
  background: #e63946; /* Red */
}

.delete-account-button:hover {
  background: #b71c1c; /* Darker red */
}

/* Modals */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.5); /* Semi-transparent black */
  z-index: 1000;
}

.modal-content {
  background: #ffffff; /* White */
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2); /* Stronger shadow */
  animation: fade-in 0.3s ease-in-out;
}

.modal-title {
  font-size: 20px;
  font-weight: bold;
  color: #333333; /* Dark gray */
  margin-bottom: 16px;
}

.modal-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #cccccc; /* Light gray */
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
}

.modal-buttons {
  display: flex;
  justify-content: space-around;
  margin-top: 16px;
}

.modal-buttons button {
  padding: 8px 16px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
}

.save-button {
  background: #4caf50; /* Green */
  color: #ffffff; /* White text */
}

.save-button:hover {
  background: #388e3c; /* Darker green */
}

.cancel-button {
  background: #e63946; /* Red */
  color: #ffffff; /* White text */
}

.cancel-button:hover {
  background: #b71c1c; /* Darker red */
}

/* About Us Section */
.about-text {
  margin: 16px 0;
  font-size: 14px;
  color: #666666; /* Medium gray */
}

.feedback-link {
  color: #007bff; /* Blue */
  text-decoration: underline;
  font-size: 14px;
}

.feedback-link:hover {
  color: #0056b3; /* Darker blue */
}

/* Log Out Section */
.logout-button {
  display: flex;
  align-items: center;
  text-align: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: #e63946; /* Red */
  color: #ffffff; /* White text */
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: background-color 0.3s ease;
  width: 80%;
  margin: 0 auto;
}


.logout-button:hover {
  background: #b71c1c; /* Darker red */
}

.logout-button img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

/* Animations */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-10%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Utility Classes */
.interactive {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.interactive:hover {
  transform: scale(1.05); /* Slightly enlarge */
}

.primary {
  background: #007bff; /* Blue */
  color: #ffffff; /* White text */
}

.secondary {
  background: #cccccc; /* Light gray */
  color: #333333; /* Dark gray */
}

.danger {
  background: #e63946; /* Red */
  color: #ffffff; /* White text */
}

.danger:hover {
  background: #b71c1c; /* Darker red */
}
button img {
  width: 20px; /* Adjust icon size */
  height: 20px;
  object-fit: contain; /* Preserve aspect ratio */
}

</style>