import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Logo from "../components/Logo";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

export default function Landing() {
  const stats = [
    { value: "1000+", label: "Students" },
    { value: "500+", label: "Products" },
    { value: "50+", label: "Colleges" },
    { value: "24/7", label: "Marketplace" },
  ];

  const categories = [
    { icon: "📚", title: "Books" },
    { icon: "💻", title: "Electronics" },
    { icon: "📱", title: "Mobiles" },
    { icon: "🚲", title: "Cycles" },
    { icon: "🛏️", title: "Hostel Items" },
    { icon: "👕", title: "Clothes" },
  ];

  const sampleProducts = [
    ["📚", "DSA Book", "₹250"],
    ["💻", "Laptop", "₹22,000"],
    ["🚲", "Cycle", "₹1,800"],
    ["📱", "iPhone", "₹38,000"],
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0 scale-[0.94] origin-left sm:scale-100">
            <Logo />
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Link to="/login">
              <Button
                variant="soft"
                className="min-h-0 rounded-xl px-3 py-2 text-sm sm:rounded-2xl sm:px-5 sm:py-3 sm:text-base"
              >
                Login
              </Button>
            </Link>

            <Link to="/login">
              <Button className="min-h-0 rounded-xl px-3 py-2 text-sm sm:rounded-2xl sm:px-5 sm:py-3 sm:text-base">
                <span className="sm:hidden">Start</span>
                <span className="hidden sm:inline">Get Started</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 sm:py-20 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
          >
            <span className="inline-flex max-w-full items-center rounded-full bg-blue-100 px-3 py-2 text-[13px] font-black text-blue-700 sm:px-4 sm:text-base">
              🚀 India&apos;s Campus Marketplace
            </span>

            <h1 className="mt-6 text-[52px] font-black leading-[0.95] tracking-[-0.045em] text-slate-950 dark:text-white sm:mt-8 sm:text-7xl lg:text-8xl">
              Buy.
              <br />
              Sell.
              <br />
              Exchange.
            </h1>

            <p className="mt-6 max-w-xl text-[17px] font-medium leading-7 text-slate-600 dark:text-slate-300 sm:mt-8 sm:text-xl sm:leading-9">
              CampusMart helps students buy and sell books, laptops,
              calculators, hostel items and much more inside their campus.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:flex sm:gap-5">
              <Link to="/login" className="w-full sm:w-auto">
                <Button className="w-full rounded-2xl px-4 py-3.5 text-sm sm:w-auto sm:px-8 sm:py-4 sm:text-base">
                  Start Selling
                </Button>
              </Link>

              <Link to="/login" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full rounded-2xl px-4 py-3.5 text-sm sm:w-auto sm:px-8 sm:py-4 sm:text-base"
                >
                  Explore
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="hidden lg:block"
          >
            <Card className="p-6 xl:p-8">
              <div className="grid grid-cols-2 gap-4 xl:gap-5">
                {sampleProducts.map((item) => (
                  <Card
                    key={item[1]}
                    className="p-5 text-center transition duration-300 hover:-translate-y-2"
                  >
                    <div className="mb-4 text-5xl xl:text-6xl">
                      {item[0]}
                    </div>

                    <h3 className="font-black">{item[1]}</h3>

                    <p className="mt-2 font-extrabold text-blue-600">
                      {item[2]}
                    </p>
                  </Card>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Mobile product preview */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="lg:hidden"
          >
            <div className="grid grid-cols-2 gap-3">
              {sampleProducts.map((item) => (
                <Card
                  key={item[1]}
                  className="rounded-[1.4rem] p-4 text-center"
                >
                  <div className="mb-2 text-4xl">{item[0]}</div>
                  <h3 className="text-sm font-black">{item[1]}</h3>
                  <p className="mt-1 text-sm font-black text-blue-600">
                    {item[2]}
                  </p>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
          {stats.map((item) => (
            <Card
              key={item.label}
              className="rounded-[1.4rem] p-4 text-center sm:p-6 lg:p-8"
            >
              <h2 className="text-2xl font-black text-blue-600 sm:text-4xl lg:text-5xl">
                {item.value}
              </h2>

              <p className="mt-1 text-xs font-bold text-slate-500 sm:mt-3 sm:text-base">
                {item.label}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-24">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-600">
            Explore
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
            Popular Categories
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3 sm:mt-14 md:grid-cols-3 md:gap-6 lg:grid-cols-6">
          {categories.map((item) => (
            <Card
              key={item.title}
              className="cursor-pointer rounded-[1.4rem] p-4 text-center transition duration-300 hover:-translate-y-2 sm:p-6 lg:p-8"
            >
              <div className="mb-2 text-3xl sm:mb-4 sm:text-5xl lg:text-6xl">
                {item.icon}
              </div>

              <h3 className="text-xs font-black leading-tight sm:text-base">
                {item.title}
              </h3>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-24">
        <Card className="rounded-[2rem] bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-10 text-center text-white sm:p-16">
          <h2 className="text-3xl font-black sm:text-5xl">
            Ready to Start?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-6 opacity-90 sm:mt-6 sm:text-xl">
            Join thousands of students already using CampusMart.
          </p>

          <Link to="/login">
            <Button
              variant="white"
              className="mt-7 rounded-2xl px-7 py-3.5 font-black sm:mt-10 sm:px-9 sm:py-4"
            >
              Join CampusMart
            </Button>
          </Link>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-4 py-6 text-center text-xs font-semibold text-slate-500 dark:border-slate-800 sm:py-8 sm:text-base">
        © 2026 CampusMart • Built with ❤️ for Students
      </footer>
    </div>
  );
}