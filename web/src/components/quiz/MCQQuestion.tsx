 import { motion } from 'framer-motion';
 import { QuizQuestion, QuizOption } from '@/types/quiz';
 
 interface MCQQuestionProps {
   question: QuizQuestion;
   onAnswer: (option: QuizOption) => void;
   selectedValue?: number | string;
 }
 
 export const MCQQuestion = ({ question, onAnswer, selectedValue }: MCQQuestionProps) => {
   return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       exit={{ opacity: 0, y: -20 }}
       className="w-full max-w-2xl mx-auto"
     >
       <h2 className="text-2xl md:text-3xl font-semibold text-center mb-8 text-foreground">
         {question.question}
       </h2>
       <div className="grid grid-cols-1 gap-3">
         {question.options?.map((option, index) => (
           <motion.button
             key={option.id}
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: index * 0.08 }}
             onClick={() => onAnswer(option)}
             className={`
               p-5 rounded-xl border-2 text-left transition-all duration-300 flex items-center gap-4
               ${selectedValue === option.value
                 ? 'border-primary bg-primary text-primary-foreground card-shadow-hover'
                 : 'border-border bg-card hover:border-primary/50 hover:card-shadow card-shadow'
               }
             `}
           >
             <span className={`
               w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0
               ${selectedValue === option.value
                 ? 'bg-primary-foreground/20 text-primary-foreground'
                 : 'bg-secondary text-secondary-foreground'
               }
             `}>
               {String.fromCharCode(65 + index)}
             </span>
             <span className="text-base font-medium">{option.text}</span>
           </motion.button>
         ))}
       </div>
     </motion.div>
   );
 };