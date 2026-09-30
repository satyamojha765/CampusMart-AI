import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  addDoc,
  collection,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Avatar from "../components/ui/Avatar";
import RecommendationCard from "../components/RecommendationCard";

export default function ProductDetails({ onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedImage, setSelectedImage] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [touchStart, setTouchStart] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const [showReportBox, setShowReportBox] = useState(false);
  const [reportReason, setReportReason] = useState("Fake product");
  const [reportText, setReportText] = useState("");
  const [reporting, setReporting] = useState(false);

  const reportRef = useRef(null);

  const gallery = useMemo(() => {
    if (!product) return [];
    if (product.images?.length > 0) return product.images;
    if (product.image) return [product.image];
    return [];
  }, [product]);

  useEffect(() => {
    if (!gallery.length) return;

    gallery.forEach((imageUrl) => {
      if (!imageUrl) return;

      const image = new Image();
      image.src = imageUrl;
    });
  }, [gallery]);

  const changeImage = useCallback(
    (index) => {
      if (!gallery.length) return;
      const safeIndex = (index + gallery.length) % gallery.length;
      setSelectedIndex(safeIndex);
      setSelectedImage(gallery[safeIndex]);
      setZoom(1);
      setPosition({ x: 50, y: 50 });
      setImageLoaded(false);
    },
    [gallery]
  );

  const nextImage = useCallback(() => {
    changeImage(selectedIndex + 1);
  }, [changeImage, selectedIndex]);

  const prevImage = useCallback(() => {
    changeImage(selectedIndex - 1);
  }, [changeImage, selectedIndex]);

  function toggleReportBox() {
    setShowReportBox((prev) => {
      const next = !prev;

      if (!prev) {
        setTimeout(() => {
          reportRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 120);
      }

      return next;
    });
  }

  function handleWheel(e) {
    e.preventDefault();
    e.stopPropagation();

    setZoom((prev) => {
      let next = prev + (e.deltaY < 0 ? 0.2 : -0.2);
      if (next < 1) next = 1;
      if (next > 3) next = 3;
      return Number(next.toFixed(1));
    });
  }

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosition({ x, y });
  }

  function handleTouchStart(e) {
    setTouchStart(e.touches[0].clientX);
  }

  function handleTouchEnd(e) {
    if (touchStart === null) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) nextImage();
      else prevImage();
    }

    setTouchStart(null);
  }

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "Escape") setIsFullscreen(false);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [nextImage, prevImage]);

  useEffect(() => {
    if (isFullscreen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  useEffect(() => {
    async function loadProduct() {
      try {
        const productRef = doc(db, "products", id);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const productData = {
            id: productSnap.id,
            ...productSnap.data(),
          };

          if (currentUser) {
            try {
              const viewId = `${currentUser.uid}_${id}`;
              const viewRef = doc(db, "productViews", viewId);
              const viewSnap = await getDoc(viewRef);

              if (!viewSnap.exists()) {
                await setDoc(viewRef, {
                  userId: currentUser.uid,
                  productId: id,
                  userName: currentUser.displayName || "CampusMart User",
                  userEmail: currentUser.email || "",
                  createdAt: serverTimestamp(),
                });

                await updateDoc(productRef, {
                  views: increment(1),
                });

                productData.views = (productData.views || 0) + 1;
              }
            } catch (viewError) {
              console.log("View count skipped:", viewError.message);
            }
          }

          setProduct(productData);

          const productGallery =
            productData.images?.length > 0
              ? productData.images
              : productData.image
              ? [productData.image]
              : [];

          setSelectedImage(productGallery[0] || "");
          setSelectedIndex(0);

          if (productData.ownerId) {
            const sellerSnap = await getDoc(
              doc(db, "users", productData.ownerId)
            );
            if (sellerSnap.exists()) setSeller(sellerSnap.data());
          }

          const allSnap = await getDocs(collection(db, "products"));
          const allProducts = allSnap.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

          const currentPrice = Number(productData.price) || 0;

          const recommended = allProducts
            .filter((item) => item.id !== productData.id)
            .map((item) => {
              let score = 0;
              const price = Number(item.price) || 0;

              if (item.category === productData.category) score += 4;
              if (item.city === productData.city) score += 2;
              if (Math.abs(price - currentPrice) <= 1000) score += 2;
              if (item.ownerId !== productData.ownerId) score += 1;

              return { ...item, score };
            })
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);

          setRecommendations(recommended);
        }
      } catch (error) {
        alert(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id, currentUser]);

  async function startChat() {
    if (!currentUser || !product) return;
    if (!product.ownerId) return alert("Seller not found");

    if (currentUser.uid === product.ownerId) {
      alert("You cannot chat with yourself");
      return;
    }

    const chatId = [currentUser.uid, product.ownerId, product.id]
      .sort()
      .join("_");

    await setDoc(
      doc(db, "chats", chatId),
      {
        chatId,
        productId: product.id,
        productName: product.name,
        productImage: product.image || selectedImage || "",
        buyerId: currentUser.uid,
        sellerId: product.ownerId,
        participants: [currentUser.uid, product.ownerId],
        lastMessage: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await addDoc(collection(db, "notifications"), {
      userId: product.ownerId,
      type: "chat",
      icon: "💬",
      title: "New chat request",
      message: `${
        currentUser.displayName || "A student"
      } started a chat about "${product.name}".`,
      productId: product.id,
      chatId,
      read: false,
      createdAt: serverTimestamp(),
    });

    navigate(`/chat/${chatId}`);
  }

  async function submitReport() {
    if (!currentUser || !product) return;

    if (currentUser.uid === product.ownerId) {
      alert("You cannot report your own product");
      return;
    }

    try {
      setReporting(true);

      await addDoc(collection(db, "reports"), {
        productId: product.id,
        productName: product.name,
        productOwnerId: product.ownerId || "",
        reporterId: currentUser.uid,
        reporterName: currentUser.displayName || "CampusMart User",
        reason: reportReason,
        details: reportText,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      alert("Report submitted successfully");
      setShowReportBox(false);
      setReportText("");
    } catch (error) {
      alert(error.message);
    } finally {
      setReporting(false);
    }
  }

  async function shareProduct() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Product link copied");
    } catch {
      alert(window.location.href);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-white">
        <Navbar onLogout={onLogout} />
        <div className="px-4 pt-8">
          <div className="mx-auto max-w-5xl animate-pulse">
            <div className="h-10 w-28 rounded-full bg-slate-200 dark:bg-slate-800 mb-5" />
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="h-[360px] sm:h-[520px] rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-4">
                <div className="h-8 w-3/4 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-12 w-1/2 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-32 rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
                <div className="h-40 rounded-[2rem] bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-white">
        <Navbar onLogout={onLogout} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <Button variant="soft" onClick={() => navigate("/home")}>
            ← Back
          </Button>

          <Card className="p-8 sm:p-10 text-center mt-6 rounded-[2rem]">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-2xl font-extrabold">Product not found</h2>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-white pb-28 lg:pb-0">
      <Navbar onLogout={onLogout} />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-7 lg:py-10">
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-sm font-bold shadow-sm active:scale-95 transition"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={shareProduct}
            className="inline-flex lg:hidden items-center gap-2 rounded-full bg-blue-600 text-white px-4 py-2.5 text-sm font-bold shadow-sm active:scale-95 transition"
          >
            🔗 Share
          </button>
        </div>

        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-5 lg:gap-8 items-start">
          <Card className="p-2.5 sm:p-4 lg:p-5 rounded-[2rem] sm:rounded-[2.3rem] border border-white/70 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="relative flex gap-4">
              {gallery.length > 1 && (
                <div className="hidden md:flex flex-col gap-3 w-20 max-h-[540px] overflow-y-auto pr-1">
                  {gallery.map((img, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => changeImage(index)}
                      className={`h-20 w-20 shrink-0 rounded-2xl overflow-hidden border-2 bg-white dark:bg-slate-900 shadow-sm transition hover:scale-105 ${
                        selectedIndex === index
                          ? "border-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/40"
                          : "border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`product-${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div
                onWheel={handleWheel}
                style={{ overscrollBehavior: "contain" }}
                onMouseMove={handleMouseMove}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseLeave={() => {
                  setZoom(1);
                  setPosition({ x: 50, y: 50 });
                }}
                className="group relative flex-1 h-[360px] xs:h-[390px] sm:h-[520px] lg:h-[560px] rounded-[1.8rem] sm:rounded-[2rem] bg-gradient-to-br from-slate-100 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-inner"
              >
                {selectedImage ? (
                  <>
                    {!imageLoaded && (
                      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800" />
                    )}

                    <img
                      src={selectedImage}
                      alt={product.name}
                      className={`max-w-full max-h-full object-contain p-4 sm:p-6 transition-all duration-700 ease-out cursor-zoom-in ${
                        imageLoaded
                          ? "opacity-100 scale-100 blur-0 rotate-0"
                          : "opacity-0 scale-95 blur-md rotate-1"
                      }`}
                      onLoad={() => setImageLoaded(true)}
                      onDoubleClick={() => setZoom((z) => (z === 1 ? 2.5 : 1))}
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: `${position.x}% ${position.y}%`,
                      }}
                      draggable="false"
                    />
                  </>
                ) : (
                  <div className="text-8xl sm:text-9xl">
                    {product.icon || "📦"}
                  </div>
                )}

                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 px-3 sm:px-4 py-2 rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl shadow text-xs sm:text-sm font-extrabold">
                  {product.category || "CampusMart"}
                </div>

                <button
                  type="button"
                  onClick={() => setIsFullscreen(true)}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-lg font-bold active:scale-95 hover:scale-110 transition"
                  title="Fullscreen"
                >
                  ⛶
                </button>

                {gallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevImage}
                      className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-xl font-black text-2xl opacity-100 md:opacity-0 md:group-hover:opacity-100 transition active:scale-95 hover:scale-110"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={nextImage}
                      className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-xl font-black text-2xl opacity-100 md:opacity-0 md:group-hover:opacity-100 transition active:scale-95 hover:scale-110"
                    >
                      ›
                    </button>

                    <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 px-3 sm:px-4 py-2 rounded-full bg-black/75 text-white text-xs sm:text-sm font-bold backdrop-blur">
                      {selectedIndex + 1} / {gallery.length}
                    </div>
                  </>
                )}

                <div className="absolute bottom-3 left-3 sm:hidden px-3 py-2 rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  Swipe photos
                </div>
              </div>
            </div>

            {gallery.length > 1 && (
              <div className="md:hidden flex gap-2.5 mt-3 overflow-x-auto pb-1 px-1">
                {gallery.map((img, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => changeImage(index)}
                    className={`h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl overflow-hidden border-2 transition ${
                      selectedIndex === index
                        ? "border-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/40"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`product-${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <p className="hidden sm:block mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Hover image to zoom • Use mouse wheel for zoom • Press ← → keys
            </p>
          </Card>

          <section className="space-y-4 sm:space-y-5">
            <div className="rounded-[2rem] sm:rounded-[2.3rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm p-4 sm:p-6 lg:p-7">
              <div className="flex gap-2.5 flex-wrap mb-4">
                <Badge variant="blue">{product.category || "Product"}</Badge>
                <Badge variant="green">Available</Badge>
                <Badge variant="yellow">Recently Added</Badge>
                <Badge variant="gray">👁 {product.views || 0}</Badge>
                {gallery.length > 1 && (
                  <Badge variant="gray">{gallery.length} Photos</Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                {product.name}
              </h1>

              <div className="mt-4 flex items-end justify-between gap-3">
                <h2 className="text-3xl sm:text-5xl font-black text-blue-600">
                  ₹{product.price}
                </h2>

                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap">
                  👁 {product.views || 0} Views
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6">
                <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 sm:p-5">
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold">
                    Location
                  </p>
                  <h3 className="font-black mt-1 text-sm sm:text-base">
                    📍 {product.city || "Campus Area"}
                  </h3>
                </div>

                <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 sm:p-5">
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-semibold">
                    Condition
                  </p>
                  <h3 className="font-black mt-1 text-sm sm:text-base">Good</h3>
                </div>
              </div>

              <div className="hidden lg:grid grid-cols-3 gap-3 mt-6">
                <Button variant="dark" onClick={startChat}>
                  💬 Chat Seller
                </Button>

                <Button variant="soft" onClick={shareProduct}>
                  🔗 Share
                </Button>

                <Button variant="danger" onClick={toggleReportBox}>
                  🚩 Report
                </Button>
              </div>
            </div>

            <Card className="p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl sm:text-2xl font-black mb-3">
                Description
              </h3>
              <p className="text-slate-600 dark:text-slate-300 leading-7 sm:leading-8 text-sm sm:text-base">
                {product.description || "No description added by seller."}
              </p>
            </Card>

            <Card className="p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h3 className="text-xl sm:text-2xl font-black">Seller Info</h3>
                <Badge variant={seller?.verified ? "green" : "gray"}>
                  {seller?.verified ? "Verified" : "Not Verified"}
                </Badge>
              </div>

              <div className="flex items-center gap-4 sm:gap-5">
                <Avatar
                  src={
                    seller?.profilePhoto ||
                    seller?.photoURL ||
                    seller?.profileImage ||
                    seller?.imageUrl ||
                    seller?.photo ||
                    currentUser?.photoURL ||
                    ""
                  }
                  name={seller?.name || product.ownerName}
                  size="md"
                />

                <div className="min-w-0">
                  <h4 className="text-lg sm:text-xl font-black truncate">
                    {seller?.name || product.ownerName || "CampusMart User"}
                  </h4>

                  <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base truncate">
                    {seller?.college || product.ownerEmail || "Student Seller"}
                  </p>

                  <div className="flex gap-2 mt-2 flex-wrap">
                    {seller?.course && <Badge variant="blue">{seller.course}</Badge>}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Button variant="dark" onClick={startChat} className="w-full">
                  💬 Chat
                </Button>

                <p className="text-center text-[11px] sm:text-xs leading-5 text-slate-500 dark:text-slate-400">
                  ⚠️ <span className="font-semibold">Privacy Notice:</span>{" "}
                  CampusMart is not responsible if users voluntarily share
                  personal information through chat.
                </p>
              </div>
            </Card>

            <div className="hidden sm:grid lg:hidden grid-cols-2 gap-4">
              <Button variant="soft" onClick={shareProduct}>
                🔗 Share
              </Button>

              <Button variant="danger" onClick={toggleReportBox}>
                🚩 Report
              </Button>
            </div>

            {showReportBox && (
              <div ref={reportRef}>
                <Card className="p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.3rem] border border-red-100 dark:border-red-900/40 shadow-sm">
                  <h3 className="text-xl sm:text-2xl font-black mb-4">
                    Report Product
                  </h3>

                  <div className="space-y-4">
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      <option>Fake product</option>
                      <option>Wrong price</option>
                      <option>Spam listing</option>
                      <option>Offensive content</option>
                      <option>Seller suspicious</option>
                      <option>Other</option>
                    </select>

                    <textarea
                      value={reportText}
                      onChange={(e) => setReportText(e.target.value)}
                      placeholder="Write additional details..."
                      className="w-full h-28 px-4 py-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />

                    <Button
                      variant="danger"
                      className="w-full"
                      onClick={submitReport}
                      disabled={reporting}
                    >
                      {reporting ? "Submitting..." : "Submit Report"}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </section>
        </div>

        {recommendations.length > 0 && (
          <section className="mt-10 sm:mt-14">
            <div className="mb-5 sm:mb-6 px-1">
              <p className="text-blue-600 font-black text-sm">Recommended</p>
              <h2 className="text-2xl sm:text-3xl font-black">
                You may also like
              </h2>
            </div>

            <div className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 px-1">
              {recommendations.map((item) => (
                <RecommendationCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden px-3 pb-3 pt-4 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/95 to-transparent dark:from-slate-950 dark:via-slate-950/95">
        <div className="mx-auto max-w-lg rounded-[1.7rem] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-[0_-10px_35px_rgba(15,23,42,0.16)] p-2.5">
          <div className="grid grid-cols-[1fr_52px_52px] gap-2">
            <button
              type="button"
              onClick={startChat}
              className="rounded-2xl bg-blue-600 text-white py-3.5 font-black shadow-md active:scale-[0.98] transition"
            >
              💬 Chat Seller
            </button>

            <button
              type="button"
              onClick={shareProduct}
              className="rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xl active:scale-95 transition"
              aria-label="Share"
            >
              🔗
            </button>

            <button
              type="button"
              onClick={toggleReportBox}
              className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 text-xl active:scale-95 transition"
              aria-label="Report"
            >
              🚩
            </button>
          </div>
        </div>
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-black/95 text-white flex items-center justify-center p-3 sm:p-4">
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-white/10 hover:bg-white/20 text-3xl font-bold active:scale-95 transition"
          >
            ×
          </button>

          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/10 hover:bg-white/20 text-4xl font-bold active:scale-95 transition"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={nextImage}
                className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/10 hover:bg-white/20 text-4xl font-bold active:scale-95 transition"
              >
                ›
              </button>
            </>
          )}

          <img
            src={selectedImage}
            alt={product.name}
            className="max-w-full max-h-[86vh] sm:max-h-[88vh] object-contain"
            draggable="false"
          />

          {gallery.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-white/10 text-white font-bold backdrop-blur">
              {selectedIndex + 1} / {gallery.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}