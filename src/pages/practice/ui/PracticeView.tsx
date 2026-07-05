import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Clock,
  FileText,
  History as HistoryIcon,
  Loader2,
  PlayCircle,
  RefreshCw,
  Send,
  Trophy,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type {
  AttemptResultResponse,
  AttemptSummaryResponse,
  ExamResponse,
  ExamTakeResponse,
  TakeItem,
} from "../../../entities/exam/model/types";
import { formatShortDate } from "../../../shared/lib/format";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";

type PracticeViewProps = {
  exams: ExamResponse[];
  subjectGroups: { key: string; name: string; count: number }[];
  selectedSubject: string;
  attempts: AttemptSummaryResponse[];
  stats: { available: number; submitted: number; averageRate: number | null };
  loading: boolean;
  error: string;
  take: ExamTakeResponse | null;
  takeLoading: boolean;
  result: AttemptResultResponse | null;
  answers: Record<string, string>;
  submitting: boolean;
  onSelectSubject: (subject: string) => void;
  onRefresh: () => void;
  onStartExam: (exam: ExamResponse) => void;
  onBackToList: () => void;
  onSetAnswer: (questionId: string, answer: string) => void;
  onSubmit: () => void;
};

export function PracticeView({
  exams,
  subjectGroups,
  selectedSubject,
  attempts,
  stats,
  loading,
  error,
  take,
  takeLoading,
  result,
  answers,
  submitting,
  onSelectSubject,
  onRefresh,
  onStartExam,
  onBackToList,
  onSetAnswer,
  onSubmit,
}: PracticeViewProps) {
  if (take && result) {
    return <AttemptResultView result={result} onBackToList={onBackToList} />;
  }

  if (take) {
    return (
      <ExamTakeView
        take={take}
        answers={answers}
        submitting={submitting}
        error={error}
        onBackToList={onBackToList}
        onSetAnswer={onSetAnswer}
        onSubmit={onSubmit}
      />
    );
  }

  return (
    <section className="practice-view">
      <div className="practice-inner">
        <header className="practice-hero">
          <div>
            <h1>시험 응시</h1>
            <p>발행된 시험지를 선택해 풀이를 시작하고 자동 채점 결과를 확인합니다.</p>
          </div>
          <div className="practice-stats">
            <PracticeStat label="응시 가능" value={String(stats.available)} icon={FileText} />
            <PracticeStat label="완료" value={String(stats.submitted)} icon={CheckCircle2} />
            <PracticeStat label="평균" value={stats.averageRate === null ? "-" : `${stats.averageRate}%`} icon={Trophy} />
          </div>
        </header>

        <div className="practice-layout">
          <aside className="practice-subjects">
            <div className="category-browser-title">
              <strong>과목</strong>
              <span>{stats.available}</span>
            </div>
            <button
              type="button"
              className={selectedSubject === "all" ? "active" : ""}
              onClick={() => onSelectSubject("all")}
            >
              <span>전체</span>
              <small>{stats.available}</small>
            </button>
            {subjectGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                className={selectedSubject === group.key ? "active" : ""}
                onClick={() => onSelectSubject(group.key)}
              >
                <span>{group.name}</span>
                <small>{group.count}</small>
              </button>
            ))}
          </aside>

          <section className="practice-main">
            <div className="practice-toolbar">
              <h2>풀 수 있는 시험</h2>
              <Button type="button" variant="outline" onClick={onRefresh}>
                <RefreshCw size={16} />
                새로고침
              </Button>
            </div>

            {takeLoading || loading ? (
              <PracticeEmpty icon={Loader2} spin title="불러오는 중" body="응시 가능한 시험지를 확인하고 있습니다." />
            ) : error ? (
              <PracticeEmpty icon={CircleAlert} title="응시 데이터를 불러오지 못했습니다." body={error} warning />
            ) : exams.length === 0 ? (
              <PracticeEmpty
                icon={FileText}
                title="아직 풀 수 있는 시험이 없습니다."
                body="웹 관리자 화면에서 시험지를 발행하면 이곳에서 바로 응시할 수 있습니다."
              />
            ) : (
              <div className="practice-exam-list">
                {exams.map((exam) => (
                  <PracticeExamCard
                    key={exam.id}
                    exam={exam}
                    latestAttempt={attempts.find((attempt) => attempt.examId === exam.id)}
                    onStart={onStartExam}
                  />
                ))}
              </div>
            )}
          </section>

          <aside className="practice-history">
            <div className="panel-title">
              <strong>최근 학습 기록</strong>
              <HistoryIcon size={16} />
            </div>
            {attempts.length === 0 ? (
              <p className="history-empty">아직 풀이 기록이 없습니다.</p>
            ) : (
              <div className="attempt-list">
                {attempts.slice(0, 8).map((attempt) => (
                  <AttemptRow key={attempt.attemptId} attempt={attempt} />
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

function PracticeStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="practice-stat">
      <span>
        <Icon size={14} />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function PracticeExamCard({
  exam,
  latestAttempt,
  onStart,
}: {
  exam: ExamResponse;
  latestAttempt?: AttemptSummaryResponse;
  onStart: (exam: ExamResponse) => void;
}) {
  const isSubmitted = latestAttempt?.status === "SUBMITTED";
  const percent =
    isSubmitted && latestAttempt.maxScore > 0
      ? Math.round((latestAttempt.totalScore / latestAttempt.maxScore) * 100)
      : null;

  return (
    <article className="practice-exam-card">
      <div className="practice-exam-copy">
        <div className="practice-exam-title">
          {exam.subjectName && <span>{exam.subjectName}</span>}
          <h3>{exam.title}</h3>
          {isSubmitted ? (
            <strong className="done">완료 {percent}%</strong>
          ) : latestAttempt ? (
            <strong className="progress">진행 중</strong>
          ) : null}
        </div>
        {exam.description && <p>{exam.description}</p>}
        <div className="practice-exam-meta">
          <InfoPill icon={FileText} text={`문항 ${exam.itemCount}개`} />
          <InfoPill icon={Trophy} text={`${exam.totalPoints}점`} />
          <InfoPill icon={Clock} text={exam.timeLimitMinutes ? `${exam.timeLimitMinutes}분` : "시간 무제한"} />
        </div>
      </div>
      <Button type="button" onClick={() => onStart(exam)}>
        <PlayCircle size={16} />
        {latestAttempt && !isSubmitted ? "이어 풀기" : "풀이 시작"}
      </Button>
    </article>
  );
}

function ExamTakeView({
  take,
  answers,
  submitting,
  error,
  onBackToList,
  onSetAnswer,
  onSubmit,
}: {
  take: ExamTakeResponse;
  answers: Record<string, string>;
  submitting: boolean;
  error: string;
  onBackToList: () => void;
  onSetAnswer: (questionId: string, answer: string) => void;
  onSubmit: () => void;
}) {
  const answeredCount = take.items.filter((item) => (answers[item.questionId] ?? "").trim() !== "").length;

  return (
    <section className="exam-take-view">
      <div className="exam-take-inner">
        <header className="exam-take-header">
          <Button type="button" variant="outline" onClick={onBackToList}>
            <ArrowLeft size={16} />
            시험 목록
          </Button>
          <div className="exam-take-title">
            <h1>{take.title}</h1>
            <p>
              총 {take.items.length}문항 · 만점 {take.maxScore}점
              {take.timeLimitMinutes ? ` · 제한 ${take.timeLimitMinutes}분` : ""}
            </p>
          </div>
          <div className="exam-take-progress" aria-label="답변 진행률">
            <strong>
              {answeredCount}/{take.items.length}
            </strong>
            <span>문항 답변</span>
          </div>
        </header>

        {error && (
          <div className="practice-error">
            <CircleAlert size={16} />
            {error}
          </div>
        )}

        <div className="exam-question-list">
          {take.items.map((item, index) => (
            <ExamTakeQuestion
              key={item.questionId}
              item={item}
              index={index}
              answer={answers[item.questionId] ?? ""}
              onSetAnswer={onSetAnswer}
            />
          ))}
        </div>

        <div className="exam-submit-bar">
          <span>{answeredCount}/{take.items.length} 문항 답변</span>
          <Button type="button" disabled={submitting} onClick={onSubmit}>
            {submitting ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
            제출하고 채점
          </Button>
        </div>
      </div>
    </section>
  );
}

function ExamTakeQuestion({
  item,
  index,
  answer,
  onSetAnswer,
}: {
  item: TakeItem;
  index: number;
  answer: string;
  onSetAnswer: (questionId: string, answer: string) => void;
}) {
  return (
    <article className="exam-question-card">
      <div className="exam-question-head">
        <span>{index + 1}</span>
        <div>
          <h2>{item.question}</h2>
          <p>{item.maxPoints}점</p>
        </div>
      </div>

      {item.passage && <p className="exam-passage">{item.passage}</p>}

      {item.questionType === "MULTIPLE_CHOICE" ? (
        <div className="exam-choice-list">
          {item.choices.map((choice, choiceIndex) => (
            <button
              key={`${item.questionId}-${choiceIndex}`}
              type="button"
              className={answer === choice ? "selected" : ""}
              onClick={() => onSetAnswer(item.questionId, choice)}
            >
              <span>{choiceIndex + 1}</span>
              {choice}
            </button>
          ))}
        </div>
      ) : (
        <Input
          className="exam-short-answer"
          value={answer}
          onChange={(event) => onSetAnswer(item.questionId, event.target.value)}
          placeholder="답을 입력하세요"
        />
      )}
    </article>
  );
}

function AttemptResultView({
  result,
  onBackToList,
}: {
  result: AttemptResultResponse;
  onBackToList: () => void;
}) {
  const percent = result.maxScore > 0 ? Math.round((result.totalScore / result.maxScore) * 100) : 0;

  return (
    <section className="attempt-result-view">
      <div className="attempt-result-inner">
        <header className="result-summary">
          <p>{result.examTitle} · 채점 결과</p>
          <h1>
            {result.totalScore}
            <span> / {result.maxScore}점</span>
          </h1>
          <strong>정답률 {percent}%</strong>
          {result.requiresReview && <em>주관식 문항은 재검토가 필요할 수 있습니다.</em>}
        </header>

        <div className="result-list">
          {result.items.map((item, index) => (
            <article key={item.questionId} className={`result-card ${item.correct ? "correct" : "wrong"}`}>
              <div className="result-card-head">
                <span>{index + 1}</span>
                <h2>{item.question}</h2>
                <strong>
                  {item.correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  {item.earnedPoints}/{item.maxPoints}
                </strong>
              </div>
              {item.passage && <p className="exam-passage">{item.passage}</p>}
              <div className="result-answer-grid">
                <div>
                  <small>내 답안</small>
                  <span>{item.submittedAnswer || "(미응답)"}</span>
                </div>
                <div>
                  <small>정답</small>
                  <span>{item.correctAnswer}</span>
                </div>
              </div>
              {item.explanation && (
                <p className="result-explanation">
                  <strong>해설</strong>
                  {item.explanation}
                </p>
              )}
            </article>
          ))}
        </div>

        <Button type="button" variant="outline" onClick={onBackToList}>
          <ArrowLeft size={16} />
          시험 목록으로
        </Button>
      </div>
    </section>
  );
}

function AttemptRow({ attempt }: { attempt: AttemptSummaryResponse }) {
  const isSubmitted = attempt.status === "SUBMITTED";
  const percent = attempt.maxScore > 0 ? Math.round((attempt.totalScore / attempt.maxScore) * 100) : 0;

  return (
    <div className="attempt-row">
      <div>
        <strong>{attempt.examTitle}</strong>
        <span>{formatShortDate(isSubmitted ? attempt.submittedAt : attempt.startedAt)}</span>
      </div>
      <em className={isSubmitted ? "done" : "progress"}>{isSubmitted ? `${percent}%` : "진행 중"}</em>
    </div>
  );
}

function InfoPill({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <span className="info-pill">
      <Icon size={14} />
      {text}
    </span>
  );
}

function PracticeEmpty({
  icon: Icon,
  spin,
  title,
  body,
  warning,
}: {
  icon: LucideIcon;
  spin?: boolean;
  title: string;
  body: string;
  warning?: boolean;
}) {
  return (
    <div className={`practice-empty ${warning ? "warning" : ""}`}>
      <Icon className={spin ? "spin" : ""} size={32} />
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}
