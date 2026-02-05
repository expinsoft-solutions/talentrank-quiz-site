 import { useState, useCallback } from 'react';
 import { QuizState, QuizAnswer, MBTIResult, QuizOption } from '@/types/quiz';
 import { quizQuestions, subjectiveQuestions } from '@/data/quizQuestions';
 
 const initialState: QuizState = {
   currentQuestionIndex: 0,
   answers: [],
   isComplete: false,
   phase: 'welcome',
 };
 
 export const useQuiz = () => {
   const [state, setState] = useState<QuizState>(initialState);
   const [subjectiveIndex, setSubjectiveIndex] = useState(0);
   const [subjectiveAnswers, setSubjectiveAnswers] = useState<string[]>([]);
 
   const currentQuestion = quizQuestions[state.currentQuestionIndex];
   const currentSubjectiveQuestion = subjectiveQuestions[subjectiveIndex];
   const totalQuestions = quizQuestions.length;
 
   const startQuiz = useCallback(() => {
     setState(prev => ({ ...prev, phase: 'quiz' }));
   }, []);
 
   const answerQuestion = useCallback((option: QuizOption) => {
     const answer: QuizAnswer = {
       questionId: currentQuestion.id,
       value: option.value,
     };
 
     setState(prev => {
       const newAnswers = [...prev.answers.filter(a => a.questionId !== currentQuestion.id), answer];
       const isLastQuestion = prev.currentQuestionIndex >= quizQuestions.length - 1;
 
       // Auto-advance after short delay
       setTimeout(() => {
         if (isLastQuestion) {
           setState(s => ({ ...s, phase: 'subjective' }));
         } else {
           setState(s => ({ ...s, currentQuestionIndex: s.currentQuestionIndex + 1 }));
         }
       }, 400);
 
       return { ...prev, answers: newAnswers };
     });
   }, [currentQuestion]);
 
   const answerSubjective = useCallback((answer: string) => {
     setSubjectiveAnswers(prev => [...prev, answer]);
 
     if (subjectiveIndex >= subjectiveQuestions.length - 1) {
       setState(prev => ({ ...prev, phase: 'results', isComplete: true }));
     } else {
       setSubjectiveIndex(prev => prev + 1);
     }
   }, [subjectiveIndex]);
 
   const calculateResult = useCallback((): MBTIResult => {
     const scores = { EI: 0, SN: 0, TF: 0, JP: 0 };
 
     state.answers.forEach(answer => {
       const question = quizQuestions.find(q => q.id === answer.questionId);
       if (question?.dimension && typeof answer.value === 'number') {
         scores[question.dimension] += answer.value;
       }
     });
 
     const type = [
       scores.EI > 0 ? 'E' : 'I',
       scores.SN > 0 ? 'N' : 'S',
       scores.TF > 0 ? 'T' : 'F',
       scores.JP > 0 ? 'P' : 'J',
     ].join('');
 
     return { type, scores };
   }, [state.answers]);
 
   const restart = useCallback(() => {
     setState(initialState);
     setSubjectiveIndex(0);
     setSubjectiveAnswers([]);
   }, []);
 
   const getCurrentAnswer = useCallback(() => {
     const answer = state.answers.find(a => a.questionId === currentQuestion?.id);
     return answer?.value;
   }, [state.answers, currentQuestion]);
 
   return {
     state,
     currentQuestion,
     currentSubjectiveQuestion,
     totalQuestions,
     subjectiveIndex,
     totalSubjectiveQuestions: subjectiveQuestions.length,
     startQuiz,
     answerQuestion,
     answerSubjective,
     calculateResult,
     restart,
     getCurrentAnswer,
   };
 };