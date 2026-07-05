import { ArrowLeft, ClipboardList, FilePlus2, Loader2, Lock, Pencil, PlayCircle, RefreshCw, Save, Trash2 } from "lucide-react";
import type { CategoryNode, QuestionResponse } from "../../../entities/question/model/types";
import { flattenCategoryTree } from "../../../entities/question/lib/categoryTree";
import type { ExamItemResponse, ExamResponse, ExamStatus } from "../../../entities/exam/model/types";
import { formatShortDate } from "../../../shared/lib/format";
import { Button } from "../../../shared/ui/Button";
import { Dialog, DialogContent } from "../../../shared/ui/Dialog";
import { Input } from "../../../shared/ui/Input";
import { Textarea } from "../../../shared/ui/Textarea";

type CreateExamDraft = {
  title: string;
  description: string;
  timeLimitMinutes: string;
};

type ExamManagementViewProps = {
  exams: ExamResponse[];
  loading: boolean;
  error: string;
  actionBusy: string;
  createDraft: CreateExamDraft | null;
  builderExam: ExamResponse | null;
  builderItems: Array<{ questionId: string; points: number }>;
  builderLoading: boolean;
  builderError: string;
  builderCategories: CategoryNode[];
  builderCategoryId: number | null;
  builderKeyword: string;
  builderQuestions: QuestionResponse[];
  builderQuestionsLoading: boolean;
  canEdit: boolean;
  onRefresh: () => void;
  onOpenCreate: () => void;
  onCloseCreate: () => void;
  onSetCreateDraft: (draft: CreateExamDraft) => void;
  onCreate: () => void;
  onOpenBuilder: (exam: ExamResponse) => void;
  onCloseBuilder: () => void;
  onSetBuilderCategoryId: (categoryId: number | null) => void;
  onSetBuilderKeyword: (keyword: string) => void;
  onAddBuilderQuestion: (question: QuestionResponse) => void;
  onRemoveBuilderQuestion: (questionId: string) => void;
  onSetBuilderQuestionPoints: (questionId: string, points: number) => void;
  onSaveBuilder: () => void;
  onPublish: (exam: ExamResponse) => void;
  onRepublish: (exam: ExamResponse) => void;
  onClose: (exam: ExamResponse) => void;
  onDelete: (exam: ExamResponse) => void;
};

const STATUS_META: Record<ExamStatus, { label: string; className: string }> = {
  DRAFT: { label: "초안", className: "draft" },
  PUBLISHED: { label: "발행", className: "published" },
  CLOSED: { label: "응시 종료", className: "closed" },
};

