import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import {
  doc,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [checkingUser, setCheckingUser] = useState(true);

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        setCurrentUser(user);

        if (!user) {
          setUserProfile(null);
          setCheckingUser(false);
          return;
        }

        setCheckingUser(true);

        const userRef = doc(
          db,
          "users",
          user.uid
        );

        unsubscribeProfile = onSnapshot(
          userRef,
          (snapshot) => {
            setUserProfile(
              snapshot.exists()
                ? {
                    id: snapshot.id,
                    ...snapshot.data(),
                  }
                : null
            );

            setCheckingUser(false);
          },
          (error) => {
            console.error(
              "User profile listener error:",
              error
            );

            setUserProfile(null);
            setCheckingUser(false);
          }
        );
      },
      (error) => {
        console.error(
          "Authentication listener error:",
          error
        );

        setCurrentUser(null);
        setUserProfile(null);
        setCheckingUser(false);
      }
    );

    return () => {
      unsubscribeAuth();

      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  async function googleLogin() {
    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: "select_account",
    });

    return signInWithPopup(
      auth,
      provider
    );
  }

  async function logout() {
    await signOut(auth);
  }

  const value = useMemo(
    () => ({
      currentUser,
      userProfile,
      checkingUser,
      googleLogin,
      logout,
    }),
    [
      currentUser,
      userProfile,
      checkingUser,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}

export default AuthContext;
