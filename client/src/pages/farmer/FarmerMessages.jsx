import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import ChatPanel from "../../components/chat/ChatPanel";

export default function FarmerMessages() {
  return (
    <FarmerLayout>
      <FarmerTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500">Reply to buyers asking about your products</p>
      </FarmerTopBar>
      <div className="p-8">
        <ChatPanel basePath="/farmer/messages" heightClass="h-[calc(100vh-11rem)] min-h-[26rem]" />
      </div>
    </FarmerLayout>
  );
}
