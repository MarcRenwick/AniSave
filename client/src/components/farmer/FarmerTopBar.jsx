import { Bell, CircleUserRound } from "lucide-react";

export default function FarmerTopBar({ children }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-8 py-6">
      <div>{children}</div>

      <div className="flex items-center gap-3 rounded-full bg-[#2f8f66] py-1.5 pl-4 pr-1.5">
        <div className="relative">
          <Bell className="h-5 w-5 text-white" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
        </div>
        <CircleUserRound className="h-9 w-9 rounded-full bg-white text-[#2f8f66]" />
      </div>
    </div>
  );
}
