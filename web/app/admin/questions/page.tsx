'use client';

import { useEffect, useRef, useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Section {
  id: string;
  name: string;
  order_index: number;
  enabled?: boolean;
  is_timed?: boolean;
  time_limit_seconds?: number | null;
  purpose?: string | null;
  questions: Question[];
}

interface Question {
  id: string;
  statement?: string;
  text?: string;
  type: string;
  dimension?: string | null;
  reverseScored?: boolean;
  reverse_scored?: boolean;
  weight?: number;
  correct_answer?: string | null;
  active?: boolean;
  options?: string[];
}

function QuestionsList({
  section,
  editingQuestion,
  setEditingQuestion,
  updateQuestion,
  reorderQuestions,
  addQuestion,
  deleteQuestion,
  dragRef,
  dragOver,
  setDragOver,
}: {
  section: Section;
  editingQuestion: string | null;
  setEditingQuestion: (id: string | null) => void;
  updateQuestion: (sectionId: string, questionId: string, updates: Partial<Question>) => void;
  reorderQuestions: (sectionId: string, fromIndex: number, toIndex: number) => void;
  addQuestion: (sectionId: string) => void;
  deleteQuestion: (sectionId: string, questionId: string) => void;
  dragRef: React.MutableRefObject<{ sectionId: string; index: number } | null>;
  dragOver: { sectionId: string; index: number } | null;
  setDragOver: (v: { sectionId: string; index: number } | null) => void;
}) {
  return (
    <div
      className="space-y-2"
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDragOver(null);
        }
      }}
    >
      {section.questions.map((q, qIdx) => {
        const showLineAbove =
          dragOver?.sectionId === section.id &&
          dragOver?.index === qIdx &&
          dragRef.current?.sectionId === section.id &&
          dragRef.current?.index !== qIdx;
        return (
          <div key={q.id}>
            {showLineAbove && (
              <div
                className="h-0.5 rounded-full bg-indigo-500 my-1 mx-2 animate-pulse"
                aria-hidden
              />
            )}
            <div
              draggable
              onDragStart={() => {
                dragRef.current = { sectionId: section.id, index: qIdx };
                setDragOver({ sectionId: section.id, index: qIdx });
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragRef.current?.sectionId === section.id) {
                  setDragOver({ sectionId: section.id, index: qIdx });
                }
              }}
              onDragEnd={() => {
                setDragOver(null);
                dragRef.current = null;
              }}
              onDrop={(e) => {
                e.preventDefault();
                const src = dragRef.current;
                if (src && src.sectionId === section.id) {
                  reorderQuestions(section.id, src.index, qIdx);
                }
                setDragOver(null);
                dragRef.current = null;
              }}
              className="rounded border border-slate-200 dark:border-slate-700 p-3 space-y-2 flex gap-3 items-start"
            >
              <span
                className="shrink-0 flex items-center pt-2.5 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 touch-none"
                aria-label="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex-1 flex items-center justify-between gap-4 text-left min-w-0"
                    onClick={() =>
                      setEditingQuestion(editingQuestion === q.id ? null : q.id)
                    }
                  >
                    <span className="font-mono text-xs text-slate-500 shrink-0">{q.id}</span>
                    <span className="text-sm truncate min-w-0 flex-1">
                      {(q.statement ?? q.text ?? '').slice(0, 80)}
                      {(q.statement ?? q.text ?? '').length > 80 ? '…' : ''}
                    </span>
                    <span className="shrink-0">{editingQuestion === q.id ? '−' : '+'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteQuestion(section.id, q.id)}
                    className="shrink-0 p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    aria-label="Delete question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {editingQuestion === q.id && (
                  <div className="pt-2 space-y-3 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-500 block mb-1">Type</label>
                        <select
                          value={q.type ?? 'likert'}
                          onChange={(e) => {
                            const newType = e.target.value;
                            const baseOpts = q.options ?? [];
                            const opts =
                              newType === 'mcq'
                                ? [...baseOpts, '', '', ''].slice(0, 4)
                                : newType === 'binary'
                                  ? [...baseOpts, ''].slice(0, 2)
                                  : newType === 'text'
                                    ? baseOpts
                                    : [];
                            updateQuestion(section.id, q.id, {
                              type: newType,
                              options: newType === 'likert' ? [] : opts,
                            });
                          }}
                          className="w-full rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2"
                        >
                          <option value="likert">Likert</option>
                          <option value="text">Text</option>
                          <option value="mcq">MCQ (4 options)</option>
                          <option value="binary">Binary (2 options)</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs text-slate-500 block mb-1">Statement</label>
                        <textarea
                          value={q.statement ?? q.text ?? ''}
                          onChange={(e) =>
                            updateQuestion(section.id, q.id, {
                              statement: e.target.value,
                              text: e.target.value,
                            })
                          }
                          rows={2}
                          className="w-full rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2"
                        />
                      </div>
                    </div>
                    {q.type === 'mcq' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[0, 1, 2, 3].map((i) => {
                          const opts = [...(q.options ?? []), '', '', ''].slice(0, 4);
                          return (
                            <div key={i}>
                              <label className="text-xs text-slate-500 block mb-1">
                                Option {i + 1}
                              </label>
                              <input
                                type="text"
                                value={opts[i] ?? ''}
                                onChange={(e) => {
                                  const newOpts = [...opts];
                                  newOpts[i] = e.target.value;
                                  updateQuestion(section.id, q.id, { options: newOpts });
                                }}
                                placeholder={`Option ${i + 1}`}
                                className="w-full rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {q.type === 'binary' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[0, 1].map((i) => {
                          const opts = [...(q.options ?? []), ''].slice(0, 2);
                          return (
                            <div key={i}>
                              <label className="text-xs text-slate-500 block mb-1">
                                Option {i + 1}
                              </label>
                              <input
                                type="text"
                                value={opts[i] ?? ''}
                                onChange={(e) => {
                                  const newOpts = [...opts];
                                  newOpts[i] = e.target.value;
                                  updateQuestion(section.id, q.id, { options: newOpts });
                                }}
                                placeholder={i === 0 ? 'Yes / True' : 'No / False'}
                                className="w-full rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {q.type === 'text' && (
                      <div className="space-y-2">
                        <label className="text-xs text-slate-500 block">Suggestions (optional)</label>
                        <div className="space-y-2">
                          {(q.options ?? []).map((opt, i) => (
                            <div key={i} className="flex gap-2">
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...(q.options ?? [])];
                                  newOpts[i] = e.target.value;
                                  updateQuestion(section.id, q.id, { options: newOpts });
                                }}
                                placeholder={`Suggestion ${i + 1}`}
                                className="flex-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newOpts = (q.options ?? []).filter((_, j) => j !== i);
                                  updateQuestion(section.id, q.id, { options: newOpts });
                                }}
                                className="shrink-0 p-2 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                aria-label="Remove suggestion"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const opts = [...(q.options ?? []), ''];
                              updateQuestion(section.id, q.id, { options: opts });
                            }}
                            className="flex items-center gap-2 rounded border border-dashed border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:border-indigo-500 hover:text-indigo-600"
                          >
                            <Plus className="h-4 w-4" />
                            Add suggestion
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">Shown as tappable suggestions in the quiz UI</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={q.reverseScored ?? q.reverse_scored ?? false}
                          onChange={(e) =>
                            updateQuestion(section.id, q.id, {
                              reverseScored: e.target.checked,
                              reverse_scored: e.target.checked,
                            })
                          }
                        />
                        <span className="text-xs">Reverse scored</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={q.active !== false}
                          onChange={(e) =>
                            updateQuestion(section.id, q.id, { active: e.target.checked })
                          }
                        />
                        <span className="text-xs">Active</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {dragRef.current?.sectionId === section.id &&
        dragOver?.sectionId === section.id &&
        dragOver?.index === section.questions.length && (
          <div
            className="h-0.5 rounded-full bg-indigo-500 my-1 mx-2 animate-pulse"
            aria-hidden
          />
        )}
      <div
        className="h-4 -mt-2"
        onDragOver={(e) => {
          e.preventDefault();
          if (dragRef.current?.sectionId === section.id) {
            setDragOver({ sectionId: section.id, index: section.questions.length });
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          const src = dragRef.current;
          if (src && src.sectionId === section.id) {
            reorderQuestions(section.id, src.index, section.questions.length);
          }
          setDragOver(null);
          dragRef.current = null;
        }}
      />
      <button
        type="button"
        onClick={() => addQuestion(section.id)}
        className="mt-2 flex items-center gap-2 rounded border border-dashed border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add question
      </button>
    </div>
  );
}

type Variant = 'free' | 'paid';

function normalizeSections(raw: unknown): Section[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s: Section) => ({ ...s, enabled: s.enabled !== false }));
}

export default function AdminQuestionsPage() {
  const [freeSections, setFreeSections] = useState<Section[]>([]);
  const [paidSections, setPaidSections] = useState<Section[]>([]);
  const [variant, setVariant] = useState<Variant>('free');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const dragRef = useRef<{ sectionId: string; index: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ sectionId: string; index: number } | null>(null);

  const questionnaire = variant === 'free' ? freeSections : paidSections;
  const setQuestionnaire = variant === 'free' ? setFreeSections : setPaidSections;

  useEffect(() => {
    fetch('/api/admin/questionnaire')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((d) => {
        const raw = d.questionnaire;
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          setFreeSections(normalizeSections(raw.free));
          setPaidSections(normalizeSections(raw.paid));
        } else {
          setFreeSections(normalizeSections(raw ?? []));
          setPaidSections([]);
        }
      })
      .catch(() => toast.error('Failed to load questionnaire'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        free: freeSections.map((s) => ({ ...s, enabled: s.enabled !== false })),
        paid: paidSections.map((s) => ({ ...s, enabled: s.enabled !== false })),
      };
      const res = await fetch('/api/admin/questionnaire', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionnaire: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      toast.success('Questionnaire saved');
      setEditingSection(null);
      setEditingQuestion(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function updateSection(sectionId: string, updates: Partial<Section>) {
    setQuestionnaire((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, ...updates } : s))
    );
  }

  function updateQuestion(sectionId: string, questionId: string, updates: Partial<Question>) {
    setQuestionnaire((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          questions: s.questions.map((q) =>
            q.id === questionId ? { ...q, ...updates } : q
          ),
        };
      })
    );
  }

  function reorderQuestions(sectionId: string, fromIndex: number, toIndex: number) {
    setQuestionnaire((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const qs = [...s.questions];
        const [removed] = qs.splice(fromIndex, 1);
        qs.splice(toIndex, 0, removed);
        return { ...s, questions: qs };
      })
    );
  }

  function addQuestion(sectionId: string) {
    const newId = `q_${Date.now()}`;
    const newQuestion: Question = {
      id: newId,
      statement: '',
      text: '',
      type: 'likert',
      active: true,
    };
    setQuestionnaire((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          questions: [...s.questions, newQuestion],
        };
      })
    );
    setEditingQuestion(newId);
  }

  function deleteQuestion(sectionId: string, questionId: string) {
    setQuestionnaire((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        return {
          ...s,
          questions: s.questions.filter((q) => q.id !== questionId),
        };
      })
    );
    if (editingQuestion === questionId) setEditingQuestion(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Question Bank</h1>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
            <button
              type="button"
              onClick={() => setVariant('free')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                variant === 'free'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Free Quiz
            </button>
            <button
              type="button"
              onClick={() => setVariant('paid')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                variant === 'paid'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Paid Quiz
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {questionnaire.map((section) => (
          <div
            key={section.id}
            className={`rounded-lg border overflow-hidden transition-opacity ${
              section.enabled === false
                ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 opacity-80'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="w-full flex items-center justify-between gap-4 p-4">
              <button
                type="button"
                className="flex-1 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors rounded -m-2 p-2"
                onClick={() =>
                  setEditingSection(editingSection === section.id ? null : section.id)
                }
              >
                <div>
                  <span className="font-medium">{section.name}</span>
                  <span className="text-sm text-slate-500 ml-2">
                    ({section.questions.length} questions)
                  </span>
                </div>
                <span className="text-slate-400 shrink-0">
                  {editingSection === section.id ? '−' : '+'}
                </span>
              </button>
              <div
                className="flex items-center gap-2 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xs text-slate-500">Enabled</span>
                <Switch
                  checked={section.enabled !== false}
                  onCheckedChange={(checked) =>
                    updateSection(section.id, { enabled: checked })
                  }
                />
              </div>
            </div>

            {editingSection === section.id && (
              <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">
                      Section ID
                    </label>
                    <input
                      type="text"
                      value={section.id}
                      onChange={(e) =>
                        updateSection(section.id, { id: e.target.value })
                      }
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={section.name}
                      onChange={(e) =>
                        updateSection(section.id, { name: e.target.value })
                      }
                      className="w-full rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <QuestionsList
                  section={section}
                  editingQuestion={editingQuestion}
                  setEditingQuestion={setEditingQuestion}
                  updateQuestion={updateQuestion}
                  reorderQuestions={reorderQuestions}
                  addQuestion={addQuestion}
                  deleteQuestion={deleteQuestion}
                  dragRef={dragRef}
                  dragOver={dragOver}
                  setDragOver={setDragOver}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
