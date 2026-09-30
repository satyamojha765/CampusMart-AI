import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import {
  ArrowLeft,
  ChefHat,
  Clock3,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  Send,
  ShieldCheck,
  Star,
  Users,
  Utensils,
  X,
} from "lucide-react";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const REVIEW_UNDO_SECONDS = 5;

export default function CookDetails() {
  const { cookId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [cook, setCook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingCook, setLoadingCook] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [undoingReview, setUndoingReview] = useState(false);

  const [pageError, setPageError] = useState("");
  const [reviewError, setReviewError] = useState("");

  const [undoReviewId, setUndoReviewId] = useState("");
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
  const undoIntervalRef = useRef(null);
  const undoTimeoutRef = useRef(null);

  useEffect(() => {
    if (!cookId) {
      setPageError("Cook profile ID nahi mila.");
      setLoadingCook(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, "pgCooks", cookId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setCook(null);
          setPageError("Cook profile available nahi hai.");
          setLoadingCook(false);
          return;
        }

        setCook({ id: snapshot.id, ...snapshot.data() });
        setPageError("");
        setLoadingCook(false);
      },
      (error) => {
        console.error("Cook profile loading error:", error);
        setPageError("Cook profile load nahi ho pa raha hai.");
        setLoadingCook(false);
      }
    );

    return () => unsubscribe();
  }, [cookId]);

  useEffect(() => {
    if (!cookId) {
      setLoadingReviews(false);
      return undefined;
    }

    const reviewsQuery = query(
      collection(db, "cookReviews"),
      where("cookId", "==", cookId)
    );

    const unsubscribe = onSnapshot(
      reviewsQuery,
      (snapshot) => {
        const list = snapshot.docs.map((reviewDoc) => ({
          id: reviewDoc.id,
          ...reviewDoc.data(),
        }));

        list.sort((first, second) => {
          const firstTime = first.createdAt?.toMillis?.() || 0;
          const secondTime = second.createdAt?.toMillis?.() || 0;
          return secondTime - firstTime;
        });

        setReviews(list);
        setLoadingReviews(false);
        setReviewError("");
      },
      (error) => {
        console.error("Cook reviews loading error:", error);
        setReviewError("Reviews load nahi ho pa rahe hain.");
        setLoadingReviews(false);
      }
    );

    return () => unsubscribe();
  }, [cookId]);

  useEffect(() => {
    return () => {
      if (undoIntervalRef.current) {
        clearInterval(undoIntervalRef.current);
      }

      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const currentUserReview = useMemo(() => {
    if (!currentUser?.uid) return null;
    return reviews.find((review) => review.userId === currentUser.uid) || null;
  }, [reviews, currentUser?.uid]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;

    const total = reviews.reduce(
      (sum, review) => sum + Number(review.rating || 0),
      0
    );

    return total / reviews.length;
  }, [reviews]);

  const ratingBreakdown = useMemo(() => {
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    reviews.forEach((review) => {
      const rating = Number(review.rating);
      if (breakdown[rating] !== undefined) breakdown[rating] += 1;
    });

    return breakdown;
  }, [reviews]);

  function clearUndoState() {
    if (undoIntervalRef.current) {
      clearInterval(undoIntervalRef.current);
      undoIntervalRef.current = null;
    }

    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    setUndoReviewId("");
    setUndoSecondsLeft(0);
  }

  function startUndoWindow(reviewId) {
    clearUndoState();
    setUndoReviewId(reviewId);
    setUndoSecondsLeft(REVIEW_UNDO_SECONDS);

    undoIntervalRef.current = setInterval(() => {
      setUndoSecondsLeft((current) => {
        if (current <= 1) {
          if (undoIntervalRef.current) {
            clearInterval(undoIntervalRef.current);
            undoIntervalRef.current = null;
          }
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    undoTimeoutRef.current = setTimeout(() => {
      clearUndoState();
    }, REVIEW_UNDO_SECONDS * 1000);
  }

  function getCookImage() {
    return (
      cook?.photoURL ||
      cook?.imageUrl ||
      cook?.image ||
      "https://placehold.co/800x800?text=Cook"
    );
  }

  function formatPrice(price) {
    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return "Price on request";
    }

    return `₹${numericPrice.toLocaleString("en-IN")}/student/month`;
  }

  function formatReviewDate(timestamp) {
    if (!timestamp?.toDate) return "Recently";

    return timestamp.toDate().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function getReviewerName() {
    return (
      userProfile?.name ||
      userProfile?.displayName ||
      userProfile?.fullName ||
      currentUser?.displayName ||
      "CampusMart User"
    );
  }

  function getReviewerPhoto() {
    return (
      userProfile?.photoURL ||
      userProfile?.profilePhoto ||
      userProfile?.image ||
      currentUser?.photoURL ||
      ""
    );
  }

  function getInitial(name) {
    return String(name || "U").trim().charAt(0).toUpperCase();
  }

  function handleCall() {
    if (!cook?.phone) {
      window.alert("Phone number available nahi hai.");
      return;
    }

    window.location.href = `tel:${cook.phone}`;
  }

  function handleWhatsApp() {
    const whatsappNumber = String(cook?.whatsapp || cook?.phone || "").replace(
      /\D/g,
      ""
    );

    if (!whatsappNumber) {
      window.alert("WhatsApp number available nahi hai.");
      return;
    }

    const message = encodeURIComponent(
      `Hello ${cook?.name || ""}, maine aapka profile CampusMart ke Find a Cook section mein dekha. Mujhe cooking service ke baare mein information chahiye.`
    );

    window.open(
      `https://wa.me/${whatsappNumber}?text=${message}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function handleReviewSubmit(event) {
    event.preventDefault();
    setReviewError("");

    if (!currentUser?.uid) {
      setReviewError("Rating dene ke liye login karna zaroori hai.");
      return;
    }

    if (currentUserReview) {
      setReviewError("Tum is cook ko pehle hi review de chuke ho.");
      return;
    }

    if (!cookId) {
      setReviewError("Cook profile ID nahi mila.");
      return;
    }

    if (selectedRating < 1 || selectedRating > 5) {
      setReviewError("Please 1 se 5 ke beech rating select karo.");
      return;
    }

    const trimmedComment = reviewComment.trim();

    if (trimmedComment.length > 500) {
      setReviewError("Review maximum 500 characters ka ho sakta hai.");
      return;
    }

    const reviewId = `${currentUser.uid}_${cookId}`;

    setSavingReview(true);

    try {
      await setDoc(doc(db, "cookReviews", reviewId), {
        cookId,
        userId: currentUser.uid,
        userName: getReviewerName(),
        userPhoto: getReviewerPhoto(),
        rating: Number(selectedRating),
        comment: trimmedComment,
        createdAt: serverTimestamp(),
      });

      setSelectedRating(0);
      setReviewComment("");
      startUndoWindow(reviewId);
    } catch (error) {
      console.error("Review save error:", error);

      if (error?.code === "permission-denied") {
        setReviewError(
          "Review submit nahi hua. Firestore rules publish hue hain ya nahi check karo."
        );
      } else {
        setReviewError("Review submit nahi ho pa raha hai. Dobara try karo.");
      }
    } finally {
      setSavingReview(false);
    }
  }

  async function handleUndoReview() {
    if (!undoReviewId || undoSecondsLeft <= 0) return;

    setUndoingReview(true);
    setReviewError("");

    try {
      await deleteDoc(doc(db, "cookReviews", undoReviewId));
      clearUndoState();
      setSelectedRating(0);
      setReviewComment("");
    } catch (error) {
      console.error("Review undo error:", error);
      setReviewError("Undo complete nahi hua. 5-second window expire ho sakti hai.");
      clearUndoState();
    } finally {
      setUndoingReview(false);
    }
  }

  if (loadingCook) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl animate-pulse px-4 py-5">
          <div className="h-10 w-10 rounded-full bg-slate-200" />
          <div className="mt-5 h-80 rounded-[30px] bg-slate-200" />
          <div className="mt-5 h-48 rounded-3xl bg-white" />
        </div>
      </div>
    );
  }

  if (pageError || !cook) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <ChefHat size={30} />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Profile nahi mila
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {pageError || "Ye cook profile available nahi hai."}
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 h-12 w-full rounded-xl bg-blue-600 font-bold text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const cookingTypes = Array.isArray(cook.cookingTypes)
    ? cook.cookingTypes
    : [];
  const meals = Array.isArray(cook.meals) ? cook.meals : [];

  const specialDishes = Array.isArray(cook.specialDishes)
    ? cook.specialDishes
    : [];

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-900">
              {cook.name || "Cook Profile"}
            </h1>
            <p className="text-xs text-slate-500">Find a Cook</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="relative h-72 bg-slate-100 sm:h-96">
            <img
              src={getCookImage()}
              alt={cook.name || "Cook"}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.src =
                  "https://placehold.co/800x800?text=Cook";
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/75 to-transparent" />
            <span
              className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-bold shadow ${
                cook.available !== false
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-800 text-white"
              }`}
            >
              {cook.available !== false
                ? "Available Now"
                : "Currently Unavailable"}
            </span>
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h2 className="text-2xl font-extrabold">
                {cook.name || "Cook"}
              </h2>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-white/90">
                <MapPin size={16} />
                <span>
                  {[cook.area, cook.city].filter(Boolean).join(", ") ||
                    "Location not added"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Starting from</p>
                <p className="text-2xl font-extrabold text-blue-700">
                  {formatPrice(cook.monthlyPrice)}
                </p>
              </div>

              <div className="rounded-2xl bg-yellow-50 px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Star
                    size={19}
                    className="fill-yellow-400 text-yellow-400"
                  />
                  <span className="text-xl font-extrabold text-slate-900">
                    {averageRating > 0 ? averageRating.toFixed(1) : "New"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {reviews.length} review{reviews.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {cookingTypes.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {cookingTypes.map((type) => (
                  <span
                    key={type}
                    className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
                  >
                    {type}
                  </span>
                ))}
              </div>
            )}

            {specialDishes.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <h3 className="font-bold text-slate-900">Special Dishes</h3>

                <div className="mt-3 flex flex-wrap gap-2">
                  {specialDishes.map((dish) => (
                    <span
                      key={dish}
                      className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700"
                    >
                      {dish}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {cook.description && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <h3 className="font-bold text-slate-900">About</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {cook.description}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3">
          <InfoCard
            icon={<Clock3 size={21} />}
            label="Available timing"
            value={cook.timings || "Flexible timing"}
          />
          <InfoCard
            icon={<Users size={21} />}
            label="Cooking capacity"
            value={cook.capacity || "Student groups"}
          />
          <InfoCard
            icon={<ChefHat size={21} />}
            label="Experience"
            value={
              Number(cook.experienceYears || 0) > 0
                ? `${cook.experienceYears} years`
                : "Not mentioned"
            }
          />
          <InfoCard
            icon={<Utensils size={21} />}
            label="Meals available"
            value={meals.length > 0 ? meals.join(", ") : "Not mentioned"}
          />
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={23} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Contact Cook</h3>
              <p className="text-xs text-slate-500">
                Price aur availability confirm kar lo
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCall}
              disabled={!cook.phone}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-sm font-bold text-blue-700 disabled:opacity-50"
            >
              <Phone size={18} />
              Call
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              disabled={!cook.whatsapp && !cook.phone}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-50"
            >
              <MessageCircle size={18} />
              WhatsApp
            </button>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Ratings & Reviews
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Students ka real experience
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Star
                  size={21}
                  className="fill-yellow-400 text-yellow-400"
                />
                <span className="text-2xl font-extrabold text-slate-900">
                  {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}
                </span>
              </div>
              <p className="text-xs text-slate-500">{reviews.length} total</p>
            </div>
          </div>

          {reviews.length > 0 && (
            <div className="mt-5 space-y-2">
              {[5, 4, 3, 2, 1].map((ratingNumber) => {
                const ratingCount = ratingBreakdown[ratingNumber];
                const percentage = (ratingCount / reviews.length) * 100;

                return (
                  <div key={ratingNumber} className="flex items-center gap-3">
                    <span className="w-3 text-xs font-semibold text-slate-600">
                      {ratingNumber}
                    </span>
                    <Star
                      size={13}
                      className="fill-yellow-400 text-yellow-400"
                    />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-yellow-400 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs text-slate-500">
                      {ratingCount}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Rate This Cook</h3>

          {currentUserReview ? (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-blue-700">
                <ShieldCheck size={19} />
                <p className="font-bold">Review submitted</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-blue-700/80">
                Ek user ek cook ko sirf ek baar review de sakta hai. Review edit
                ya baad mein delete nahi hoga.
              </p>
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} className="mt-5">
              <p className="text-sm font-semibold text-slate-700">
                Select rating
              </p>
              <div className="mt-2 flex gap-2">
                {[1, 2, 3, 4, 5].map((ratingNumber) => (
                  <button
                    key={ratingNumber}
                    type="button"
                    onClick={() => {
                      setSelectedRating(ratingNumber);
                      setReviewError("");
                    }}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white active:scale-95"
                    aria-label={`${ratingNumber} star rating`}
                  >
                    <Star
                      size={25}
                      className={
                        ratingNumber <= selectedRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-slate-300"
                      }
                    />
                  </button>
                ))}
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="cook-review"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Review
                  </label>
                  <span className="text-xs text-slate-400">
                    {reviewComment.length}/500
                  </span>
                </div>
                <textarea
                  id="cook-review"
                  value={reviewComment}
                  onChange={(event) => {
                    setReviewComment(event.target.value);
                    setReviewError("");
                  }}
                  rows={4}
                  maxLength={500}
                  placeholder="Food quality, timing aur behaviour ke baare mein apna experience likho..."
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {reviewError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {reviewError}
                </div>
              )}

              <button
                type="submit"
                disabled={savingReview || selectedRating === 0}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white disabled:opacity-50"
              >
                {savingReview ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Submit Review
                  </>
                )}
              </button>
            </form>
          )}
        </section>

        <section className="mt-5">
          <h3 className="text-lg font-bold text-slate-900">Student Reviews</h3>

          {loadingReviews && (
            <div className="mt-3 space-y-3">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          )}

          {!loadingReviews && reviews.length === 0 && (
            <div className="mt-3 rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
              <Star size={29} className="mx-auto text-slate-300" />
              <h4 className="mt-3 font-bold text-slate-900">
                Abhi koi review nahi hai
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                Is cook ko review dene wale pehle student bano.
              </p>
            </div>
          )}

          {!loadingReviews && reviews.length > 0 && (
            <div className="mt-3 space-y-3">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    {review.userPhoto ? (
                      <img
                        src={review.userPhoto}
                        alt={review.userName || "User"}
                        className="h-11 w-11 rounded-full bg-slate-100 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                        {getInitial(review.userName)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate font-bold text-slate-900">
                            {review.userName || "CampusMart User"}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {formatReviewDate(review.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1">
                          <Star
                            size={14}
                            className="fill-yellow-400 text-yellow-400"
                          />
                          <span className="text-xs font-bold text-slate-800">
                            {Number(review.rating || 0)}
                          </span>
                        </div>
                      </div>

                      {review.comment && (
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {review.comment}
                        </p>
                      )}

                      {review.userId === currentUser?.uid && (
                        <span className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                          Your review
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleCall}
            disabled={!cook.phone}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-sm font-bold text-blue-700 disabled:opacity-50"
          >
            <Phone size={18} />
            Call
          </button>
          <button
            type="button"
            onClick={handleWhatsApp}
            disabled={!cook.whatsapp && !cook.phone}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-50"
          >
            <MessageCircle size={18} />
            WhatsApp
          </button>
        </div>
      </div>

      {undoReviewId && undoSecondsLeft > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-50 px-4">
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Review submitted</p>
              <p className="text-xs text-slate-300">
                Undo available for {undoSecondsLeft} second
                {undoSecondsLeft === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleUndoReview}
              disabled={undoingReview}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-bold text-slate-900 disabled:opacity-60"
            >
              {undoingReview ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RotateCcw size={15} />
              )}
              Undo
            </button>

            <button
              type="button"
              onClick={clearUndoState}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:bg-white/10"
              aria-label="Close undo message"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-blue-600">{icon}</div>
      <p className="mt-3 text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold leading-5 text-slate-900">
        {value}
      </p>
    </div>
  );
}