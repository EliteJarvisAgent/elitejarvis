import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { ConversationFeed } from "@/components/ConversationFeed";
import { TaskQueue } from "@/components/TaskQueue";
import { ListTodo } from "lucide-react";

const Index = () => {
  const [showTasks, setShowTasks] = useState(false);

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
        {/* Mobile Task Toggle */}
        <button
          onClick={() => setShowTasks(!showTasks)}
          className="lg:hidden fixed top-16 right-3 z-50 h-9 w-9 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground flex items-center justify-center shadow-md"
        >
          <ListTodo className="h-4 w-4" />
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
