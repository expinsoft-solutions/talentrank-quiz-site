'use client';

import { useEffect, useRef, useState } from 'react';
import { GripVertical, ImagePlus, Plus, Trash2 } from 'lucide-react';
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
  imageUrl?: string | null;
  imageUrls?: string[];
  optionImageUrls?: (string | null)[];
}

function QuestionsList({
  section,
  editingQuestion,
  setEditingQuestion,
  updateQuestion,
  reorderQuestions,
  addQuestion,
  deleteQuestion,
  onUploadImage,
  onUploadOptionImage,
  onRemoveImage,
  onRemoveOptionImage,
  uploadingImageQuestionId,
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
  onUploadImage: (sectionId: string, questionId: string, files: File[]) => Promise<void>;
  onUploadOptionImage: (
    sectionId: string,
    questionId: string,
    optionIndex: number,
    file: File
  ) => Promise<void>;
  onRemoveImage: (
    sectionId: string,
    questionId: string,
    imageUrl: string,
    imageIndex: number
  ) => Promise<void>;
  onRemoveOptionImage: (
    sectionId: string,
    questionId: string,
    optionIndex: number,
    imageUrl: string
  ) => Promise<void>;
  uploadingImageQuestionId: string | null;
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
                            const baseOptionImages = q.optionImageUrls ?? [];
                            const opts =
                              newType === 'mcq'
                                ? [...baseOpts, '', '', ''].slice(0, 4)
                                : newType === 'binary'
                                  ? [...baseOpts, ''].slice(0, 2)
                                  : newType === 'text'
                                    ? baseOpts
                                    : [];
                            const optionImageUrls =
                              newType === 'mcq'
                                ? [...baseOptionImages, null, null, null].slice(0, 4)
                                : newType === 'binary'
                                  ? [...baseOptionImages, null].slice(0, 2)
                                  : [];
                            updateQuestion(section.id, q.id, {
                              type: newType,
                              options: newType === 'likert' ? [] : opts,
                              optionImageUrls,
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
                      <div className="md:col-span-2">
                        <label className="text-xs text-slate-500 block mb-1">Question image</label>
                        <label className="inline-flex items-center gap-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer w-fit">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            multiple
                            className="hidden"
                            disabled={uploadingImageQuestionId === `${section.id}:${q.id}`}
                            onChange={(e) => {
                              const files = e.target.files ? Array.from(e.target.files) : [];
                              if (files.length > 0) {
                                onUploadImage(section.id, q.id, files);
                                e.target.value = '';
                              }
                            }}
                          />
                          {uploadingImageQuestionId === `${section.id}:${q.id}` ? (
                            <Loader size="sm" />
                          ) : (
                            <ImagePlus className="h-4 w-4" />
                          )}
                          {uploadingImageQuestionId === `${section.id}:${q.id}` ? 'Uploading…' : 'Upload images'}
                        </label>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Optional. JPEG, PNG, WebP or GIF, max 5MB.
                        </p>
                        {(q.imageUrls && q.imageUrls.length > 0) ||
                        (q.imageUrl && q.imageUrl.trim()) ? (
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(q.imageUrls && q.imageUrls.length > 0
                              ? q.imageUrls
                              : q.imageUrl && q.imageUrl.trim()
                                ? [q.imageUrl]
                                : []
                            ).map((img, idx) => (
                              <div key={`${img}-${idx}`} className="flex items-center gap-2">
                                <img
                                  src={img}
                                  alt=""
                                  className="max-h-24 rounded border border-slate-200 dark:border-slate-700 object-contain"
                                />
                                <button
                                  type="button"
                                  onClick={() => onRemoveImage(section.id, q.id, img, idx)}
                                  disabled={uploadingImageQuestionId === `${section.id}:${q.id}:remove:${idx}`}
                                  className="text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {q.type === 'mcq' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[0, 1, 2, 3].map((i) => {
                          const opts = [...(q.options ?? []), '', '', ''].slice(0, 4);
                          const optionImages = [...(q.optionImageUrls ?? []), null, null, null].slice(0, 4);
                          const optionImageUrl = optionImages[i];
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
                              <div className="mt-2 flex items-center gap-2">
                                <label className="inline-flex items-center gap-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer w-fit">
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    className="hidden"
                                    disabled={uploadingImageQuestionId === `${section.id}:${q.id}:option:${i}`}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) {
                                        onUploadOptionImage(section.id, q.id, i, f);
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                  {uploadingImageQuestionId === `${section.id}:${q.id}:option:${i}` ? (
                                    <Loader size="sm" />
                                  ) : (
                                    <ImagePlus className="h-3.5 w-3.5" />
                                  )}
                                  {uploadingImageQuestionId === `${section.id}:${q.id}:option:${i}` ? 'Uploading…' : 'Upload image'}
                                </label>
                                {optionImageUrl ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      optionImageUrl &&
                                      onRemoveOptionImage(section.id, q.id, i, optionImageUrl)
                                    }
                                    disabled={
                                      uploadingImageQuestionId === `${section.id}:${q.id}:option:${i}:remove`
                                    }
                                    className="text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                                  >
                                    Remove image
                                  </button>
                                ) : null}
                              </div>
                              {optionImageUrl ? (
                                <img
                                  src={optionImageUrl}
                                  alt=""
                                  className="mt-2 max-h-20 rounded border border-slate-200 dark:border-slate-700 object-contain"
                                />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {q.type === 'binary' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[0, 1].map((i) => {
                          const opts = [...(q.options ?? []), ''].slice(0, 2);
                          const optionImages = [...(q.optionImageUrls ?? []), null].slice(0, 2);
                          const optionImageUrl = optionImages[i];
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
                              <div className="mt-2 flex items-center gap-2">
                                <label className="inline-flex items-center gap-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer w-fit">
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    className="hidden"
                                    disabled={uploadingImageQuestionId === `${section.id}:${q.id}:option:${i}`}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) {
                                        onUploadOptionImage(section.id, q.id, i, f);
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                  {uploadingImageQuestionId === `${section.id}:${q.id}:option:${i}` ? (
                                    <Loader size="sm" />
                                  ) : (
                                    <ImagePlus className="h-3.5 w-3.5" />
                                  )}
                                  {uploadingImageQuestionId === `${section.id}:${q.id}:option:${i}` ? 'Uploading…' : 'Upload image'}
                                </label>
                                {optionImageUrl ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      optionImageUrl &&
                                      onRemoveOptionImage(section.id, q.id, i, optionImageUrl)
                                    }
                                    disabled={
                                      uploadingImageQuestionId === `${section.id}:${q.id}:option:${i}:remove`
                                    }
                                    className="text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                                  >
                                    Remove image
                                  </button>
                                ) : null}
                              </div>
                              {optionImageUrl ? (
                                <img
                                  src={optionImageUrl}
                                  alt=""
                                  className="mt-2 max-h-20 rounded border border-slate-200 dark:border-slate-700 object-contain"
                                />
                              ) : null}
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
  return raw.map((s: Section) => ({
    ...s,
    enabled: s.enabled !== false,
    questions: (s.questions ?? []).map((q) => {
      const imageUrls =
        Array.isArray((q as unknown as { imageUrls?: unknown }).imageUrls)
          ? ((q as unknown as { imageUrls?: unknown[] }).imageUrls ?? [])
              .map((u) => String(u).trim())
              .filter(Boolean)
          : typeof (q as unknown as { image_url?: unknown }).image_url === 'string'
            ? [String((q as unknown as { image_url?: unknown }).image_url).trim()].filter(Boolean)
            : q.imageUrl && q.imageUrl.trim()
              ? [q.imageUrl]
              : [];
      return {
        ...q,
        imageUrl: imageUrls[0] ?? null,
        imageUrls,
      };
    }),
  }));
}

export default function AdminQuestionsPage() {
  const [freeSections, setFreeSections] = useState<Section[]>([]);
  const [paidSections, setPaidSections] = useState<Section[]>([]);
  const [variant, setVariant] = useState<Variant>('free');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [uploadingImageQuestionId, setUploadingImageQuestionId] = useState<string | null>(null);
  const dragRef = useRef<{ sectionId: string; index: number } | null>(null);
  const [dragOver, setDragOver] = useState<{ sectionId: string; index: number } | null>(null);

  async function handleUploadQuestionImage(sectionId: string, questionId: string, files: File[]) {
    const key = `${sectionId}:${questionId}`;
    setUploadingImageQuestionId(key);
    const uploadedUrls: string[] = [];
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.set('file', file);
        const res = await fetch('/api/admin/upload-question-image', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error ?? 'Upload failed');
        }
        if (typeof data.url === 'string') {
          uploadedUrls.push(data.url);
        }
      }
      if (uploadedUrls.length > 0) {
        setQuestionnaire((prev) =>
          prev.map((s) => {
            if (s.id !== sectionId) return s;
            return {
              ...s,
              questions: s.questions.map((q) => {
                if (q.id !== questionId) return q;
                const existing =
                  q.imageUrls && q.imageUrls.length > 0
                    ? q.imageUrls
                    : q.imageUrl && q.imageUrl.trim()
                      ? [q.imageUrl]
                      : [];
                const imageUrls = [...existing, ...uploadedUrls];
                return { ...q, imageUrl: imageUrls[0] ?? null, imageUrls };
              }),
            };
          })
        );
        toast.success(uploadedUrls.length === 1 ? 'Image uploaded' : 'Images uploaded');
      }
    } catch (e) {
      if (uploadedUrls.length > 0) {
        await Promise.allSettled(uploadedUrls.map((url) => deleteImageFromS3(url)));
      }
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploadingImageQuestionId(null);
    }
  }

  async function handleUploadOptionImage(
    sectionId: string,
    questionId: string,
    optionIndex: number,
    file: File
  ) {
    const key = `${sectionId}:${questionId}:option:${optionIndex}`;
    setUploadingImageQuestionId(key);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const res = await fetch('/api/admin/upload-question-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Upload failed');
        return;
      }
      if (typeof data.url === 'string') {
        setQuestionnaire((prev) =>
          prev.map((s) => {
            if (s.id !== sectionId) return s;
            return {
              ...s,
              questions: s.questions.map((q) => {
                if (q.id !== questionId) return q;
                const next = [...(q.optionImageUrls ?? []), null, null, null];
                next[optionIndex] = data.url;
                const maxLen = q.type === 'binary' ? 2 : q.type === 'mcq' ? 4 : next.length;
                const nextOptions = [...(q.options ?? []), '', '', '', ''].slice(0, maxLen);
                if (nextOptions[optionIndex] === undefined) nextOptions[optionIndex] = '';
                return { ...q, options: nextOptions, optionImageUrls: next.slice(0, maxLen) };
              }),
            };
          })
        );
        toast.success('Image uploaded');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingImageQuestionId(null);
    }
  }

  async function deleteImageFromS3(url: string) {
    const res = await fetch('/api/admin/upload-question-image', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? 'Failed to delete image');
    }
  }

  async function handleRemoveQuestionImage(
    sectionId: string,
    questionId: string,
    imageUrl: string,
    imageIndex: number
  ) {
    const key = `${sectionId}:${questionId}:remove:${imageIndex}`;
    setUploadingImageQuestionId(key);
    try {
      await deleteImageFromS3(imageUrl);
      setQuestionnaire((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s;
          return {
            ...s,
            questions: s.questions.map((q) => {
              if (q.id !== questionId) return q;
              const existing =
                q.imageUrls && q.imageUrls.length > 0
                  ? [...q.imageUrls]
                  : q.imageUrl && q.imageUrl.trim()
                    ? [q.imageUrl]
                    : [];
              existing.splice(imageIndex, 1);
              return {
                ...q,
                imageUrl: existing[0] ?? null,
                imageUrls: existing,
              };
            }),
          };
        })
      );
      toast.success('Image removed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove image');
    } finally {
      setUploadingImageQuestionId(null);
    }
  }

  async function handleRemoveOptionImage(
    sectionId: string,
    questionId: string,
    optionIndex: number,
    imageUrl: string
  ) {
    const key = `${sectionId}:${questionId}:option:${optionIndex}:remove`;
    setUploadingImageQuestionId(key);
    try {
      await deleteImageFromS3(imageUrl);
      setQuestionnaire((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s;
          return {
            ...s,
            questions: s.questions.map((q) => {
              if (q.id !== questionId) return q;
              const next = [...(q.optionImageUrls ?? []), null, null, null];
              next[optionIndex] = null;
              const maxLen = q.type === 'binary' ? 2 : q.type === 'mcq' ? 4 : next.length;
              return { ...q, optionImageUrls: next.slice(0, maxLen) };
            }),
          };
        })
      );
      toast.success('Image removed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove image');
    } finally {
      setUploadingImageQuestionId(null);
    }
  }

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
                  onUploadImage={handleUploadQuestionImage}
                  onUploadOptionImage={handleUploadOptionImage}
                  onRemoveImage={handleRemoveQuestionImage}
                  onRemoveOptionImage={handleRemoveOptionImage}
                  uploadingImageQuestionId={uploadingImageQuestionId}
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
