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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">

      {/* Navbar */}

      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-5">

          <Logo />

          <div className="flex gap-4">
            <Link to="/login">
              <Button variant="soft">
                Login
              </Button>
            </Link>

            <Link to="/login">
              <Button>
                Get Started
              </Button>
            </Link>

          </div>

        </div>
      </nav>

      {/* Hero */}

      <section className="max-w-7xl mx-auto px-6 py-24">

        <div className="grid lg:grid-cols-2 gap-16 items-center">

          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
          >

            <span className="inline-block px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-bold">
              🚀 India's Campus Marketplace
            </span>

            <h1 className="text-6xl font-black leading-tight mt-8">
              Buy.
              <br />
              Sell.
              <br />
              Exchange.
            </h1>

            <p className="text-slate-600 dark:text-slate-300 text-xl mt-8 max-w-xl leading-9">
              CampusMart helps students buy and sell books, laptops,
              calculators, hostel items and much more inside their campus.
            </p>

            <div className="flex gap-5 mt-10">

              <Link to="/login">
                <Button className="px-8">
                  Start Selling
                </Button>
              </Link>

              <Button variant="outline">
                Explore
              </Button>

            </div>

          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: .9 }}
            animate={{ opacity: 1, scale: 1 }}
          >

            <Card className="p-8">

              <div className="grid grid-cols-2 gap-5">

                {[
                  ["📚","DSA Book","₹250"],
                  ["💻","Laptop","₹22000"],
                  ["🚲","Cycle","₹1800"],
                  ["📱","iPhone","₹38000"]
                ].map((item,i)=>(

                  <Card key={i} className="p-6 text-center hover:-translate-y-2">

                    <div className="text-6xl mb-4">
                      {item[0]}
                    </div>

                    <h3 className="font-bold">
                      {item[1]}
                    </h3>

                    <p className="text-blue-600 font-extrabold mt-2">
                      {item[2]}
                    </p>

                  </Card>

                ))}

              </div>

            </Card>

          </motion.div>

        </div>

      </section>

      {/* Stats */}

      <section className="max-w-7xl mx-auto px-6">

        <div className="grid md:grid-cols-4 gap-6">

          {stats.map((item)=>(

            <Card
              key={item.label}
              className="p-8 text-center"
            >

              <h2 className="text-5xl font-black text-blue-600">
                {item.value}
              </h2>

              <p className="text-slate-500 mt-3">
                {item.label}
              </p>

            </Card>

          ))}

        </div>

      </section>

      {/* Categories */}

      <section className="max-w-7xl mx-auto px-6 py-24">

        <h2 className="text-5xl font-black text-center">
          Popular Categories
        </h2>

        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6 mt-14">

          {categories.map((item)=>(

            <Card
              key={item.title}
              className="p-8 text-center hover:-translate-y-2 cursor-pointer"
            >

              <div className="text-6xl mb-4">
                {item.icon}
              </div>

              <h3 className="font-bold">
                {item.title}
              </h3>

            </Card>

          ))}

        </div>

      </section>

      {/* CTA */}

      <section className="max-w-6xl mx-auto px-6 pb-24">

        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-16 text-center">

          <h2 className="text-5xl font-black">
            Ready to Start?
          </h2>

          <p className="mt-6 text-xl opacity-90">
            Join thousands of students already using CampusMart.
          </p>

          <Link to="/login">

            <Button
              className="mt-10 bg-white text-blue-600 hover:bg-slate-100"
            >
              Join CampusMart
            </Button>

          </Link>

        </Card>

      </section>

      {/* Footer */}

      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 text-center text-slate-500">

        © 2026 CampusMart • Built with ❤️ for Students

      </footer>

    </div>
  );
}