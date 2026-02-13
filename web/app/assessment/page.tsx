'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CollectUserScreen,
  LikertSection,
  ShortAnswerSection,
} from "@/components/quiz";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { useDevice } from "@/hooks/use-device";
import { supabase } from "@/lib/supabase";
import { getOrderedSectionSteps, getFallbackSectionSteps } from "@/lib/assessment";
import { getResumeCookie, setResumeCookie, clearResumeCookie } from "@/lib/resume-cookie";
import type { PersonalityAnswer, ResumeAssessmentResponse } from "@/types";
import type { SectionStep } from "@/lib/assessment";

type Phase = "start" | "section" | "collect_user" | "complete" | "no_questions";

interface Session {
  assessmentId: string;
  sectionSteps: SectionStep[];
  clientToken: string;
}

export default function AssessmentPage() {
  const router = useRouter();
  const device = useDevice();
  const [phase, setPhase] = useState<Phase>("start");
  const [session, setSession] = useState<Session | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [assessmentResponses, setAssessmentResponses] = useState<
    Record<string, { answerNumeric?: number; answerRaw?: string }>
  >({});
  const [resuming, setResuming] = useState(true);
  const [completeResult, setCompleteResult] = useState<{
    mbti: string;
    axisStrengths: Record<string, number>;
    iqPercentile: number;
  } | null>(null);
  const [reportText, setReportText] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const reportFetchedRef = useRef(false);

  useEffect(() => {
    const payload = getResumeCookie();
    if (!payload?.assessmentId || !payload.clientToken) {
      setResuming(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("resume-assessment", {
          body: { assessmentId: payload.assessmentId, clientToken: payload.clientToken },
        });
        if (error || data?.error) {
          clearResumeCookie();
          setResuming(false);
          return;
        }
        const res = data as ResumeAssessmentResponse;
        if (res.status === "completed") {
          clearResumeCookie();
          setResuming(false);
          return;
        }
        const sectionSteps = getOrderedSectionSteps(res.sections, res.questions, { excludeCognitive: true });
        const steps = sectionSteps.length > 0 ? sectionSteps : getFallbackSectionSteps();
        const responsesMap: Record<string, { answerNumeric?: number; answerRaw?: string }> = {};
        (res.responses ?? []).forEach((r) => {
          responsesMap[r.question_id] = {
            ...(r.answer_numeric != null && { answerNumeric: r.answer_numeric }),
            ...(r.answer_raw != null && r.answer_raw !== "" && { answerRaw: r.answer_raw }),
          };
        });
        setSession({
          assessmentId: res.assessmentId,
          sectionSteps: steps,
          clientToken: res.clientToken,
        });
        setAssessmentResponses(responsesMap);
        setPhase(payload.phase === "collect_user" ? "collect_user" : "section");
        setCurrentSectionIndex(Math.min(payload.sectionIndex, Math.max(0, steps.length - 1)));
        setQuestionIndex(Math.max(0, payload.questionIndex));
      } catch {
        clearResumeCookie();
      } finally {
        setResuming(false);
      }
    })();
  }, []);

  // Start is on landing page (/); direct visit to /assessment with no session → redirect to /
  useEffect(() => {
    if (!resuming && phase === "start" && !session) {
      router.replace("/");
    }
  }, [resuming, phase, session, router]);

  function handleSectionProgress(sectionIndex: number, qIndex: number) {
    setQuestionIndex(qIndex);
    if (session) {
      setResumeCookie({
        assessmentId: session.assessmentId,
        clientToken: session.clientToken,
        phase: "section",
        sectionIndex: currentSectionIndex,
        questionIndex: qIndex,
      });
    }
  }

  function handleResponseSaved(questionId: string, answerNumeric?: number, answerRaw?: string) {
    setAssessmentResponses((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        ...(answerNumeric != null && { answerNumeric }),
        ...(answerRaw != null && { answerRaw }),
      },
    }));
  }

  function handleSectionComplete() {
    if (!session) return;
    const next = currentSectionIndex + 1;
    if (next < session.sectionSteps.length) {
      setCurrentSectionIndex(next);
      setQuestionIndex(0);
      setResumeCookie({
        assessmentId: session.assessmentId,
        clientToken: session.clientToken,
        phase: "section",
        sectionIndex: next,
        questionIndex: 0,
      });
      return;
    }
    completeAssessmentAndGoToCollectUser();
  }

  function handleSectionPrevious() {
    if (currentSectionIndex > 0) {
      const prevSectionIndex = currentSectionIndex - 1;
      setCurrentSectionIndex(prevSectionIndex);
      setQuestionIndex(0);
      if (session) {
        setResumeCookie({
          assessmentId: session.assessmentId,
          clientToken: session.clientToken,
          phase: "section",
          sectionIndex: prevSectionIndex,
          questionIndex: 0,
        });
      }
    }
  }

  async function completeAssessmentAndGoToCollectUser() {
    if (!session) return;
    try {
      const { data, error } = await supabase.functions.invoke("score-assessment", {
        body: {
          assessmentId: session.assessmentId,
          clientToken: session.clientToken,
        },
      });
      if (!error && data) {
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
    if (session) {
      setResumeCookie({
        assessmentId: session.assessmentId,
        clientToken: session.clientToken,
        phase: "collect_user",
        sectionIndex: currentSectionIndex,
        questionIndex: 0,
      });
    }
  }

  function handleUserSaved() {
    clearResumeCookie();
    setPhase("complete");
  }

  useEffect(() => {
    if (phase !== "complete" || !session || reportText != null || reportError != null || reportFetchedRef.current)
      return;
    reportFetchedRef.current = true;
    setReportLoading(true);
    setReportError(null);
    supabase.functions
      .invoke("generate-report", {
        body: { assessmentId: session.assessmentId, clientToken: session.clientToken },
      })
      .then(({ data, error }) => {
        if (error) {
          setReportError(error.message ?? "Failed to load report");
          return;
        }
        if (data?.error) {
          setReportError(data.error);
          return;
        }
        if (typeof data?.reportText === "string") setReportText(data.reportText);
      })
      .catch(() => setReportError("Failed to load report"))
      .finally(() => setReportLoading(false));
  }, [phase, session, reportText, reportError]);

  if (resuming) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 px-6 py-12">
        <Loader size="lg" />
        <p className="text-sm text-muted-foreground sr-only">Loading…</p>
      </div>
    );
  }

  if (phase === "start") {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 px-6 py-12">
        <Loader size="lg" />
        <p className="text-sm text-muted-foreground sr-only">Redirecting…</p>
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

    const stepQuestionIds = step.questions.map((q) => q.id);
    const initialAnswersForStep: PersonalityAnswer[] =
      step.type === "likert"
        ? stepQuestionIds
            .filter((id) => assessmentResponses[id]?.answerNumeric != null)
            .map((id) => ({ id, answer: assessmentResponses[id].answerNumeric! }))
        : [];
    const initialValuesForStep: Record<string, string> =
      step.type === "text"
        ? stepQuestionIds.reduce<Record<string, string>>((acc, id) => {
            const raw = assessmentResponses[id]?.answerRaw;
            if (raw != null) acc[id] = raw;
            return acc;
          }, {})
        : {};

    if (step.type === "likert") {
      return (
        <div
          className="min-h-screen min-h-[100dvh] bg-background w-full overflow-x-hidden"
          key={`section-${session.assessmentId}-${currentSectionIndex}`}
        >
          <LikertSection
            assessmentId={session.assessmentId}
            clientToken={session.clientToken}
            questions={step.questions}
            sectionId={step.sectionId}
            sectionIndex={step.orderIndex}
            totalSections={steps.length}
            initialQuestionIndex={questionIndex}
            initialAnswers={initialAnswersForStep}
            onComplete={(_answers: PersonalityAnswer[]) => handleSectionComplete()}
            onPrevious={handleSectionPrevious}
            onProgress={handleSectionProgress}
            onResponseSaved={(questionId, answerNumeric) =>
              handleResponseSaved(questionId, answerNumeric)
            }
            isFirstSection={currentSectionIndex === 0}
            isLastSection={currentSectionIndex === steps.length - 1}
          />
        </div>
      );
    }

    if (step.type === "text") {
      return (
        <div
          className="min-h-screen min-h-[100dvh] bg-background w-full overflow-x-hidden"
          key={`section-${session.assessmentId}-${currentSectionIndex}`}
        >
          <ShortAnswerSection
            assessmentId={session.assessmentId}
            clientToken={session.clientToken}
            questions={step.questions}
            sectionIndex={step.orderIndex}
            totalSections={steps.length}
            initialQuestionIndex={questionIndex}
            initialValues={initialValuesForStep}
            onComplete={handleSectionComplete}
            onPrevious={handleSectionPrevious}
            onProgress={handleSectionProgress}
            onResponseSaved={(questionId, answerRaw) =>
              handleResponseSaved(questionId, undefined, answerRaw)
            }
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
    const axisEntries = Object.entries(completeResult.axisStrengths ?? {}).sort(([a], [b]) => a.localeCompare(b));
    const reportParagraphs =
      reportText != null && reportText !== ""
        ? reportText.split(/\n\n+/).filter((p) => p.trim().length > 0)
        : [];

    return (
      <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col items-center px-4 xs:px-6 sm:px-8 py-8 sm:py-12 safe-top safe-bottom">
        <div className="w-full max-w-3xl flex flex-col gap-10 sm:gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <header className="text-center space-y-6">
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
              Assessment complete
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              <div className="rounded-xl border border-border/80 bg-card px-4 py-3 shadow-sm">
                <span className="text-xs text-muted-foreground block text-center mb-1">Type</span>
                <span className="text-lg font-medium text-foreground">{completeResult.mbti}</span>
              </div>
              <div className="rounded-xl border border-border/80 bg-card px-4 py-3 shadow-sm min-w-[140px]">
                <span className="text-xs text-muted-foreground block text-center mb-2">Axis strengths</span>
                <div className="flex flex-wrap gap-2 justify-center">
                  {axisEntries.map(([axis, value]) => (
                    <span
                      key={axis}
                      className="inline-flex items-center rounded-md bg-muted/80 px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      {axis} {value}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                <span className="text-xs text-muted-foreground block text-center mb-1">IQ percentile</span>
                <span className="text-sm text-muted-foreground">{completeResult.iqPercentile}</span>
              </div>
            </div>
          </header>

          {/* Insight / Report */}
          <section className="space-y-6">
            {reportLoading && (
              <p className="text-sm text-muted-foreground text-center py-8">Generating your report…</p>
            )}
            {reportError && (
              <p className="text-sm text-destructive text-center py-4">{reportError}</p>
            )}
            {reportParagraphs.length > 0 && !reportLoading && (
              <article className="space-y-6">
                {reportParagraphs.map((paragraph, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/60 bg-card/50 px-5 py-4 shadow-sm"
                  >
                    <p className="text-[15px] sm:text-base text-foreground leading-relaxed max-w-[65ch]">
                      {paragraph.trim()}
                    </p>
                  </div>
                ))}
              </article>
            )}
          </section>

          {/* Actions */}
          <footer className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-border/60">
            <Button
              size="lg"
              className="w-full sm:w-auto min-w-[180px] h-11 font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              View Full Report
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto min-w-[180px] h-11 font-medium rounded-lg border-border/80 bg-background hover:bg-muted/50"
            >
              Download / Save
            </Button>
          </footer>
        </div>
      </div>
    );
  }

  return null;
}
