 export type QuestionType = 'binary' | 'mcq' | 'likert' | 'subjective';
 
 export interface QuizOption {
   id: string;
   text: string;
   value: number;
 }
 
 export interface QuizQuestion {
   id: string;
   type: QuestionType;
   question: string;
   options?: QuizOption[];
   dimension?: 'EI' | 'SN' | 'TF' | 'JP';
 }
 
 export interface QuizAnswer {
   questionId: string;
   value: number | string;
 }
 
 export interface QuizState {
   currentQuestionIndex: number;
   answers: QuizAnswer[];
   isComplete: boolean;
   phase: 'welcome' | 'quiz' | 'subjective' | 'results';
 }
 
 export interface MBTIResult {
   type: string;
   scores: {
     EI: number;
     SN: number;
     TF: number;
     JP: number;
   };
 }