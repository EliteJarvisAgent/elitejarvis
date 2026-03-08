import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { ConversationFeed } from "@/components/ConversationFeed";
import { TaskQueue } from "@/components/TaskQueue";
import { ListTodo } from "lucide-react";

const Index = () => {
  const [showTasks, setShowTasks] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden relative">
        {/* Conversation Feed */}
        <div className="w-full lg:w-[60%] flex flex-col overflow-hidden">
          <ConversationFeed />
        </div>
        {/* Task Sidebar - Desktop */}
        <div className="hidden lg:flex lg:w-[40%] border-l border-border/40 flex-col overflow-hidden bg-card/30">
          <TaskQueue />
        </div>
        {/* Mobile Task Toggle */}
        <button
          onClick={() => setShowTasks(!showTasks)}
          className="lg:hidden fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
          style={{ boxShadow: "0 0 20px hsl(185 90% 48% / 0.3)" }}
        >
          <ListTodo className="h-5 w-5" />
        </button>
        {/* Mobile Task Panel */}
        {showTasks && (
          <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-primary font-semibold">Task Queue</span>
              <button onClick={() => setShowTasks(false)} className="text-muted-foreground hover:text-foreground text-sm">Close</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TaskQueue />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
