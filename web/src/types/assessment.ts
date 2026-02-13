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
  first_name: string;
  device: 'desktop' | 'mobile' | 'tablet';
}

export interface AssessmentSubmissionAssessment {
  version: string;
  started_at: string;
  completed_at: string;
}

export interface AssessmentSubmissionResponse {
  question_id: string;
  section: 'personality' | 'cognitive';
  answer: number;
  time_taken: number | null;
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
  order_index: number;
  is_timed: boolean | null;
  time_limit_seconds: number | null;
  purpose: string | null;
}

export interface DbQuestion {
  id: string;
  section_id: string;
  text: string;
  type: string;
  dimension: string | null;
  reverse_scored: boolean | null;
  weight: number | null;
  correct_answer: string | null;
  active: boolean | null;
}

export interface StartAssessmentResponse {
  assessmentId: string;
  sections: DbSection[];
  questions: DbQuestion[];
  clientToken: string;
}

export interface ResumeResponseRow {
  question_id: string;
  answer_numeric: number | null;
  answer_raw: string | null;
}

export interface ResumeAssessmentResponse {
  assessmentId: string;
  clientToken: string;
  status: string;
  sections: DbSection[];
  questions: DbQuestion[];
  responses: ResumeResponseRow[];
}
