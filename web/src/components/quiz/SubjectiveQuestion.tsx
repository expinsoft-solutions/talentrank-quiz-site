 "use client";

import { useState } from 'react';
 import { motion } from 'framer-motion';
 import { QuizQuestion } from '@/types/quiz';
 import { Textarea } from '@/components/ui/textarea';
 import { Button } from '@/components/ui/button';
 import { ArrowRight } from 'lucide-react';
 
 interface SubjectiveQuestionProps {
   question: QuizQuestion;
   onAnswer: (answer: string) => void;
   initialValue?: string;
   isLast: boolean;
 }
 
 export const SubjectiveQuestion = ({ question, onAnswer, initialValue = '', isLast }: SubjectiveQuestionProps) => {
   const [answer, setAnswer] = useState(initialValue);
 
   const handleSubmit = () => {
     if (answer.trim()) {
       onAnswer(answer);
     }
   };
 
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
       <Textarea
         value={answer}
         onChange={(e) => setAnswer(e.target.value)}
         placeholder="Share your thoughts..."
         className="min-h-[180px] text-base resize-none mb-6 border-2 focus:border-primary"
       />
       <div className="flex justify-end">
         <Button
           onClick={handleSubmit}
           disabled={!answer.trim()}
           size="lg"
           className="quiz-gradient border-0 text-primary-foreground gap-2"
         >
           {isLast ? 'Complete Assessment' : 'Next Question'}
           <ArrowRight className="w-4 h-4" />
         </Button>
       </div>
     </motion.div>
   );
 };