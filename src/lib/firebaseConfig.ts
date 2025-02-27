// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth , GoogleAuthProvider , onAuthStateChanged ,setPersistence,browserLocalPersistence} from 'firebase/auth';
import { goto } from "$app/navigation";
import { getStorage , ref , uploadBytes, getDownloadURL} from "firebase/storage";
import { Preferences } from "@capacitor/preferences";

// https://firebase.google.com/docs/web/setup#available-libraries

//  Firebase configuration

const firebaseConfig = {
  apiKey: `${import.meta.env.VITE_FIREBASE_APIKEY}`,
  authDomain: `${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN}`,
  projectId: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}`,
  storageBucket: `${import.meta.env.VITE_FIREBASE_BUCKET}`,
  messagingSenderId: `${import.meta.env.VITE_FIREBASE_SENER_ID}`,
  appId: `${import.meta.env.VITE_FIREBASE__APP_ID}`,
  measurementId: `${import.meta.env.VITE_FIREBASE_MEASURMENT_ID}`
};

// firebase intitaliztion 
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleAuthProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
export { auth, googleAuthProvider, ref , uploadBytes, getDownloadURL };

// session presistance handling 
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Failed to enable session persistence:", error);
});
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('User is logged in:', user);
    const token = await user.getIdToken();
    // store the token locally
    await Preferences.set({ key: 'firebase_user', value: JSON.stringify(user) });
  } else {
    console.log('User is not logged in');
    await Preferences.remove({ key: 'firebase_user' });
  }
});