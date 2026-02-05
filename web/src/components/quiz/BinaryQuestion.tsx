 import { motion } from 'framer-motion';
 import { QuizQuestion, QuizOption } from '@/types/quiz';
 
 interface BinaryQuestionProps {
   question: QuizQuestion;
   onAnswer: (option: QuizOption) => void;
   selectedValue?: number | string;
 }
 
 export const BinaryQuestion = ({ question, onAnswer, selectedValue }: BinaryQuestionProps) => {
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
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {question.options?.map((option, index) => (
           <motion.button
             key={option.id}
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: index * 0.1 }}
             onClick={() => onAnswer(option)}
             className={`
               p-6 rounded-xl border-2 transition-all duration-300
               ${selectedValue === option.value
                 ? 'border-primary bg-primary text-primary-foreground card-shadow-hover'
                 : 'border-border bg-card hover:border-primary/50 hover:card-shadow card-shadow'
               }
             `}
           >
             <span className="text-lg font-medium">{option.text}</span>
           </motion.button>
         ))}
       </div>
     </motion.div>
   );
 };