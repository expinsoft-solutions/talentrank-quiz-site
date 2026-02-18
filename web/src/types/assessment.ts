export interface PersonalityAnswer {
  id: string;
  answer: number;
}

export interface CognitiveQuestion {
  id: string;
  question: string;
}

export interface CognitiveAnswer {
  id: string;
  answer: number;
  timeTaken: number;
}

export interface CognitiveSectionResult {
  answers: CognitiveAnswer[];
  timeExpired: boolean;
  totalTimeUsed: number;
}

export interface AssessmentSubmissionUser {
  email: string;
  firstName: string;
  device: 'desktop' | 'mobile' | 'tablet';
}

export interface AssessmentSubmissionAssessment {
  version: string;
  startedAt: string;
  completedAt: string;
}

export interface AssessmentSubmissionResponse {
  questionId: string;
  section: 'personality' | 'cognitive';
  answer: number;
  timeTaken: number | null;
}

export interface AssessmentSubmission {
  user: AssessmentSubmissionUser;
  assessment: AssessmentSubmissionAssessment;
  responses: AssessmentSubmissionResponse[];
}

export interface StartAssessmentRequest {
  email: string;
  firstName?: string;
  device?: string;
}

export interface DbSection {
  id: string;
  name: string;
  orderIndex: number;
  isTimed: boolean | null;
  timeLimitSeconds: number | null;
  purpose: string | null;
}

export interface DbQuestion {
  id: string;
  sectionId: string;
  text: string;
  type: string;
  dimension: string | null;
  reverseScored: boolean | null;
  weight: number | null;
  correctAnswer: string | null;
  active: boolean | null;
  options?: string[] | null;
}

export interface StartAssessmentResponse {
  assessmentId: string;
  sections: DbSection[];
  questions: DbQuestion[];
  clientToken: string;
}

export interface ResumeResponseRow {
  questionId: string;
  answerNumeric: number | null;
  answerRaw: string | null;
}

export interface ResumeAssessmentResponse {
  assessmentId: string;
  clientToken: string;
  status: string;
  sections: DbSection[];
  questions: DbQuestion[];
  responses: ResumeResponseRow[];
}
