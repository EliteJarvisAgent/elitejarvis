import { TopBar } from "@/components/TopBar";
import { ConversationFeed } from "@/components/ConversationFeed";
import { TaskQueue } from "@/components/TaskQueue";

const Index = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation Feed - Left 60% */}
        <div className="w-full lg:w-[60%] flex flex-col overflow-hidden">
          <ConversationFeed />
        </div>
        {/* Task Sidebar - Right 40% */}
        <div className="hidden lg:flex lg:w-[40%] border-l border-border/40 flex-col overflow-hidden bg-card/30">
          <TaskQueue />
        </div>
      </div>
    </div>
  );
};

export default Index;
