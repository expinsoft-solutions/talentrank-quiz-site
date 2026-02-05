 import { motion } from 'framer-motion';
 
 interface ProgressBarProps {
   current: number;
   total: number;
 }
 
 export const ProgressBar = ({ current, total }: ProgressBarProps) => {
   const progress = ((current + 1) / total) * 100;
 
   return (
     <div className="w-full max-w-2xl mx-auto mb-8">
       <div className="flex justify-between text-sm text-muted-foreground mb-2">
         <span>Question {current + 1} of {total}</span>
         <span>{Math.round(progress)}% Complete</span>
       </div>
       <div className="h-2 bg-secondary rounded-full overflow-hidden">
         <motion.div
           className="h-full quiz-gradient"
           initial={{ width: 0 }}
           animate={{ width: `${progress}%` }}
           transition={{ duration: 0.5, ease: 'easeOut' }}
         />
       </div>
     </div>
   );
 };