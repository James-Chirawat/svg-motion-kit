import { Sparkles, ArrowRight } from "lucide-react";
import { FeatureCard } from "../components/FeatureCard";

// Deliberately generic: this example exists so design-lint has something to catch.
export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute -top-40 left-1/2 h-96 w-96 rounded-full bg-purple-500/30 blur-3xl" />
      <div className="absolute top-20 right-0 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />

      <section className="hero-glow mx-auto max-w-4xl px-6 py-32 text-center">
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-sm">✨ New: AI-powered workflows</span>
        <h1 className="mt-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-6xl font-bold text-transparent">
          Supercharge your productivity
        </h1>
        <p className="mt-6 text-lg text-white/70">Unlock the power of AI with our seamless, all-in-one platform. Get started in seconds.</p>
        <button className="mt-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 shadow-lg shadow-purple-500/50">
          <Sparkles className="h-4 w-4" /> Get started <ArrowRight className="h-4 w-4" />
        </button>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-32 md:grid-cols-3">
        <FeatureCard icon="🚀" title="Lightning fast" body="Effortlessly ship features at next-gen speed." />
        <FeatureCard icon="🤖" title="AI assistant" body="A cutting-edge copilot for every task." />
        <FeatureCard icon="🔒" title="Secure by default" body="Enterprise-grade security, built in." />
      </section>
    </main>
  );
}
