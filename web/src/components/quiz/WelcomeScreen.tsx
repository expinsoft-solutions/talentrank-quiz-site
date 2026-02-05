 import { motion } from 'framer-motion';
 import { Button } from '@/components/ui/button';
 import { Brain, Sparkles, Clock, ChevronRight } from 'lucide-react';
 
 interface WelcomeScreenProps {
   onStart: () => void;
 }
 
 export const WelcomeScreen = ({ onStart }: WelcomeScreenProps) => {
   const features = [
     { icon: Brain, text: 'Discover Your Personality Type' },
     { icon: Sparkles, text: 'Personalized Insights' },
     { icon: Clock, text: '10-15 Minutes' },
   ];
 
   return (
     <div className="min-h-screen flex flex-col">
       {/* Hero Section */}
       <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
         <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6 }}
           className="text-center max-w-3xl"
         >
           <motion.div
             initial={{ scale: 0 }}
             animate={{ scale: 1 }}
             transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
             className="w-20 h-20 quiz-gradient rounded-2xl flex items-center justify-center mx-auto mb-8"
           >
             <Brain className="w-10 h-10 text-primary-foreground" />
           </motion.div>
           
           <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">
             Discover Your
             <span className="block mt-2 quiz-gradient bg-clip-text text-transparent">
               True Personality
             </span>
           </h1>
           
           <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
             Take our comprehensive MBTI assessment to unlock deep insights about your personality, strengths, and how you interact with the world.
           </p>
 
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.4 }}
             className="flex flex-wrap justify-center gap-6 mb-12"
           >
             {features.map((feature, index) => (
               <motion.div
                 key={index}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.5 + index * 0.1 }}
                 className="flex items-center gap-3 bg-secondary/50 px-5 py-3 rounded-full"
               >
                 <feature.icon className="w-5 h-5 text-primary" />
                 <span className="text-sm font-medium text-foreground">{feature.text}</span>
               </motion.div>
             ))}
           </motion.div>
 
           <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ delay: 0.7 }}
           >
             <Button
               onClick={onStart}
               size="lg"
               className="quiz-gradient border-0 text-primary-foreground px-10 py-7 text-lg font-semibold rounded-xl gap-2 group"
             >
               Start Your Journey
               <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
             </Button>
           </motion.div>
         </motion.div>
       </div>
 
       {/* Footer */}
       <motion.footer
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.8 }}
         className="py-6 text-center text-sm text-muted-foreground"
       >
         Based on the Myers-Briggs Type Indicator® methodology
       </motion.footer>
     </div>
   );
 };