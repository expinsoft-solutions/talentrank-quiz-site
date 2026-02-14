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
import {
  getAxisDisplayEntries,
  getSabotageProfile,
  getEnvDisplay,
  getCognitiveTier,
  getCognitiveRange,
  getMbtiBlurb,
  getCognitiveBlurb,
  getPercentileRoomBlurb,
} from "@/lib/result-display";
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

  function handleUserSaved(firstName?: string) {
    if (firstName) setUserFirstName(firstName);
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
    const displayName = userFirstName || "There";
    const reportRaw = reportText?.trim() ?? "";
    const firstLine = reportRaw.split(/\n/)[0]?.trim() ?? "";
    const archetypeMatch = firstLine.includes(" — ") ? firstLine.split(" — ").slice(1).join(" — ") : "";
    const archetype = archetypeMatch || "Your unique profile";
    const reportParagraphs =
      reportRaw !== ""
        ? reportRaw.split(/\n\n+/).filter((p) => p.trim().length > 0)
        : [];
    const iqPct = completeResult.iqPercentile;
    const iqPercentileDisplay =
      typeof iqPct === "number"
        ? `${iqPct}${iqPct % 10 === 1 && iqPct !== 11 ? "st" : iqPct % 10 === 2 && iqPct !== 12 ? "nd" : iqPct % 10 === 3 && iqPct !== 13 ? "rd" : "th"} percentile`
        : String(iqPct ?? "—");

    const axisEntries = getAxisDisplayEntries(completeResult.mbti, completeResult.axisStrengths ?? {});
    const sabotageProfile = getSabotageProfile(completeResult.selfSabotageScores ?? {});
    const envDisplay = getEnvDisplay(completeResult.optimalEnvScores ?? {});
    const cognitiveTier = getCognitiveTier(iqPct);
    const cognitiveRange = getCognitiveRange(iqPct);
    const primarySabotage = sabotageProfile[0];
    const secondarySabotage = sabotageProfile[1];
    const envSummary =
      envDisplay.length > 0
        ? envDisplay.map((e) => `${e.name}: ${e.label}`).join(", ")
        : "—";

    return (
      <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 h-14 bg-[#4c1d95] text-white shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="h-8 w-auto object-contain" />
            <span className="font-semibold text-white">TalentRank</span>
          </div>
          <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0 font-medium rounded-lg" asChild>
            <a href="#report">Reveal My TalentRank</a>
          </Button>
        </header>

        <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-10 sm:gap-14 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="text-center text-sm text-muted-foreground">
            If your report doesn&apos;t display immediately, refresh this page.
          </p>

          <section className="space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-center tracking-tight">
              Your TalentRank Profile
            </h1>
            <p className="text-center text-muted-foreground">
              The rare mix of traits that sets you apart from everyone else.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-xl border border-border/80 bg-card shadow-sm">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold text-foreground shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xl font-semibold text-foreground">{displayName}</p>
                <p className="text-muted-foreground mt-1">
                  {completeResult.mbti} · {cognitiveTier}
                </p>
              </div>
            </div>

            {/* 1. TalentRank Type (4-letter + strengths summary) */}
            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">1. TalentRank Type</h2>
              <p className="text-foreground font-medium">Type: {completeResult.mbti}</p>
              <p className="text-sm text-muted-foreground">Cognitive Tier: {cognitiveTier}</p>
              {primarySabotage && (
                <p className="text-sm text-muted-foreground">Primary Sabotage Pattern: {primarySabotage.name}</p>
              )}
              <p className="text-sm text-muted-foreground">Optimal Environment: {envSummary}</p>
            </div>

            {/* 2. Axis Strengths */}
            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">2. Axis Strengths</h2>
              <ul className="space-y-1 text-sm text-foreground">
                {axisEntries.map(({ letter, pct, label }) => (
                  <li key={letter}>
                    {letter}: {pct}% ({label})
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. Sabotage Profile */}
            {(primarySabotage || secondarySabotage) && (
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">3. Sabotage Profile</h2>
                {primarySabotage && (
                  <p className="text-sm text-foreground">
                    Primary: {primarySabotage.name} ({primarySabotage.scoreOutOf5}/5)
                  </p>
                )}
                {secondarySabotage && (
                  <p className="text-sm text-muted-foreground">
                    Secondary: {secondarySabotage.name} ({secondarySabotage.scoreOutOf5}/5)
                  </p>
                )}
              </div>
            )}

            {/* 4. Environment Fit */}
            {envDisplay.length > 0 && (
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">4. Environment Fit</h2>
                <ul className="space-y-1 text-sm text-foreground">
                  {envDisplay.map((e) => (
                    <li key={e.name}>
                      {e.name}: {e.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 5. Cognitive Estimate */}
            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">5. Cognitive Estimate</h2>
              <p className="text-sm text-foreground">Estimated Range: {cognitiveRange}</p>
              <p className="text-sm text-muted-foreground">Percentile: {cognitiveTier}</p>
            </div>

            {/* Dynamic card blurbs (MBTI, IQ, Percentile, Archetype) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden>🧠</span>
                  <span className="font-semibold text-foreground">{completeResult.mbti}</span>
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Type Explained</p>
                <p className="text-sm text-foreground leading-relaxed">{getMbtiBlurb(completeResult.mbti)}</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden>⚡</span>
                  <span className="font-semibold text-foreground">{cognitiveRange}</span>
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your IQ</p>
                <p className="text-sm text-foreground leading-relaxed">{getCognitiveBlurb(iqPct)}</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden>📈</span>
                  <span className="font-semibold text-foreground">{iqPercentileDisplay}</span>
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IQ Percentile Description</p>
                <p className="text-sm text-foreground leading-relaxed">{getPercentileRoomBlurb(iqPct)}</p>
              </div>
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden>📜</span>
                  <span className="font-semibold text-foreground">{archetype}</span>
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Archetype Blurb</p>
                <p className="text-sm text-foreground leading-relaxed">
                  {reportParagraphs[0]?.slice(0, 160) ?? "Your unique cognitive fingerprint, decoded from your responses."}
                  {reportParagraphs[0] && reportParagraphs[0].length > 160 ? "…" : ""}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-[#4c1d95] text-white p-6 sm:p-8 text-center">
            <p className="text-lg sm:text-xl font-semibold">
              Join 2,847+ high achievers who&apos;ve unlocked their cognitive blueprint.
            </p>
            <p className="mt-2 flex items-center justify-center gap-1 text-sm text-white/90">
              <span aria-hidden>★★★★★</span> &quot;Something literally everyone should know about themselves&quot; — Sarah M.
            </p>
          </section>

          <section id="report" className="space-y-6 scroll-mt-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              TalentRank Report
            </h2>
            {reportLoading && (
              <p className="text-sm text-muted-foreground py-8">Generating your report…</p>
            )}
            {reportError && (
              <p className="text-sm text-destructive py-4">{reportError}</p>
            )}
            {reportParagraphs.length > 0 && !reportLoading && (
              <>
                {firstLine && (
                  <p className="text-xl sm:text-2xl font-semibold text-foreground text-center">
                    {displayName} — {archetype}
                  </p>
                )}
                <article className="space-y-6 max-w-[65ch] mx-auto">
                  {reportParagraphs.map((paragraph, i) => (
                    <p key={i} className="text-[15px] sm:text-base text-foreground leading-relaxed">
                      {paragraph.trim()}
                    </p>
                  ))}
                </article>
              </>
            )}
          </section>

          <section className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 text-center space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Unlock Your Career Growth
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Invest in an advanced report that shows your blockers, traits, and habits that may be holding you back — and get a detailed plan to fix them and succeed in your career.
            </p>
            <Button
              size="lg"
              className="w-full sm:w-auto min-w-[180px] h-12 font-medium rounded-lg bg-[#4c1d95] hover:bg-[#5b21b6] text-white"
            >
              Buy Now
            </Button>
          </section>
        </main>
      </div>
    );
  }

  return null;
}
