import BuyerLayout from "../../layouts/BuyerLayout";
import BuyerTopBar from "../../components/buyer/BuyerTopBar";
import ChatPanel from "../../components/chat/ChatPanel";

export default function BuyerMessages() {
  return (
    <BuyerLayout>
      <BuyerTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500">Chat with the farmers you buy from</p>
      </BuyerTopBar>
      <div className="p-8">
        <ChatPanel basePath="/buyer/messages" heightClass="h-[calc(100vh-16rem)] min-h-[26rem]" />
      </div>
    </BuyerLayout>
  );
}
