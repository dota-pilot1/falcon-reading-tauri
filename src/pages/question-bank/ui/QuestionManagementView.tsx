import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock,
  FolderPlus,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { findCategoryNode, flattenCategoryTree } from "../../../entities/question/lib/categoryTree";
import { difficultyLabel, embeddingLabel, questionKindLabel, sourceLabel } from "../../../entities/question/lib/labels";
import type {
  CategoryNode,
  EmbeddingStatusResponse,
  QuestionDifficulty,
  QuestionResponse,
} from "../../../entities/question/model/types";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { Select, type SelectOption } from "../../../shared/ui/Select";

const QUESTION_DIFFICULTY_OPTIONS: SelectOption<QuestionDifficulty | "">[] = [
  { value: "", label: "전체 난이도" },
  { value: "easy", label: "하" },
  { value: "medium", label: "중" },
  { value: "hard", label: "상" },
];

type QuestionManagementViewProps = {
  subjects: CategoryNode[];
  selectedSubject: CategoryNode | null;
  selectedCategoryId: number | null;
  questionDifficulty: QuestionDifficulty | "";
  questionKeyword: string;
  questions: QuestionResponse[];
  questionsLoading: boolean;
  questionsError: string;
  questionActionBusy: string;
  embeddingStatus: EmbeddingStatusResponse;
  selectedEmbeddingStatus: EmbeddingStatusResponse;
  loading: boolean;
  error: string;
  isLoggedIn: boolean;
  canEdit: boolean;
  onOpenSubject: (subjectId: number) => void;
  onBackToSubjects: () => void;
  onSelectCategory: (categoryId: number | null) => void;
  onSetDifficulty: (difficulty: QuestionDifficulty | "") => void;
  onSetKeyword: (keyword: string) => void;
  onRefresh: () => void;
  onRefreshQuestions: () => void;
  onEmbedQuestion: (question: QuestionResponse) => void;
  onEmbedPending: () => void;
  onDeleteQuestion: (question: QuestionResponse) => void;
};

