import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function VendorRoute({ children }) {
  const {
    currentUser,
    userProfile,
    checkingUser,
  } = useAuth();

  if (checkingUser) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f4ef] px-5">
        <div className="w-full max-w-[430px] rounded-[28px] bg-white p-6 text-center shadow-xl">
          <div className="text-5xl">🍱</div>

          <h2 className="mt-4 text-xl font-black">
            Loading Vendor Account
          </h2>

          <p className="mt-2 text-sm font-bold text-slate-500">
            User role aur vendor details check ho rahi hain...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const role = String(
    userProfile?.role || ""
  )
    .trim()
    .toLowerCase();

  const vendorId = String(
    userProfile?.vendorId || ""
  ).trim();

  // Admin ko vendor dashboard access milega.
  if (role === "admin") {
    return children;
  }

  // Vendor ke paas role aur vendorId dono hone chahiye.
  if (
    role === "vendor" &&
    vendorId
  ) {
    return children;
  }

  return (
    <VendorAccessError
      currentUser={currentUser}
      userProfile={userProfile}
      role={role}
      vendorId={vendorId}
    />
  );
}

function VendorAccessError({
  currentUser,
  userProfile,
  role,
  vendorId,
}) {
  function clearProfileCache() {
    Object.keys(localStorage)
      .filter((key) =>
        key.startsWith(
          "campusmart_user_profile_"
        )
      )
      .forEach((key) =>
        localStorage.removeItem(key)
      );

    localStorage.removeItem(
      "campusmart_user_profile"
    );

    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-[#f8f4ef] px-5 py-10">
      <div className="mx-auto max-w-[430px] rounded-[30px] border border-red-100 bg-white p-6 shadow-xl">
        <div className="text-center">
          <div className="text-6xl">
            ⚠️
          </div>

          <h1 className="mt-4 text-2xl font-black text-red-600">
            Vendor Access Not Available
          </h1>

          <p className="mt-3 text-sm font-bold leading-6 text-slate-600">
            Browser mein jo vendor profile load hui hai, uski details neeche dikh rahi hain.
          </p>
        </div>

        <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-4">
          <Info
            label="Logged-in Email"
            value={
              currentUser?.email ||
              "Not available"
            }
          />

          <Info
            label="Firebase UID"
            value={
              currentUser?.uid ||
              "Not available"
            }
          />

          <Info
            label="Loaded Role"
            value={
              role || "Not assigned"
            }
          />

          <Info
            label="Loaded Vendor ID"
            value={
              vendorId ||
              "Not assigned"
            }
          />

          <Info
            label="Profile Loaded"
            value={
              userProfile
                ? "Yes"
                : "No"
            }
          />
        </div>

        <button
          type="button"
          onClick={clearProfileCache}
          className="mt-6 w-full rounded-2xl bg-orange-600 px-5 py-4 font-black text-white"
        >
          Clear Cache & Reload
        </button>

        <Link
          to="/home"
          className="mt-3 block w-full rounded-2xl bg-blue-600 px-5 py-4 text-center font-black text-white"
        >
          Back to CampusMart
        </Link>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-black text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-all text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}