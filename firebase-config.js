/*
  Paste your own Firebase project's config below.
  Get this from: Firebase Console → Project Settings → General → "Your apps" → SDK setup and configuration.
  These values are safe to be public (they identify your project, they are not secret keys) —
  actual protection comes from Firebase Auth + Security Rules, not from hiding this file.
*/

const firebaseConfig = {
    apiKey: "AIzaSyAm47HqmCTaAA3F9eSwFuoF47qzo_7wgmY",
    authDomain: "doe-mlsu-ef840.firebaseapp.com",
    projectId: "doe-mlsu-ef840",
    storageBucket: "doe-mlsu-ef840.firebasestorage.app",
    messagingSenderId: "518711113307",
    appId: "1:518711113307:web:2a515517efef485f06317e"
};

firebase.initializeApp(firebaseConfig);

/* Fixed fake domain used to turn "usernames" into emails Firebase Auth can use internally.
   Users never see or type this — they only ever enter a username. */
const USERNAME_DOMAIN = "bednotes.local";

function usernameToEmail(username) {
    return username.trim().toLowerCase() + "@" + USERNAME_DOMAIN;
}
