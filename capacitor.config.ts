import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mygym.app',
  appName: 'mygymapp',
  webDir: '.vercel/output/static',
  server:{
    url:"https://my-gym-app-frontend.vercel.app/",
    cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"]
    }
  }
};

export default config;
