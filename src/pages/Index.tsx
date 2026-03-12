import { TopBar } from "@/components/TopBar";
import { ConversationFeed } from "@/components/ConversationFeed";
import { TaskQueue } from "@/components/TaskQueue";

const Index = () => {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <TopBar />
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {/* Conversation Feed */}
        <div className="w-full lg:w-[60%] flex flex-col overflow-hidden">
          <ConversationFeed />
        </div>
        {/* Task Sidebar - Desktop */}
        <div className="hidden lg:flex lg:w-[40%] border-l border-border/40 flex-col overflow-hidden bg-card/30">
          <TaskQueue />
        </div>
      </div>
    </div>
  );
};

export default Index;
