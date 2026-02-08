"use client";

import { useState } from "react";
import {
  WelcomeScreen,
  CollectUserScreen,
  PersonalitySection,
  ShortAnswerSection,
} from "@/components/quiz";
import { useDevice } from "@/hooks/use-device";
import { getOrderedSectionSteps, getFallbackSectionSteps } from "@/lib/assessment";
import type { PersonalityAnswer, StartAssessmentResponse } from "@/types";
import type { SectionStep } from "@/lib/assessment";

type Phase = "start" | "section" | "collect_user" | "complete" | "no_questions";

interface Session {
  assessmentId: string;
  sectionSteps: SectionStep[];
}

export default function Home() {
  const device = useDevice();
  const [phase, setPhase] = useState<Phase>("start");
  const [session, setSession] = useState<Session | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [completeResult, setCompleteResult] = useState<{
    mbti: string;
    axisStrengths: Record<string, number>;
    iqPercentile: number;
  } | null>(null);

  function handleStart(data: StartAssessmentResponse) {
    const sectionSteps = getOrderedSectionSteps(data.sections, data.questions, {
      excludeCognitive: true,
    });
    const steps = sectionSteps.length > 0 ? sectionSteps : getFallbackSectionSteps();
    setSession({
      assessmentId: data.assessmentId,
      sectionSteps: steps,
    });
    setCurrentSectionIndex(0);
    setPhase(steps.length > 0 ? "section" : "no_questions");
  }

  function handleSectionComplete() {
    if (!session) return;
    const next = currentSectionIndex + 1;
    if (next < session.sectionSteps.length) {
      setCurrentSectionIndex(next);
      return;
    }
    completeAssessmentAndGoToCollectUser();
  }

  function handleSectionPrevious() {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  }

  async function completeAssessmentAndGoToCollectUser() {
    if (!session) return;
    try {
      const res = await fetch(
        `/api/assessments/${session.assessmentId}/complete`,
        { method: "POST" }
      );
      const data = await res.json();
      if (res.ok) {
        setCompleteResult({
          mbti: data.mbti ?? "—",
          axisStrengths: data.axisStrengths ?? {},
          iqPercentile: data.iqPercentile ?? 0,
        });
      } else {
        setCompleteResult({
          mbti: "—",
          axisStrengths: {},
          iqPercentile: 0,
        });
      }
    } catch {
      setCompleteResult({
        mbti: "—",
        axisStrengths: {},
        iqPercentile: 0,
      });
    }
    setPhase("collect_user");
  }

  function handleUserSaved() {
    setPhase("complete");
  }

  if (phase === "start") {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background w-full overflow-x-hidden">
        <WelcomeScreen onStart={handleStart} />
      </div>
    );
  }

  if (phase === "no_questions") {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 py-12 text-center">
        <h1 className="text-xl font-semibold text-foreground mb-2">No questions available</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          The database has no sections or questions yet. Run the seed script in Supabase (e.g. <code className="rounded bg-muted px-1 text-xs">supabase/seed.sql</code>) and try again.
        </p>
      </div>
    );
  }

  if (phase === "section" && session) {
    const steps = session.sectionSteps;
    const step = steps[currentSectionIndex];
    if (!step) return null;

    if (step.type === "likert") {
      return (
        <div className="min-h-screen min-h-[100dvh] bg-background w-full overflow-x-hidden">
          <PersonalitySection
            assessmentId={session.assessmentId}
            questions={step.questions}
            sectionIndex={step.orderIndex}
            totalSections={steps.length}
            onComplete={(_answers: PersonalityAnswer[]) =>
              handleSectionComplete()
            }
            onPrevious={handleSectionPrevious}
            isFirstSection={currentSectionIndex === 0}
            isLastSection={currentSectionIndex === steps.length - 1}
          />
        </div>
      );
    }

    if (step.type === "text") {
      return (
        <div className="min-h-screen min-h-[100dvh] bg-background w-full overflow-x-hidden">
          <ShortAnswerSection
            assessmentId={session.assessmentId}
            questions={step.questions}
            sectionIndex={step.orderIndex}
            totalSections={steps.length}
            onComplete={handleSectionComplete}
            onPrevious={handleSectionPrevious}
            isFirstSection={currentSectionIndex === 0}
            isLastSection={currentSectionIndex === steps.length - 1}
          />
        </div>
      );
    }

    return null;
  }

  if (phase === "collect_user" && session) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background w-full overflow-x-hidden">
        <CollectUserScreen
          assessmentId={session.assessmentId}
          device={device}
          onSaved={handleUserSaved}
        />
      </div>
    );
  }

  if (phase === "complete" && completeResult) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4 xs:px-6 sm:px-8 py-6 xs:py-8 safe-top safe-bottom">
        <h1 className="text-xl xs:text-2xl sm:text-3xl font-semibold text-foreground mb-4 text-center">
          Assessment complete
        </h1>
        <div className="text-left space-y-2 text-sm xs:text-base text-muted-foreground w-full max-w-md">
          <p>Type: {completeResult.mbti}</p>
          <p>Axis strengths: {JSON.stringify(completeResult.axisStrengths)}</p>
          <p>IQ percentile: {completeResult.iqPercentile}</p>
        </div>
      </div>
    );
  }

  return null;
}
