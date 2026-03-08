import { TopBar } from "@/components/TopBar";
import { ConversationFeed } from "@/components/ConversationFeed";
import { TaskQueue } from "@/components/TaskQueue";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-screen bg-background overflow-hidden"
    >
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
    </motion.div>
  );
};

export default Index;
