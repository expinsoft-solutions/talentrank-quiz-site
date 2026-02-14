'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CollectUserScreen,
  LikertSection,
  ResultView,
  ShortAnswerSection,
} from "@/components/quiz";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { useDevice } from "@/hooks/use-device";
import { supabase } from "@/lib/supabase";
import { getOrderedSectionSteps, getFallbackSectionSteps } from "@/lib/assessment";
import { getResumeCookie, setResumeCookie, clearResumeCookie } from "@/lib/resume-cookie";
import { getVslConfig } from "@/lib/site-settings";
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
    selfSabotageScores?: Record<string, number>;
    optimalEnvScores?: Record<string, number>;
  } | null>(null);
  const [reportText, setReportText] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [userFirstName, setUserFirstName] = useState<string | null>(null);
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
          selfSabotageScores: data.selfSabotageScores,
          optimalEnvScores: data.optimalEnvScores,
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

  async function handleUserSaved(firstName?: string) {
    if (firstName) setUserFirstName(firstName);
    clearResumeCookie();
    const vsl = await getVslConfig();
    if (vsl.vsl_enabled && vsl.vsl_url?.trim()) {
      const aid = session?.assessmentId;
      const token = session?.clientToken;
      if (aid && token) {
        if (vsl.vsl_type === "external") {
          const base = vsl.vsl_url.replace(/\?.*$/, "");
          const sep = base.includes("?") ? "&" : "?";
          window.location.href = `${base}${sep}assessment_id=${encodeURIComponent(aid)}&client_token=${encodeURIComponent(token)}`;
          return;
        }
        router.push(`/vsl?assessmentId=${encodeURIComponent(aid)}&clientToken=${encodeURIComponent(token)}`);
        return;
      }
    }
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
    return (
      <ResultView
        completeResult={completeResult}
        reportText={reportText}
        userFirstName={userFirstName}
        reportLoading={reportLoading}
        reportError={reportError}
      />
    );
  }

  return null;
}
