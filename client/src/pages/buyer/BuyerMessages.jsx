import BuyerLayout from "../../layouts/BuyerLayout";
import ChatPanel from "../../components/chat/ChatPanel";

// The chats fill the page under the green bar, with no heading of their own
// above them - the panel's "Chats" says what it is. The height leaves room for
// the bar (4.25rem on a phone, 5.25rem from md up) and the padding around the panel.
export default function BuyerMessages() {
  return (
    <BuyerLayout>
      <h1 className="sr-only">Messages</h1>
      <div className="p-4 sm:p-6">
        <ChatPanel
          basePath="/buyer/messages"
          variant="chats"
          heightClass="h-[calc(100dvh-6.25rem)] min-h-[26rem] sm:h-[calc(100dvh-7.25rem)] md:h-[calc(100dvh-8.25rem)]"
        />
      </div>
    </BuyerLayout>
  );
}