export function QuestionManagementView({
  subjects,
  selectedSubject,
  selectedCategoryId,
  questionDifficulty,
  questionKeyword,
  questions,
  questionsLoading,
  questionsError,
  questionActionBusy,
  embeddingStatus,
  selectedEmbeddingStatus,
  loading,
  error,
  isLoggedIn,
  canEdit,
  onOpenSubject,
  onBackToSubjects,
  onSelectCategory,
  onSetDifficulty,
  onSetKeyword,
  onRefresh,
  onRefreshQuestions,
  onEmbedQuestion,
  onEmbedPending,
  onDeleteQuestion,
}: QuestionManagementViewProps) {
  const categoryOptions = selectedSubject ? flattenCategoryTree([selectedSubject]) : [];
  const activeCategory = selectedCategoryId ? findCategoryNode(subjects, selectedCategoryId) : selectedSubject;
  const visibleEmbeddingStatus = selectedSubject ? selectedEmbeddingStatus : embeddingStatus;

  return (
    <section className="question-bank-view">
      <div className="question-bank-inner">
        <header className="question-bank-hero">
          <div>
            <div className="page-eyebrow">
              <BookOpenCheck size={16} />
              {selectedSubject ? "Question Bank Workspace" : "Question Bank PoC"}
            </div>
            <h1>{selectedSubject ? `${selectedSubject.name} 문제 은행` : "문제 은행"}</h1>
            <p>
              {selectedSubject
                ? `${activeCategory?.name ?? selectedSubject.name} 분류의 문제를 조회하고 임베딩 상태를 관리합니다.`
                : "과목을 선택해 분류 트리와 문제를 관리합니다. 과목은 카테고리 트리의 최상위 노드입니다."}
            </p>
          </div>
          <div className="embedding-summary">
            <EmbeddingCountCard kind="PENDING" count={visibleEmbeddingStatus.pending} />
            <EmbeddingCountCard kind="COMPLETED" count={visibleEmbeddingStatus.completed} />
            <EmbeddingCountCard kind="FAILED" count={visibleEmbeddingStatus.failed} />
          </div>
        </header>

        {!selectedSubject ? (
          <section className="subject-section">
            <div className="subject-toolbar">
              <h2>과목 ({subjects.length})</h2>
              <button type="button" disabled={!isLoggedIn} onClick={onRefresh}>
                <RefreshCw size={16} />
                새로고침
              </button>
              <button type="button" disabled title={canEdit ? "과목 추가 기능 준비 중입니다." : "편집 권한이 없습니다."}>
                <FolderPlus size={16} />
                과목 추가
              </button>
            </div>

            {loading ? (
              <div className="question-empty">
                <Loader2 className="spin" size={22} />
                <span>문제 은행 데이터를 불러오는 중</span>
              </div>
            ) : error ? (
              <div className="question-empty warning">
                <CircleAlert size={22} />
                <strong>문제 은행 데이터를 불러오지 못했습니다.</strong>
                <span>{error}</span>
              </div>
            ) : subjects.length === 0 ? (
              <div className="question-empty">
                <BookOpenCheck size={28} />
                <strong>아직 과목이 없습니다.</strong>
                <span>{isLoggedIn ? "우측 상단 버튼으로 첫 과목을 추가하세요." : "로그인 토큰을 입력하면 과목 관리 기능을 사용할 수 있습니다."}</span>
              </div>
            ) : (
              <div className="subject-grid">
                {subjects.map((subject, index) => (
                  <SubjectCard key={subject.id} subject={subject} index={index} onOpen={onOpenSubject} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="question-workspace">
            <div className="question-workspace-top">
              <Button type="button" variant="outline" onClick={onBackToSubjects}>
                <ArrowLeft size={16} />
                과목 목록
              </Button>
              <div className="question-workspace-actions">
                <Button type="button" variant="outline" onClick={onRefreshQuestions}>
                  <RefreshCw size={16} />
                  새로고침
                </Button>
                <Button
                  type="button"
                  disabled={!canEdit || questionActionBusy === "embed-pending"}
                  title={canEdit ? "대기 문항 임베딩" : "편집 권한이 없습니다."}
                  onClick={onEmbedPending}
                >
                  {questionActionBusy === "embed-pending" ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
                  대기 임베딩
                </Button>
                <Button type="button" disabled title={canEdit ? "문제 등록 기능 준비 중입니다." : "편집 권한이 없습니다."}>
                  <FolderPlus size={16} />
                  문제 등록
                </Button>
              </div>
            </div>

            <div className="question-manager-grid">
              <aside className="category-browser">
                <div className="category-browser-title">
                  <strong>분류</strong>
                  <span>{selectedSubject.subtreeCount}</span>
                </div>
                <button
                  type="button"
                  className={selectedCategoryId === null ? "active" : ""}
                  onClick={() => onSelectCategory(null)}
                >
                  <span>전체</span>
                  <small>{selectedSubject.subtreeCount}</small>
                </button>
                {categoryOptions.slice(1).map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={selectedCategoryId === category.id ? "active" : ""}
                    style={{ paddingLeft: 14 + category.depth * 14 }}
                    onClick={() => onSelectCategory(category.id)}
                  >
                    <span>{category.name}</span>
                    <small>{category.subtreeCount}</small>
                  </button>
                ))}
              </aside>

              <section className="question-list-panel">
                <div className="question-filterbar">
                  <Select
                    ariaLabel="난이도 필터"
                    className="question-filter-select"
                    options={QUESTION_DIFFICULTY_OPTIONS}
                    value={questionDifficulty}
                    onChange={onSetDifficulty}
                  />
                  <label className="question-search">
                    <Search size={16} />
                    <Input
                      className="h-auto border-0 bg-transparent px-0 py-0 focus:border-transparent focus:ring-0"
                      value={questionKeyword}
                      onChange={(event) => onSetKeyword(event.target.value)}
                      placeholder="문제/지문/정답/해설 검색"
                    />
                  </label>
                </div>

                {questionsLoading ? (
                  <div className="question-empty">
                    <Loader2 className="spin" size={22} />
                    <span>문제 목록을 불러오는 중</span>
                  </div>
                ) : questionsError ? (
                  <div className="question-empty warning">
                    <CircleAlert size={22} />
                    <strong>문제 목록을 불러오지 못했습니다.</strong>
                    <span>{questionsError}</span>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="question-empty">
                    <BookOpenCheck size={28} />
                    <strong>표시할 문제가 없습니다.</strong>
                    <span>분류나 검색 조건을 바꿔보세요.</span>
                  </div>
                ) : (
                  <div className="question-card-list">
                    {questions.map((question) => (
                      <QuestionCard
                        key={question.id}
                        question={question}
                        busy={questionActionBusy}
                        canEdit={canEdit}
                        onEmbed={onEmbedQuestion}
                        onDelete={onDeleteQuestion}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

function SubjectCard({
  subject,
  index,
  onOpen,
}: {
  subject: CategoryNode;
  index: number;
  onOpen: (subjectId: number) => void;
}) {
  const tones = ["sky", "amber", "emerald", "violet", "rose"];
  const tone = tones[index % tones.length];

  return (
    <button type="button" className="subject-card" onClick={() => onOpen(subject.id)}>
      <span className={`subject-badge ${tone}`}>{subject.name}</span>
      <div className="subject-card-body">
        <div>
          <strong>{subject.subtreeCount}</strong>
          <span>문제 · 하위 분류 {subject.children.length}개</span>
        </div>
        <span className="subject-manage">
          관리
          <ChevronRight size={16} />
        </span>
      </div>
    </button>
  );
}

function QuestionCard({
  question,
  busy,
  canEdit,
  onEmbed,
  onDelete,
}: {
  question: QuestionResponse;
  busy: string;
  canEdit: boolean;
  onEmbed: (question: QuestionResponse) => void;
  onDelete: (question: QuestionResponse) => void;
}) {
  const correctChoice = question.choices.find((choice) => choice === question.answer);
  return (
    <article className={`question-admin-card ${question.embeddingStatus.toLowerCase()}`}>
      <div className="question-admin-head">
        <div className="question-badges">
          <span>{question.categoryPath.slice(1).join(" > ") || "전체"}</span>
          <span className="kind">{questionKindLabel(question.questionKind)}</span>
          <span>{difficultyLabel(question.difficulty)}</span>
          <span className="source">{sourceLabel(question.sourceType, question.sourceName)}</span>
          <span className={question.embeddingStatus.toLowerCase()}>{embeddingLabel(question.embeddingStatus)}</span>
        </div>
        <div className="question-card-actions">
          <button
            type="button"
            disabled={!canEdit || busy === `embed:${question.id}`}
            title={canEdit ? "임베딩" : "편집 권한이 없습니다."}
            onClick={() => onEmbed(question)}
          >
            {busy === `embed:${question.id}` ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}
            임베딩
          </button>
          <button
            type="button"
            className="danger"
            disabled={!canEdit || busy === `delete:${question.id}`}
            title={canEdit ? "삭제" : "편집 권한이 없습니다."}
            onClick={() => onDelete(question)}
          >
            {busy === `delete:${question.id}` ? <Loader2 className="spin" size={15} /> : <Trash2 size={15} />}
          </button>
        </div>
      </div>

      <h3>{question.question}</h3>
      {question.passage && <p className="question-passage">{question.passage}</p>}

      {question.choices.length > 0 && (
        <div className="choice-grid">
          {question.choices.map((choice, index) => (
            <div key={`${question.id}-${choice}-${index}`} className={choice === correctChoice ? "correct" : ""}>
              {choice === correctChoice && <CheckCircle2 size={14} />}
              <span>{index + 1}. {choice}</span>
            </div>
          ))}
        </div>
      )}

      <div className="question-detail-grid">
        <div>
          <strong>정답</strong>
          <span>{question.answer}</span>
        </div>
        <div>
          <strong>키워드</strong>
          <span>{question.keywords.length > 0 ? question.keywords.join(", ") : "-"}</span>
        </div>
      </div>
      {question.explanation && (
        <div className="question-explanation">
          <strong>해설</strong>
          <span>{question.explanation}</span>
        </div>
      )}
    </article>
  );
}

function EmbeddingCountCard({
  kind,
  count,
}: {
  kind: "PENDING" | "COMPLETED" | "FAILED";
  count: number;
}) {
  const meta = {
    PENDING: { label: "대기", className: "pending", Icon: Clock },
    COMPLETED: { label: "완료", className: "completed", Icon: CheckCircle2 },
    FAILED: { label: "실패", className: "failed", Icon: CircleAlert },
  }[kind];
  const Icon = meta.Icon;

  return (
    <div className={`embedding-card ${meta.className}`}>
      <Icon size={14} />
      <span>{meta.label}</span>
      <strong>{count}</strong>
    </div>
  );
}
