import { Suspense } from "react";
import CalendarPageClient from "@/components/calendar/CalendarPageClient";

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarPageClient />
    </Suspense>
  );
}
