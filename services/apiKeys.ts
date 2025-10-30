// =================================================================================
//
//   >>> CENTRALIZED API KEYS <<<
//
//   Paste all your secret API keys and configuration objects here.
//   This is the preferred way to store your API keys.
//   Refer to the **alternate way to store your Firebase and other API credentials** section below for more information.
//
// =================================================================================


// 1. Firebase Configuration
//
//   - Go to your Firebase project settings.
//   - In the "General" tab, find your web app.
//   - Click the "Config" radio button and copy the entire object.
//   - PASTE it here, replacing the placeholder.
//
export const firebaseConfig = {
  apiKey: "DeepakBholusaria38299XXXXo6-XxXxbuETrYo", //Replace with your own API key
  authDomain: "AilearrningGuru.firebaseapp.com", //Replace with your own auth domain
  projectId: "AilearrningGuru", //Replace with your own project ID 
  storageBucket: "AilearrningGuru.firebasestorage.app", //Replace with your own storage bucket
  messagingSenderId: "1037977557658", //Replace with your own messaging sender ID
  appId: "1:1037977557658:web:12345678901234567890", //Replace with your own app ID
  measurementId: "G-1234567890" //Replace with your own measurement ID
};

// 2. CurrencyAPI.com Key for Exchange Rates
//
//   - Sign up for a free account at https://currencyapi.com/
//   - Find your API key on your dashboard.
//   - PASTE it here, replacing the placeholder.
//
export const CURRENCY_API_KEY = "your_currency_api_key_here"; //Replace with your own currency API key


// 3. Google Maps API Key for Hotel Search
//
//   - Go to your Google Cloud Console for the "tem-expense-management" project.
//   - Navigate to "APIs & Services" > "Credentials".
//   - Copy your API key that has the "Maps JavaScript API" and "Places API" enabled.
//   - PASTE it here, replacing the placeholder.
//
export const GOOGLE_MAPS_API_KEY = "your_google_maps_api_key_here"; //Replace with your own Google Maps API key





// ******************************************************************************* 
// Alternate way to store your Firebase and other API credentials using .env file
// this is a better way to store your credentials because it is not stored in the code and is therefore more secure
// this is also a better way to store your credentials because it is not stored in the code and is therefore more secure
// ===============================================================================
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++


// step 1: create a .env file in the root of your project and add the following:
// VITE_API_KEY=your_api_key_here
// VITE_AUTH_DOMAIN=your_auth_domain_here
// VITE_PROJECT_ID=your_project_id_here
// VITE_STORAGE_BUCKET=your_storage_bucket_here
// VITE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
// VITE_APP_ID=your_app_id_here
// vite_currency_api_key=your_currency_api_key_here
// vite_google_maps_api_key=your_google_maps_api_key_here


// step 2: update your apiKeys.ts file to read the credentials from the .env file like this:

// export const firebaseConfig = {  
//  apiKey: import.meta.env.VITE_API_KEY,
//  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
//  projectId: import.meta.env.VITE_PROJECT_ID,
//  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
//  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
//  appId: import.meta.env.VITE_APP_ID,
//  };

// ✅ Other API keys
// export const CURRENCY_API_KEY = import.meta.env.VITE_CURRENCY_API_KEY;
// export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
