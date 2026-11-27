export function FeatureCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-md">
      <div className="text-3xl">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-white/60">{body}</p>
    </div>
  );
}

export function PricingCard({ name, price }: { name: string; price: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-8 shadow-2xl">
      <h3 className="text-xl font-semibold">{name}</h3>
      <p className="mt-2 text-4xl font-bold">{price}</p>
    </div>
  );
}

export function TestimonialCard({ quote }: { quote: string }) {
  return <blockquote className="rounded-3xl bg-white/5 p-6 shadow-xl">{quote}</blockquote>;
}
