import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

import Logo from "../components/Logo";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

export default function Login({ onLogin }) {
  const { googleLogin } = useAuth();

  async function handleGoogleLogin() {
    try {
      const result = await googleLogin();
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || "CampusMart User",
          email: user.email,
          phone: "",
          college: "",
          course: "",
          semester: "",
          role: "user",
          verified: false,
          profilePhoto: user.photoURL || "",
          bio: "",
          provider: "google",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
      } else {
        await setDoc(
          userRef,
          {
            name: user.displayName || userSnap.data().name || "CampusMart User",
            email: user.email,
            profilePhoto: user.photoURL || userSnap.data().profilePhoto || "",
            provider: "google",
            lastLogin: serverTimestamp(),
          },
          { merge: true }
        );
      }

      const finalSnap = await getDoc(userRef);
      const finalProfile = finalSnap.exists() ? finalSnap.data() : null;

if (finalProfile?.role === "vendor") {
  window.location.href = "/vendor";
} else if (finalProfile?.role === "admin") {
  window.location.href = "/admin";
} else {
  onLogin(user);
}
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center px-6 py-10">
      <div className="grid lg:grid-cols-2 gap-10 max-w-6xl w-full items-center">
        <div className="hidden lg:block">
          <Logo />

          <h1 className="text-6xl font-extrabold text-slate-900 dark:text-white mt-10 leading-tight">
            Start your campus marketplace journey.
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-lg mt-6 max-w-xl">
            Buy, sell and exchange books, gadgets, hostel items and more with
            trusted students around you.
          </p>

          <div className="grid grid-cols-2 gap-5 mt-10">
            {[
              ["📚", "Books"],
              ["💻", "Gadgets"],
              ["🚲", "Cycles"],
              ["🛏️", "Hostel Items"],
            ].map(([icon, title]) => (
              <div
                key={title}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800"
              >
                <div className="text-5xl mb-3">{icon}</div>
                <h3 className="font-extrabold text-slate-900 dark:text-white">
                  {title}
                </h3>
              </div>
            ))}
          </div>
        </div>

        <Card className="p-8 lg:p-10">
          <div className="lg:hidden mb-8">
            <Logo />
          </div>

          <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white">
            Welcome to CampusMart
          </h2>

          <p className="text-slate-500 mt-2">
            Continue with your Google account to access CampusMart.
          </p>

          <div className="mt-8 space-y-4">
            <Button className="w-full" onClick={handleGoogleLogin}>
              🔐 Continue with Google
            </Button>

            <p className="text-center text-sm text-slate-500">
              No password required. Your account will be created automatically.
            </p>
          </div>

          <div className="mt-8 rounded-3xl bg-blue-50 dark:bg-slate-900 p-5 border border-blue-100 dark:border-slate-800">
            <h3 className="font-extrabold text-blue-600">
              Why Google Login?
            </h3>

            <p className="text-slate-500 text-sm mt-2">
              This helps reduce fake accounts and keeps CampusMart safer for
              students.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}