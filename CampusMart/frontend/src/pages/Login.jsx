import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

import Logo from "../components/Logo";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

const ADMIN_EMAIL = "campusmart05@gmail.com";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const { googleLogin } = useAuth();

  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  async function handleGoogleLogin() {
    if (loading) return;

    try {
      setLoading(true);
      setErrorText("");

      const result = await googleLogin();
      const user = result.user;

      if (!user?.uid) {
        throw new Error(
          "Google login did not return a valid user."
        );
      }

      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name:
            user.displayName ||
            "CampusMart User",
          email: user.email || "",
          phone: "",
          college: "",
          course: "",
          semester: "",
          role: "user",
          verified: false,
          profilePhoto:
            user.photoURL || "",
          bio: "",
          provider: "google",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
      } else {
        const existingProfile =
          userSnap.data();

        await setDoc(
          userRef,
          {
            name:
              user.displayName ||
              existingProfile.name ||
              "CampusMart User",
            email:
              user.email ||
              existingProfile.email ||
              "",
            profilePhoto:
              existingProfile.profilePhoto ||
              user.photoURL ||
              "",
            provider: "google",
            lastLogin: serverTimestamp(),
          },
          {
            merge: true,
          }
        );
      }

      const finalSnapshot =
        await getDoc(userRef);

      const finalProfile =
        finalSnapshot.exists()
          ? finalSnapshot.data()
          : null;

      const normalizedRole = String(
        finalProfile?.role || "user"
      )
        .trim()
        .toLowerCase();

      const normalizedEmail = String(
        user.email || ""
      )
        .trim()
        .toLowerCase();

      if (
        normalizedRole === "admin" ||
        normalizedEmail === ADMIN_EMAIL
      ) {
        navigate("/admin", {
          replace: true,
        });
        return;
      }

      if (normalizedRole === "vendor") {
        navigate("/vendor", {
          replace: true,
        });
        return;
      }

      if (
        normalizedRole === "pg-owner"
      ) {
        navigate("/pg-owner", {
          replace: true,
        });
        return;
      }

      if (onLogin) {
        onLogin(user);
        return;
      }

      navigate("/home", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Google login error:",
        error
      );

      if (
        error?.code ===
        "auth/popup-closed-by-user"
      ) {
        setErrorText(
          "Google login popup was closed before sign-in completed."
        );
      } else if (
        error?.code ===
        "auth/popup-blocked"
      ) {
        setErrorText(
          "Your browser blocked the Google login popup. Please allow popups and try again."
        );
      } else if (
        error?.code ===
        "auth/unauthorized-domain"
      ) {
        setErrorText(
          "This website domain is not authorized in Firebase Authentication."
        );
      } else if (
        error?.code ===
        "permission-denied"
      ) {
        setErrorText(
          "Firestore permission denied while creating your profile."
        );
      } else {
        setErrorText(
          error?.message ||
            "Google login failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-100 px-4 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 sm:px-6 sm:py-10">
      <div className="grid w-full max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-10">
        <div className="hidden lg:block">
          <Logo />

          <h1 className="mt-10 text-6xl font-black leading-tight text-slate-900 dark:text-white">
            Start your campus marketplace journey.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-slate-600 dark:text-slate-300">
            Buy, sell and exchange books,
            gadgets, hostel items and more
            with trusted students around you.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-5">
            {[
              ["📚", "Books"],
              ["💻", "Gadgets"],
              ["🚲", "Cycles"],
              ["🛏️", "Hostel Items"],
            ].map(([icon, title]) => (
              <div
                key={title}
                className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
              >
                <div className="mb-3 text-5xl">
                  {icon}
                </div>

                <h3 className="font-black text-slate-900 dark:text-white">
                  {title}
                </h3>
              </div>
            ))}
          </div>
        </div>

        <Card className="rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div className="mb-7 lg:hidden">
            <Logo />
          </div>

          <p className="text-sm font-black text-blue-600">
            CampusMart
          </p>

          <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Welcome Back
          </h2>

          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Continue with your Google account
            to access CampusMart.
          </p>

          <div className="mt-8 space-y-4">
            <Button
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : "🔐 Continue with Google"}
            </Button>

            {errorText && (
              <div
                role="alert"
                className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
              >
                {errorText}
              </div>
            )}

            <p className="text-center text-sm text-slate-500">
              No password required. Your
              account will be created
              automatically.
            </p>
          </div>

          <div className="mt-8 rounded-3xl border border-blue-100 bg-blue-50 p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-black text-blue-600">
              Why Google Login?
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              It helps reduce fake accounts
              and keeps CampusMart safer for
              students.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}