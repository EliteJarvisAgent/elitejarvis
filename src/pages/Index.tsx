import { TopBar } from "@/components/TopBar";
import { ConversationFeed } from "@/components/ConversationFeed";
import { TaskQueue } from "@/components/TaskQueue";
import { SubAgentPanel } from "@/components/SubAgentPanel";

const Index = () => {
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Conversation Feed - Left */}
        <div className="w-full lg:w-[40%] border-r border-border/50 flex flex-col overflow-hidden">
          <ConversationFeed />
        </div>

        {/* Task Queue - Center */}
        <div className="hidden md:flex md:w-[60%] lg:w-[35%] border-r border-border/50 flex-col overflow-hidden">
          <TaskQueue />
        </div>

        {/* Sub-Agent Panel - Right */}
        <div className="hidden lg:flex lg:w-[25%] flex-col overflow-hidden">
          <SubAgentPanel />
        </div>
      </div>
    </div>
  );
};

export default Index;
