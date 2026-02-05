 import { motion } from 'framer-motion';
 import { QuizQuestion, QuizOption } from '@/types/quiz';
 
 interface LikertQuestionProps {
   question: QuizQuestion;
   onAnswer: (option: QuizOption) => void;
   selectedValue?: number | string;
 }
 
 export const LikertQuestion = ({ question, onAnswer, selectedValue }: LikertQuestionProps) => {
   return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       exit={{ opacity: 0, y: -20 }}
       className="w-full max-w-3xl mx-auto"
     >
       <h2 className="text-2xl md:text-3xl font-semibold text-center mb-10 text-foreground">
         {question.question}
       </h2>
       <div className="flex flex-col md:flex-row justify-center items-stretch gap-2 md:gap-3">
         {question.options?.map((option, index) => (
           <motion.button
             key={option.id}
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: index * 0.05 }}
             onClick={() => onAnswer(option)}
             className={`
               flex-1 p-4 md:p-6 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center min-h-[80px]
               ${selectedValue === option.value
                 ? 'border-primary bg-primary text-primary-foreground card-shadow-hover'
                 : 'border-border bg-card hover:border-primary/50 hover:card-shadow card-shadow'
               }
             `}
           >
             <span className="text-sm md:text-base font-medium text-center">{option.text}</span>
           </motion.button>
         ))}
       </div>
     </motion.div>
   );
 };