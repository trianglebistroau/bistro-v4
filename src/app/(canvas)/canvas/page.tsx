"use client";

import { useOnboardingStore } from "@/store/onboardingStore";
import CanvasCard from "@/components/canvas/CanvasCard";
import * as Sentry from "@sentry/nextjs";

const CARDS = [
  {
    title: "Inspiration Pools",
    counter: "1/2",
    description:
      "This is your space where you can upload your videos to get inspired",
    nextHref: "/inspiration",
  },
  {
    title: "Creativity Spaces",
    counter: "2/2",
    description:
      "This is your space where you can brainstorm your next cool ideas",
    nextHref: "/mind-map",
  },
] as const;

export default function CanvasPage() {
  const name = useOnboardingStore((s) => s.name);
  const displayName = name.trim() || "name not found";

  return (
    <div className="px-12 py-10">
      <h1 className="mb-10 text-[32px] font-bold tracking-tight">
        {displayName}&apos;s Canvas
      </h1>
      <div className="grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        {CARDS.map((c) => (
          <CanvasCard key={c.title} {...c} />
        ))}
      </div>

      {/* How to test Sentry error capturing   */}
      {/* <button
        type="button"
        onClick={() => {
          throw new Error("Sentry Test Error");
        }}
      >
        Break the world
      </button> */}
      
      {/* How to Log with Sentry */}
      {/* <button
        type="button"
        onClick={() => {
          Sentry.logger.info("User clicked Test Sentry Log button", { log_source: 'sentry_test' });
        }}
        className="bg-red-50"
      >
        Test Sentry Log
      </button> */}
    </div>
  );
}
