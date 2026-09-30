import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
} from "firebase/auth";

import {
  doc,
  getDoc,
  getDocFromCache,
} from "firebase/firestore";

import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

import { auth, db } from "../firebase";

const AuthContext = createContext(null);

const PROFILE_CACHE_PREFIX =
  "campusmart_user_profile_";

function getProfileCacheKey(userId) {
  return `${PROFILE_CACHE_PREFIX}${userId}`;
}

function readCachedProfile(userId) {
  try {
    const savedProfile =
      localStorage.getItem(
        getProfileCacheKey(userId)
      );

    if (!savedProfile) {
      return null;
    }

    return JSON.parse(savedProfile);
  } catch (error) {
    console.warn(
      "Profile cache read error:",
      error
    );

    return null;
  }
}

function saveCachedProfile(
  userId,
  profile
) {
  try {
    localStorage.setItem(
      getProfileCacheKey(userId),
      JSON.stringify(profile)
    );
  } catch (error) {
    console.warn(
      "Profile cache save error:",
      error
    );
  }
}

function removeCachedProfile(userId) {
  try {
    localStorage.removeItem(
      getProfileCacheKey(userId)
    );
  } catch (error) {
    console.warn(
      "Profile cache remove error:",
      error
    );
  }
}

export function AuthProvider({
  children,
}) {
  const [
    currentUser,
    setCurrentUser,
  ] = useState(null);

  const [
    userProfile,
    setUserProfile,
  ] = useState(null);

  const [
    checkingUser,
    setCheckingUser,
  ] = useState(true);

  const [
    profileLoading,
    setProfileLoading,
  ] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hideNativeSplash() {
      if (
        !Capacitor.isNativePlatform()
      ) {
        return;
      }

      try {
        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(
              resolve
            );
          });
        });

        await SplashScreen.hide({
          fadeOutDuration: 150,
        });
      } catch (error) {
        console.log(
          "Splash screen hide skipped:",
          error
        );
      }
    }

    async function finishStartup() {
      if (!isMounted) {
        return;
      }

      setCheckingUser(false);
      await hideNativeSplash();
    }

    function applyProfile(
      userId,
      snapshot
    ) {
      if (
        !isMounted ||
        !snapshot.exists()
      ) {
        return false;
      }

      const profile = {
        id: snapshot.id,
        ...snapshot.data(),
      };

      setUserProfile(profile);

      saveCachedProfile(
        userId,
        profile
      );

      return true;
    }

    async function refreshProfileFromServer(
      userId
    ) {
      try {
        const userRef = doc(
          db,
          "users",
          userId
        );

        const latestSnapshot =
          await getDoc(userRef);

        if (!isMounted) {
          return;
        }

        if (
          latestSnapshot.exists()
        ) {
          applyProfile(
            userId,
            latestSnapshot
          );
        }
      } catch (error) {
        console.error(
          "Background profile refresh error:",
          error
        );
      }
    }

    async function loadProfile(user) {
      const userId = user.uid;

      const locallyCachedProfile =
        readCachedProfile(userId);

      if (locallyCachedProfile) {
        setUserProfile(
          locallyCachedProfile
        );

        setProfileLoading(false);

        await finishStartup();

        refreshProfileFromServer(
          userId
        );

        return;
      }

      setProfileLoading(true);

      const userRef = doc(
        db,
        "users",
        userId
      );

      try {
        const cachedSnapshot =
          await getDocFromCache(
            userRef
          );

        const cacheFound =
          applyProfile(
            userId,
            cachedSnapshot
          );

        if (cacheFound) {
          setProfileLoading(false);

          await finishStartup();

          refreshProfileFromServer(
            userId
          );

          return;
        }
      } catch {
        // First login par cache na milna normal hai.
      }

      try {
        const latestSnapshot =
          await getDoc(userRef);

        if (!isMounted) {
          return;
        }

        if (
          latestSnapshot.exists()
        ) {
          applyProfile(
            userId,
            latestSnapshot
          );
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error(
          "User profile load error:",
          error
        );

        if (isMounted) {
          setUserProfile(null);
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
          await finishStartup();
        }
      }
    }

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!isMounted) {
            return;
          }

          setCurrentUser(user);

          if (!user) {
            setUserProfile(null);
            setProfileLoading(false);

            await finishStartup();

            return;
          }

          await loadProfile(user);
        }
      );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  async function googleLogin() {
    try {
      if (
        Capacitor.isNativePlatform()
      ) {
        /*
         * Credential Manager kuch phones par
         * "No credentials available" error deta hai.
         *
         * useCredentialManager false karne par
         * traditional Google account chooser use hoga.
         *
         * skipNativeAuth true rakha hai kyunki
         * token ko Firebase Web SDK mein manually
         * signInWithCredential se login kara rahe hain.
         */
        const result =
          await FirebaseAuthentication.signInWithGoogle({
            useCredentialManager: false,
            skipNativeAuth: true,
          });

        const idToken =
          result.credential?.idToken;

        const accessToken =
          result.credential?.accessToken;

        if (
          !idToken &&
          !accessToken
        ) {
          throw new Error(
            "Google login token nahi mila. Google account select karke dobara try karo."
          );
        }

        const credential =
          GoogleAuthProvider.credential(
            idToken || null,
            accessToken || null
          );

        return await signInWithCredential(
          auth,
          credential
        );
      }

      const provider =
        new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account",
      });

      return await signInWithPopup(
        auth,
        provider
      );
    } catch (error) {
      console.error(
        "Google login error:",
        error
      );

      throw error;
    }
  }

  async function logout() {
    try {
      const userId =
        currentUser?.uid;

      if (
        Capacitor.isNativePlatform()
      ) {
        try {
          await FirebaseAuthentication.signOut();
        } catch (nativeSignOutError) {
          console.warn(
            "Native sign out skipped:",
            nativeSignOutError
          );
        }
      }

      await signOut(auth);

      if (userId) {
        removeCachedProfile(userId);
      }

      setCurrentUser(null);
      setUserProfile(null);
      setProfileLoading(false);
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        checkingUser,
        profileLoading,
        googleLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}