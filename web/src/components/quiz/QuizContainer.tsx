"use client";

import { AnimatePresence } from 'framer-motion';
import { useQuiz } from '@/hooks/useQuiz';
 import { WelcomeScreen } from './WelcomeScreen';
 import { ProgressBar } from './ProgressBar';
 import { BinaryQuestion } from './BinaryQuestion';
 import { MCQQuestion } from './MCQQuestion';
 import { LikertQuestion } from './LikertQuestion';
 import { SubjectiveQuestion } from './SubjectiveQuestion';
 import { ResultsScreen } from './ResultsScreen';
 import { motion } from 'framer-motion';
 
 export const QuizContainer = () => {
   const {
     state,
     currentQuestion,
     currentSubjectiveQuestion,
     totalQuestions,
     subjectiveIndex,
     totalSubjectiveQuestions,
     startQuiz,
     answerQuestion,
     answerSubjective,
     calculateResult,
     restart,
     getCurrentAnswer,
   } = useQuiz();
 
   if (state.phase === 'welcome') {
     return <WelcomeScreen onStart={startQuiz} />;
   }
 
   if (state.phase === 'results') {
     const result = calculateResult();
     return <ResultsScreen result={result} onRestart={restart} />;
   }
 
   if (state.phase === 'subjective') {
     return (
       <div className="min-h-screen flex flex-col px-4 py-8">
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="text-center mb-8"
         >
           <h3 className="text-sm font-medium text-primary mb-2">PERSONALIZED ASSESSMENT</h3>
           <p className="text-muted-foreground">
             Question {subjectiveIndex + 1} of {totalSubjectiveQuestions}
           </p>
         </motion.div>
         
         <div className="flex-1 flex items-center justify-center">
           <AnimatePresence mode="wait">
             <SubjectiveQuestion
               key={currentSubjectiveQuestion.id}
               question={currentSubjectiveQuestion}
               onAnswer={answerSubjective}
               isLast={subjectiveIndex >= totalSubjectiveQuestions - 1}
             />
           </AnimatePresence>
         </div>
       </div>
     );
   }
 
  if (!currentQuestion) {
    return null;
  }

  const selectedValue = getCurrentAnswer();

  return (
    <div className="min-h-screen flex flex-col px-4 py-8">
      <ProgressBar current={state.currentQuestionIndex} total={totalQuestions} />
      
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {currentQuestion.type === 'binary' && (
            <BinaryQuestion
              key={currentQuestion.id}
              question={currentQuestion}
              onAnswer={answerQuestion}
              selectedValue={selectedValue}
            />
          )}
          {currentQuestion.type === 'mcq' && (
            <MCQQuestion
              key={currentQuestion.id}
              question={currentQuestion}
              onAnswer={answerQuestion}
              selectedValue={selectedValue}
            />
          )}
          {currentQuestion.type === 'likert' && (
            <LikertQuestion
              key={currentQuestion.id}
              question={currentQuestion}
              onAnswer={answerQuestion}
              selectedValue={selectedValue}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
 };