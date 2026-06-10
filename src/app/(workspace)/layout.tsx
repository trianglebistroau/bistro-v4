import Sidebar from "@/components/canvas/Sidebar";
import WorkspaceHelper from "@/components/creative/WorkspaceHelper";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-white text-[#1a1a1a]">
      <Sidebar />

      <WorkspaceHelper />
      <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
    </div>
  );
}
