 import { QuizQuestion } from '@/types/quiz';
 
 export const quizQuestions: QuizQuestion[] = [
   // Binary Questions - E/I Dimension
   {
     id: 'ei-1',
     type: 'binary',
     question: 'At a party, do you prefer to interact with many people or just a few close friends?',
     dimension: 'EI',
     options: [
       { id: 'a', text: 'Many people', value: 1 },
       { id: 'b', text: 'Few close friends', value: -1 },
     ],
   },
   {
     id: 'ei-2',
     type: 'binary',
     question: 'After a long day, do you feel more energized by being alone or being with others?',
     dimension: 'EI',
     options: [
       { id: 'a', text: 'Being with others', value: 1 },
       { id: 'b', text: 'Being alone', value: -1 },
     ],
   },
 
   // MCQ Questions - S/N Dimension
   {
     id: 'sn-1',
     type: 'mcq',
     question: 'When learning something new, which approach do you prefer?',
     dimension: 'SN',
     options: [
       { id: 'a', text: 'Step-by-step instructions', value: -2 },
       { id: 'b', text: 'Understanding the big picture first', value: 2 },
       { id: 'c', text: 'Hands-on practice', value: -1 },
       { id: 'd', text: 'Exploring possibilities and connections', value: 1 },
     ],
   },
   {
     id: 'sn-2',
     type: 'mcq',
     question: 'Which statement best describes how you process information?',
     dimension: 'SN',
     options: [
       { id: 'a', text: 'I focus on concrete facts and details', value: -2 },
       { id: 'b', text: 'I look for patterns and meanings', value: 2 },
       { id: 'c', text: 'I trust my past experiences', value: -1 },
       { id: 'd', text: 'I imagine future possibilities', value: 1 },
     ],
   },
 
   // Likert Questions - T/F Dimension
   {
     id: 'tf-1',
     type: 'likert',
     question: 'I make decisions based on logic rather than feelings.',
     dimension: 'TF',
     options: [
       { id: 'a', text: 'Strongly Disagree', value: -2 },
       { id: 'b', text: 'Disagree', value: -1 },
       { id: 'c', text: 'Neutral', value: 0 },
       { id: 'd', text: 'Agree', value: 1 },
       { id: 'e', text: 'Strongly Agree', value: 2 },
     ],
   },
   {
     id: 'tf-2',
     type: 'likert',
     question: 'When giving feedback, I prioritize honesty over tact.',
     dimension: 'TF',
     options: [
       { id: 'a', text: 'Strongly Disagree', value: -2 },
       { id: 'b', text: 'Disagree', value: -1 },
       { id: 'c', text: 'Neutral', value: 0 },
       { id: 'd', text: 'Agree', value: 1 },
       { id: 'e', text: 'Strongly Agree', value: 2 },
     ],
   },
 
   // Likert Questions - J/P Dimension
   {
     id: 'jp-1',
     type: 'likert',
     question: 'I prefer to have a detailed plan before starting any project.',
     dimension: 'JP',
     options: [
       { id: 'a', text: 'Strongly Disagree', value: 2 },
       { id: 'b', text: 'Disagree', value: 1 },
       { id: 'c', text: 'Neutral', value: 0 },
       { id: 'd', text: 'Agree', value: -1 },
       { id: 'e', text: 'Strongly Agree', value: -2 },
     ],
   },
   {
     id: 'jp-2',
     type: 'likert',
     question: 'I enjoy spontaneity and keeping my options open.',
     dimension: 'JP',
     options: [
       { id: 'a', text: 'Strongly Disagree', value: -2 },
       { id: 'b', text: 'Disagree', value: -1 },
       { id: 'c', text: 'Neutral', value: 0 },
       { id: 'd', text: 'Agree', value: 1 },
       { id: 'e', text: 'Strongly Agree', value: 2 },
     ],
   },
 
   // Binary Questions - More dimensions
   {
     id: 'ei-3',
     type: 'binary',
     question: 'Do you prefer working in a team or independently?',
     dimension: 'EI',
     options: [
       { id: 'a', text: 'In a team', value: 1 },
       { id: 'b', text: 'Independently', value: -1 },
     ],
   },
   {
     id: 'sn-3',
     type: 'binary',
     question: 'When solving problems, do you rely more on experience or intuition?',
     dimension: 'SN',
     options: [
       { id: 'a', text: 'Experience', value: -1 },
       { id: 'b', text: 'Intuition', value: 1 },
     ],
   },
 ];
 
 export const subjectiveQuestions: QuizQuestion[] = [
   {
     id: 'subj-1',
     type: 'subjective',
     question: 'Describe a situation where you had to make a difficult decision. How did you approach it?',
   },
   {
     id: 'subj-2',
     type: 'subjective',
     question: 'What motivates you the most in your personal and professional life?',
   },
   {
     id: 'subj-3',
     type: 'subjective',
     question: 'How do you typically handle unexpected changes or challenges?',
   },
 ];