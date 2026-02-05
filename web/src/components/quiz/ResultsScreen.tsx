 import { motion } from 'framer-motion';
 import { Button } from '@/components/ui/button';
 import { MBTIResult } from '@/types/quiz';
 import { RefreshCw, Download, Share2 } from 'lucide-react';
 
 interface ResultsScreenProps {
   result: MBTIResult;
   onRestart: () => void;
 }
 
 const typeDescriptions: Record<string, { title: string; description: string }> = {
   'INTJ': { title: 'The Architect', description: 'Strategic thinkers with a plan for everything. You combine imagination with reliability to achieve your goals.' },
   'INTP': { title: 'The Logician', description: 'Innovative inventors with an unquenchable thirst for knowledge. You see possibilities where others see obstacles.' },
   'ENTJ': { title: 'The Commander', description: 'Bold, imaginative leaders who always find a way. You inspire others with your vision and determination.' },
   'ENTP': { title: 'The Debater', description: 'Smart and curious thinkers who love intellectual challenges. You thrive on exploring new ideas.' },
   'INFJ': { title: 'The Advocate', description: 'Quiet visionaries who inspire and tireless idealists. You seek meaning and connection in everything.' },
   'INFP': { title: 'The Mediator', description: 'Poetic, kind, and altruistic. You are guided by your own core values and seek beauty in everything.' },
   'ENFJ': { title: 'The Protagonist', description: 'Charismatic and inspiring leaders. You have a natural ability to bring out the best in others.' },
   'ENFP': { title: 'The Campaigner', description: 'Enthusiastic, creative, and sociable free spirits. You find connections and meaning everywhere.' },
   'ISTJ': { title: 'The Logistician', description: 'Practical and fact-minded individuals. You are reliable and dedicated to your responsibilities.' },
   'ISFJ': { title: 'The Defender', description: 'Very dedicated and warm protectors. You are committed to defending those you care about.' },
   'ESTJ': { title: 'The Executive', description: 'Excellent administrators who manage things and people. You bring order and structure.' },
   'ESFJ': { title: 'The Consul', description: 'Extraordinarily caring and social. You are always eager to help and bring people together.' },
   'ISTP': { title: 'The Virtuoso', description: 'Bold and practical experimenters. You master all kinds of tools and explore with your hands.' },
   'ISFP': { title: 'The Adventurer', description: 'Flexible and charming artists. You explore and experience life with passion and creativity.' },
   'ESTP': { title: 'The Entrepreneur', description: 'Smart, energetic, and perceptive. You enjoy living on the edge and taking action.' },
   'ESFP': { title: 'The Entertainer', description: 'Spontaneous, energetic, and enthusiastic. You bring fun and excitement everywhere you go.' },
 };
 
 export const ResultsScreen = ({ result, onRestart }: ResultsScreenProps) => {
   const typeInfo = typeDescriptions[result.type] || { 
     title: 'Unique Personality', 
     description: 'Your personality is a unique blend that makes you who you are.' 
   };
 
   const dimensions = [
     { key: 'EI', left: 'Extraversion', right: 'Introversion', score: result.scores.EI },
     { key: 'SN', left: 'Sensing', right: 'Intuition', score: result.scores.SN },
     { key: 'TF', left: 'Thinking', right: 'Feeling', score: result.scores.TF },
     { key: 'JP', left: 'Judging', right: 'Perceiving', score: result.scores.JP },
   ];
 
   return (
     <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
       <motion.div
         initial={{ opacity: 0, scale: 0.9 }}
         animate={{ opacity: 1, scale: 1 }}
         transition={{ duration: 0.5 }}
         className="w-full max-w-2xl"
       >
         {/* Result Card */}
         <div className="bg-card rounded-3xl card-shadow p-8 md:p-12 text-center mb-8">
           <motion.div
             initial={{ scale: 0 }}
             animate={{ scale: 1 }}
             transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
             className="w-24 h-24 quiz-gradient rounded-2xl flex items-center justify-center mx-auto mb-6"
           >
             <span className="text-3xl font-bold text-primary-foreground">{result.type}</span>
           </motion.div>
 
           <motion.h1
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.3 }}
             className="text-3xl md:text-4xl font-bold text-foreground mb-3"
           >
             {typeInfo.title}
           </motion.h1>
 
           <motion.p
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.4 }}
             className="text-muted-foreground text-lg max-w-md mx-auto mb-10"
           >
             {typeInfo.description}
           </motion.p>
 
           {/* Dimension Bars */}
           <div className="space-y-6">
             {dimensions.map((dim, index) => {
               const percentage = ((dim.score + 10) / 20) * 100;
               const isLeft = percentage < 50;
 
               return (
                 <motion.div
                   key={dim.key}
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.5 + index * 0.1 }}
                 >
                   <div className="flex justify-between text-sm mb-2">
                     <span className={`font-medium ${isLeft ? 'text-primary' : 'text-muted-foreground'}`}>
                       {dim.left}
                     </span>
                     <span className={`font-medium ${!isLeft ? 'text-primary' : 'text-muted-foreground'}`}>
                       {dim.right}
                     </span>
                   </div>
                   <div className="h-3 bg-secondary rounded-full overflow-hidden relative">
                     <motion.div
                       initial={{ width: '50%' }}
                       animate={{ width: `${percentage}%` }}
                       transition={{ delay: 0.7 + index * 0.1, duration: 0.6 }}
                       className="absolute left-0 h-full quiz-gradient"
                     />
                   </div>
                 </motion.div>
               );
             })}
           </div>
         </div>
 
         {/* Actions */}
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.9 }}
           className="flex flex-wrap justify-center gap-4"
         >
           <Button
             onClick={onRestart}
             variant="outline"
             size="lg"
             className="gap-2"
           >
             <RefreshCw className="w-4 h-4" />
             Retake Quiz
           </Button>
           <Button
             size="lg"
             className="quiz-gradient border-0 text-primary-foreground gap-2"
           >
             <Download className="w-4 h-4" />
             Download Report
           </Button>
           <Button
             variant="outline"
             size="lg"
             className="gap-2"
           >
             <Share2 className="w-4 h-4" />
             Share
           </Button>
         </motion.div>
       </motion.div>
     </div>
   );
 };