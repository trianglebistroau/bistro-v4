import Link from "next/link";

type CanvasCardProps = {
  title: string;
  counter: string;
  description: string;
  nextHref: string;
};

export default function CanvasCard({
  title,
  counter,
  description,
  nextHref,
}: CanvasCardProps) {
  return (
    <Link
      href={nextHref}
      className="group flex flex-col gap-3 rounded-3xl outline-none transition-transform hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#3b7cf4]"
    >
      <div
        className="h-72 rounded-3xl bg-[#e5e7eb] transition-colors group-hover:bg-[#dcdfe5]"
        aria-hidden="true"
      />
      <div className="rounded-2xl bg-[#eef0f6] px-6 py-5">
        <div className="mb-3 flex items-start justify-between">
          <h2 className="text-[18px] font-bold text-[#1a1a1a]">{title}</h2>
          <span className="text-[14px] text-[#52596b]">{counter}</span>
        </div>
        <p className="text-[14px] leading-[1.5] text-[#52596b]">
          {description}
        </p>
        <div className="mt-3 flex justify-end">
          <span className="rounded-full bg-[#e5e7eb] px-5 py-1.5 text-[14px] font-semibold text-[#1a1a1a] transition-colors group-hover:bg-[#d1d5db]">
            Next
          </span>
        </div>
      </div>
    </Link>
  );
}
