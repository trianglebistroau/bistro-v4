import Sidebar from "@/components/canvas/Sidebar";

export default function CreativeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-white text-[#1a1a1a] font-sans">
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar />
      </div>
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
