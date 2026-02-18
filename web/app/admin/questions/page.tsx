'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { toast } from 'sonner';

interface Section {
  id: string;
  name: string;
  order_index: number;
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

export default function AdminQuestionsPage() {
  const [questionnaire, setQuestionnaire] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/questionnaire')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((d) => setQuestionnaire(d.questionnaire ?? []))
      .catch(() => toast.error('Failed to load questionnaire'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/questionnaire', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionnaire }),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Question Bank</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      <div className="space-y-4">
        {questionnaire.map((section) => (
          <div
            key={section.id}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
          >
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
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
              <span className="text-slate-400">
                {editingSection === section.id ? '−' : '+'}
              </span>
            </button>

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

                <div className="space-y-2">
                  {section.questions.map((q) => (
                    <div
                      key={q.id}
                      className="rounded border border-slate-200 dark:border-slate-700 p-3 space-y-2"
                    >
                      <button
                        type="button"
                        className="w-full flex items-center justify-between text-left"
                        onClick={() =>
                          setEditingQuestion(
                            editingQuestion === q.id ? null : q.id
                          )
                        }
                      >
                        <span className="font-mono text-xs text-slate-500">
                          {q.id}
                        </span>
                        <span className="text-sm truncate max-w-md">
                          {(q.statement ?? q.text ?? '').slice(0, 60)}…
                        </span>
                        <span>{editingQuestion === q.id ? '−' : '+'}</span>
                      </button>

                      {editingQuestion === q.id && (
                        <div className="pt-2 space-y-2 text-sm">
                          <div>
                            <label className="text-xs text-slate-500 block mb-1">
                              Statement
                            </label>
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
                          {q.type === 'likert' && (
                            <div>
                              <label className="text-xs text-slate-500 block mb-1">
                                Options (comma-separated)
                              </label>
                              <input
                                type="text"
                                value={(q.options ?? []).join(', ')}
                                onChange={(e) =>
                                  updateQuestion(section.id, q.id, {
                                    options: e.target.value
                                      .split(',')
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  })
                                }
                                placeholder="Very Inaccurate, Moderately Inaccurate, ..."
                                className="w-full rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2"
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={
                                  q.reverseScored ?? q.reverse_scored ?? false
                                }
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
                                  updateQuestion(section.id, q.id, {
                                    active: e.target.checked,
                                  })
                                }
                              />
                              <span className="text-xs">Active</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