export function ExamManagementView({
  exams,
  loading,
  error,
  actionBusy,
  createDraft,
  builderExam,
  builderItems,
  builderLoading,
  builderError,
  builderCategories,
  builderCategoryId,
  builderKeyword,
  builderQuestions,
  builderQuestionsLoading,
  canEdit,
  onRefresh,
  onOpenCreate,
  onCloseCreate,
  onSetCreateDraft,
  onCreate,
  onOpenBuilder,
  onCloseBuilder,
  onSetBuilderCategoryId,
  onSetBuilderKeyword,
  onAddBuilderQuestion,
  onRemoveBuilderQuestion,
  onSetBuilderQuestionPoints,
  onSaveBuilder,
  onPublish,
  onRepublish,
  onClose,
  onDelete,
}: ExamManagementViewProps) {
  const draftCount = exams.filter((exam) => exam.status === "DRAFT").length;
  const publishedCount = exams.filter((exam) => exam.status === "PUBLISHED").length;
  const closedCount = exams.filter((exam) => exam.status === "CLOSED").length;

  if (builderExam || builderLoading || builderError) {
    return (
      <ExamBuilderView
        actionBusy={actionBusy}
        categories={builderCategories}
        categoryId={builderCategoryId}
        error={builderError}
        exam={builderExam}
        items={builderItems}
        keyword={builderKeyword}
        loading={builderLoading}
        questions={builderQuestions}
        questionsLoading={builderQuestionsLoading}
        canEdit={canEdit}
        onAddQuestion={onAddBuilderQuestion}
        onBack={onCloseBuilder}
        onRemoveQuestion={onRemoveBuilderQuestion}
        onSave={onSaveBuilder}
        onSetCategoryId={onSetBuilderCategoryId}
        onSetKeyword={onSetBuilderKeyword}
        onSetPoints={onSetBuilderQuestionPoints}
      />
    );
  }

  return (
    <section className="exam-management-view">
      <div className="exam-management-inner">
        <header className="exam-management-hero">
          <div>
            <h1>시험 관리</h1>
            <p>시험지를 만들고 문항 구성, 발행, 응시 종료 상태를 관리합니다.</p>
          </div>
          <div className="exam-management-stats">
            <span>전체 <strong>{exams.length}</strong></span>
            <span>초안 <strong>{draftCount}</strong></span>
            <span>발행 <strong>{publishedCount}</strong></span>
            <span>응시 종료 <strong>{closedCount}</strong></span>
          </div>
        </header>

        <div className="exam-management-toolbar">
          <h2>시험지 목록</h2>
          <div>
            <Button type="button" variant="outline" onClick={onRefresh}>
              <RefreshCw size={16} />
              새로고침
            </Button>
            <Button
              type="button"
              disabled={!canEdit}
              title={canEdit ? "시험지 만들기" : "편집 권한이 없습니다."}
              onClick={onOpenCreate}
            >
              <FilePlus2 size={16} />
              시험지 만들기
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="exam-management-empty">
            <Loader2 className="spin" size={24} />
            <span>시험지 목록을 불러오는 중</span>
          </div>
        ) : error ? (
          <div className="exam-management-empty warning">
            <strong>시험지 목록을 불러오지 못했습니다.</strong>
            <span>{error}</span>
          </div>
        ) : exams.length === 0 ? (
          <div className="exam-management-empty">
            <ClipboardList size={28} />
            <strong>아직 시험지가 없습니다.</strong>
            <span>시험지를 만든 뒤 문제 은행 문항을 연결하고 발행하세요.</span>
          </div>
        ) : (
          <div className="exam-management-grid">
            {exams.map((exam) => (
              <ManagedExamCard
                key={exam.id}
                exam={exam}
                actionBusy={actionBusy}
                canEdit={canEdit}
                onOpenBuilder={onOpenBuilder}
                onPublish={onPublish}
                onRepublish={onRepublish}
                onClose={onClose}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>

      {createDraft && (
        <Dialog onClick={onCloseCreate}>
          <DialogContent className="max-w-[520px] p-5" onClick={(event) => event.stopPropagation()}>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onCreate();
              }}
            >
              <div className="mb-4">
                <h2 className="m-0 text-xl font-black text-zinc-900">시험지 만들기</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">초안으로 저장한 뒤 문항 구성 화면에서 문제를 연결합니다.</p>
              </div>

              <label className="mb-3 grid gap-1.5 text-sm font-extrabold text-zinc-900">
                시험지 제목
                <Input
                  autoFocus
                  value={createDraft.title}
                  onChange={(event) => onSetCreateDraft({ ...createDraft, title: event.target.value })}
                  placeholder="예: 6월 영어 월말 평가"
                />
              </label>
              <label className="mb-3 grid gap-1.5 text-sm font-extrabold text-zinc-900">
                설명
                <Textarea
                  value={createDraft.description}
                  onChange={(event) => onSetCreateDraft({ ...createDraft, description: event.target.value })}
                  placeholder="시험 안내나 범위를 적어두세요."
                />
              </label>
              <label className="mb-3 grid gap-1.5 text-sm font-extrabold text-zinc-900">
                제한 시간(분)
                <Input
                  value={createDraft.timeLimitMinutes}
                  onChange={(event) => onSetCreateDraft({ ...createDraft, timeLimitMinutes: event.target.value })}
                  placeholder="10"
                  type="number"
                  min="1"
                />
              </label>

              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onCloseCreate}>
                  취소
                </Button>
                <Button type="submit" disabled={actionBusy === "create" || !createDraft.title.trim()}>
                  {actionBusy === "create" ? <Loader2 className="spin" size={16} /> : <FilePlus2 size={16} />}
                  만들기
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}

function ManagedExamCard({
  exam,
  actionBusy,
  canEdit,
  onOpenBuilder,
  onPublish,
  onRepublish,
  onClose,
  onDelete,
}: {
  exam: ExamResponse;
  actionBusy: string;
  canEdit: boolean;
  onOpenBuilder: (exam: ExamResponse) => void;
  onPublish: (exam: ExamResponse) => void;
  onRepublish: (exam: ExamResponse) => void;
  onClose: (exam: ExamResponse) => void;
  onDelete: (exam: ExamResponse) => void;
}) {
  const status = STATUS_META[exam.status];
  const busyForExam = actionBusy.endsWith(`:${exam.id}`);
  const canChangeDraft = canEdit && exam.status === "DRAFT";

  return (
    <article className="managed-exam-card">
      <div className="managed-exam-head">
        <small>{formatShortDate(exam.updatedAt)}</small>
      </div>
      <h3>{exam.title}</h3>
      {exam.description && <p>{exam.description}</p>}
      <div className="managed-exam-meta">
        <span>{exam.subjectName ?? "전체 과목"}</span>
        <span>문항 {exam.itemCount}개</span>
        <span>{exam.totalPoints}점</span>
        <span>{exam.timeLimitMinutes ? `${exam.timeLimitMinutes}분` : "시간 무제한"}</span>
      </div>
      <div className="managed-exam-actions">
        <span className={`exam-status ${status.className}`}>{status.label}</span>
        {!canEdit && <span className="exam-status readonly">읽기 전용</span>}
        <Button type="button" variant="outline" disabled={busyForExam} onClick={() => onOpenBuilder(exam)}>
          <Pencil size={16} />
          문항 구성
        </Button>
        {canChangeDraft && (
          <Button type="button" disabled={busyForExam || exam.itemCount === 0} onClick={() => onPublish(exam)}>
            {actionBusy === `publish:${exam.id}` ? <Loader2 className="spin" size={16} /> : <PlayCircle size={16} />}
            발행
          </Button>
        )}
        {canEdit && exam.status === "PUBLISHED" && (
          <Button type="button" variant="outline" disabled={busyForExam} onClick={() => onClose(exam)}>
            {actionBusy === `close:${exam.id}` ? <Loader2 className="spin" size={16} /> : <Lock size={16} />}
            응시 종료
          </Button>
        )}
        {canEdit && exam.status === "CLOSED" && (
          <Button type="button" disabled={busyForExam || exam.itemCount === 0} onClick={() => onRepublish(exam)}>
            {actionBusy === `republish:${exam.id}` ? <Loader2 className="spin" size={16} /> : <PlayCircle size={16} />}
            다시 발행
          </Button>
        )}
        {canEdit && (
          <Button type="button" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" disabled={busyForExam} onClick={() => onDelete(exam)}>
            {actionBusy === `delete:${exam.id}` ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
            삭제
          </Button>
        )}
      </div>
    </article>
  );
}

function ExamBuilderView({
  exam,
  items,
  loading,
  error,
  actionBusy,
  categories,
  categoryId,
  keyword,
  questions,
  questionsLoading,
  canEdit,
  onBack,
  onSetCategoryId,
  onSetKeyword,
  onAddQuestion,
  onRemoveQuestion,
  onSetPoints,
  onSave,
}: {
  exam: ExamResponse | null;
  items: Array<{ questionId: string; points: number }>;
  loading: boolean;
  error: string;
  actionBusy: string;
  categories: CategoryNode[];
  categoryId: number | null;
  keyword: string;
  questions: QuestionResponse[];
  questionsLoading: boolean;
  canEdit: boolean;
  onBack: () => void;
  onSetCategoryId: (categoryId: number | null) => void;
  onSetKeyword: (keyword: string) => void;
  onAddQuestion: (question: QuestionResponse) => void;
  onRemoveQuestion: (questionId: string) => void;
  onSetPoints: (questionId: string, points: number) => void;
  onSave: () => void;
}) {
  const flatCategories = flattenCategoryTree(categories);
  const editable = canEdit && exam?.status === "DRAFT";
  const lockedReason = canEdit ? "발행 또는 응시 종료되어 수정 불가" : "편집 권한 없음";
  const itemDetails = buildBuilderItems(exam?.items ?? [], questions, items);
  const selectedIds = new Set(items.map((item) => item.questionId));
  const totalPoints = items.reduce((sum, item) => sum + item.points, 0);

  return (
    <section className="exam-management-view">
      <div className="exam-builder-inner">
        <header className="exam-builder-header">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft size={16} />
            시험지 목록
          </Button>
          <div>
            <h1>{exam?.title ?? "시험지 문항 구성"}</h1>
            <p>{loading ? "시험지를 불러오는 중" : `${items.length}문항 · ${totalPoints}점 · ${editable ? "초안 편집 가능" : lockedReason}`}</p>
          </div>
          {editable ? (
            <Button type="button" disabled={actionBusy === `save:${exam?.id}`} onClick={onSave}>
              {actionBusy === `save:${exam?.id}` ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
              저장
            </Button>
          ) : (
            <span className="exam-builder-readonly">
              <Lock size={14} />
              {lockedReason}
            </span>
          )}
        </header>

        {error && (
          <div className="practice-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="exam-management-empty">
            <Loader2 className="spin" size={24} />
            <span>시험지 문항을 불러오는 중</span>
          </div>
        ) : (
          <div className={`exam-builder-grid ${editable ? "" : "readonly"}`}>
            <section className="exam-builder-paper">
              <div className="exam-builder-section-title">
                <h2>시험지 문항</h2>
                <span>{items.length}문항 · {totalPoints}점</span>
              </div>

              {itemDetails.length === 0 ? (
                <div className="exam-management-empty compact">
                  <strong>아직 문항이 없습니다.</strong>
                  <span>오른쪽 문제 은행에서 문항을 추가하세요.</span>
                </div>
              ) : (
                <div className="exam-builder-item-list">
                  {itemDetails.map((item, index) => (
                    <article key={item.questionId} className="exam-builder-item">
                      <div className="exam-builder-item-head">
                        <span>{index + 1}</span>
                        <div>
                          <h3>{item.question}</h3>
                          <small>{item.categoryPath.join(" > ") || "전체"} · 정답 {item.answer || "-"}</small>
                        </div>
                      </div>
                      {item.passage && <p className="exam-builder-passage">{item.passage}</p>}
                      {item.choices.length > 0 && (
                        <div className="exam-builder-choices">
                          {item.choices.map((choice, choiceIndex) => (
                            <span key={`${item.questionId}-${choiceIndex}`} className={choice === item.answer ? "correct" : ""}>
                              {choiceIndex + 1}. {choice}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.explanation && (
                        <p className="exam-builder-explanation">
                          <strong>해설</strong>
                          {item.explanation}
                        </p>
                      )}
                      <div className="exam-builder-item-actions">
                        <label>
                          배점
                          <Input
                            className="h-9 w-20"
                            disabled={!editable}
                            min="1"
                            type="number"
                            value={item.points}
                            onChange={(event) => onSetPoints(item.questionId, Number(event.target.value))}
                          />
                        </label>
                        {editable && (
                          <Button type="button" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => onRemoveQuestion(item.questionId)}>
                            <Trash2 size={15} />
                            제거
                          </Button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {editable && (
              <aside className="exam-builder-bank">
                <div className="exam-builder-section-title">
                  <h2>문제 은행</h2>
                  <span>추가 가능</span>
                </div>
                <select
                  value={categoryId ?? ""}
                  onChange={(event) => onSetCategoryId(event.target.value ? Number(event.target.value) : null)}
                >
                  <option value="">분류 선택</option>
                  {flatCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {"　".repeat(category.depth)}{category.name} ({category.subtreeCount})
                    </option>
                  ))}
                </select>
                <Input
                  value={keyword}
                  onChange={(event) => onSetKeyword(event.target.value)}
                  placeholder="문제/지문 검색"
                />

                <div className="exam-builder-question-list">
                  {questionsLoading ? (
                    <div className="exam-management-empty compact">
                      <Loader2 className="spin" size={20} />
                      <span>문항을 불러오는 중</span>
                    </div>
                  ) : categoryId === null ? (
                    <div className="exam-management-empty compact">
                      <span>분류를 선택하세요.</span>
                    </div>
                  ) : questions.length === 0 ? (
                    <div className="exam-management-empty compact">
                      <span>추가할 문항이 없습니다.</span>
                    </div>
                  ) : (
                    questions.map((question) => (
                      <button
                        key={question.id}
                        type="button"
                        disabled={selectedIds.has(question.id)}
                        onClick={() => onAddQuestion(question)}
                      >
                        <strong>{question.question}</strong>
                        <span>{question.categoryPath.join(" > ")} · 정답 {question.answer || "-"}</span>
                      </button>
                    ))
                  )}
                </div>
              </aside>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function buildBuilderItems(
  examItems: ExamItemResponse[],
  questions: QuestionResponse[],
  items: Array<{ questionId: string; points: number }>
) {
  return items.map((item) => {
    const examItem = examItems.find((candidate) => candidate.questionId === item.questionId);
    const question = questions.find((candidate) => candidate.id === item.questionId);
    return {
      questionId: item.questionId,
      points: item.points,
      question: examItem?.question ?? question?.question ?? "문항 정보를 불러오지 못했습니다.",
      passage: examItem?.passage ?? question?.passage ?? null,
      choices: examItem?.choices ?? question?.choices ?? [],
      answer: examItem?.answer ?? question?.answer ?? "",
      explanation: examItem?.explanation ?? question?.explanation ?? "",
      categoryPath: examItem?.categoryPath ?? question?.categoryPath ?? [],
    };
  });
}
