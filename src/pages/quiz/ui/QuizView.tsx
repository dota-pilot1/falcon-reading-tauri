import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, ListChecks, Loader2, Menu, RefreshCw, RotateCcw, Send } from "lucide-react";
import type { Quiz, QuizAttemptResult } from "../../../entities/quiz/api/quizApi";
import { MathText } from "../../../shared/ui/MathText";
import { Button } from "../../../shared/ui/Button";
import { Textarea } from "../../../shared/ui/Textarea";

type Props = {
  quizzes: Quiz[];
  activeQuiz: Quiz | null;
  currentIndex: number;
  answers: Record<number, string>;
  result: QuizAttemptResult | null;
  loading: boolean;
  error: string;
  submitting: boolean;
  onStartQuiz: (quiz: Quiz) => void;
  onSetAnswer: (questionId: number, answer: string) => void;
  onMove: (index: number) => void;
  onSubmit: () => void;
  onRefresh: () => void;
  onBack: () => void;
  onRetry: () => void;
};

const CHOICE_KEYS = ["1", "2", "3", "4", "5"];

function choiceKey(index: number) {
  return CHOICE_KEYS[index] ?? String(index + 1);
}

function answerPreviewText(answer: string | null | undefined, choices: string[]) {
  const normalized = (answer ?? "").trim().toUpperCase();
  const index = CHOICE_KEYS.indexOf(normalized);
  if (index >= 0 && choices[index]) return `${normalized}. ${choices[index].replace(/^[A-E1-5][.).:]\s*/i, "")}`;
  return answer ?? "";
}

function selectedAnswerText(answer: string | null | undefined) {
  const normalized = (answer ?? "").trim().toUpperCase();
  return normalized || "미답변";
}

export function QuizView({
  quizzes,
  activeQuiz,
  currentIndex,
  answers,
  result,
  loading,
  error,
  submitting,
  onStartQuiz,
  onSetAnswer,
  onMove,
  onSubmit,
  onRefresh,
  onBack,
  onRetry,
}: Props) {
  const [previewQuestionIds, setPreviewQuestionIds] = useState<Record<number, boolean>>({});

  if (result) {
    const rate = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
    const reviewColumnSize = Math.ceil(result.answers.length / 2);
    const reviewColumns = [
      result.answers.slice(0, reviewColumnSize),
      result.answers.slice(reviewColumnSize),
    ];
    return (
      <section className="quiz-view">
        <div className="quiz-result-layout">
          <section className="quiz-result-hero">
            {activeQuiz?.coverImageUrl && <img className="quiz-result-cover" src={activeQuiz.coverImageUrl} alt="" />}
            <div className="quiz-result-meta">
              <span>Result</span>
              <h1>{result.quizTitle}</h1>
              <p>{activeQuiz ? `${activeQuiz.category} · 난이도 ${activeQuiz.difficulty} · ${activeQuiz.questionCount}문항` : "가벼운 학습 퀴즈 결과"}</p>
            </div>
            <div className="quiz-score-ring">
              <strong>{rate}%</strong>
              <span>{result.score}/{result.maxScore}</span>
            </div>
            <div className="quiz-result-actions">
              <Button variant="outline" onClick={onBack}><ArrowLeft size={16} /> 퀴즈 목록</Button>
              <Button onClick={onRetry}><RotateCcw size={16} /> 다시 풀기</Button>
            </div>
          </section>
          <main className="quiz-result-review">
            <header>
              <div>
                <span>Review</span>
                <h2>문제 확인</h2>
              </div>
              <strong>{result.score} / {result.maxScore}</strong>
            </header>
            <div className="quiz-review-list">
              {reviewColumns.map((column, columnIndex) => (
                <div className="quiz-review-column" key={columnIndex}>
                  {column.map((answer, index) => {
                    const questionNumber = columnIndex * reviewColumnSize + index + 1;
                    return (
                      <article key={answer.questionId} className={answer.correct ? "quiz-review-card correct" : "quiz-review-card wrong"}>
                        <div className="quiz-review-head">
                          <span className="quiz-review-number">Q{questionNumber}</span>
                          <span className={answer.correct ? "quiz-review-status correct" : "quiz-review-status wrong"}>
                            {answer.correct ? "정답" : "오답"}
                          </span>
                        </div>
                        <h3><MathText text={answer.prompt} /></h3>
                        <div className="quiz-review-answers">
                          <p><span>내 답</span><MathText text={answer.submittedAnswer || "미응답"} /></p>
                          <p><span>정답</span><MathText text={answer.correctAnswer} /></p>
                        </div>
                        {answer.explanation && <small><MathText text={answer.explanation} /></small>}
                      </article>
                    );
                  })}
                </div>
              ))}
            </div>
          </main>
        </div>
      </section>
    );
  }

  if (activeQuiz) {
    const question = activeQuiz.questions[currentIndex];
    const progress = activeQuiz.questions.length === 0 ? 0 : Math.round(((currentIndex + 1) / activeQuiz.questions.length) * 100);
    const answeredCount = activeQuiz.questions.filter((item) => (answers[item.id] ?? "").trim()).length;
    const canPreviewAnswer = Boolean(question.answer);
    const answerPreviewOpen = Boolean(previewQuestionIds[question.id]);

    return (
      <section className="quiz-play-view">
        <header className="quiz-play-header">
          <button
            type="button"
            className="quiz-list-icon-button"
            onClick={onBack}
            aria-label="퀴즈 목록"
            title="퀴즈 목록"
          >
            <Menu size={22} />
          </button>
          {activeQuiz.coverImageUrl && <img className="quiz-play-cover" src={activeQuiz.coverImageUrl} alt="" />}
          <div className="quiz-play-title">
            <span>{activeQuiz.category} · 난이도 {activeQuiz.difficulty}</span>
            <h1>{activeQuiz.title}</h1>
          </div>
          <div className="quiz-play-actions">
            <button
              type="button"
              className="quiz-header-icon-button"
              onClick={onRefresh}
              disabled={loading}
              aria-label="퀴즈 새로고침"
              title="서버에서 퀴즈 다시 불러오기"
            >
              <RefreshCw size={19} className={loading ? "spin" : undefined} />
            </button>
            <div className="quiz-progress-label">{currentIndex + 1} / {activeQuiz.questions.length}</div>
          </div>
        </header>

        <div className="quiz-progress"><span style={{ width: `${progress}%` }} /></div>

        <main className="quiz-question-stage">
          <article className="quiz-question-panel">
            <div className="quiz-question-kicker">Question {currentIndex + 1}</div>
            <h2><MathText text={question.prompt} /></h2>
            {question.imageUrl && <img className="quiz-question-image" src={question.imageUrl} alt="" />}
            {question.type === "MULTIPLE_CHOICE" ? (
              <div className="quiz-choice-grid">
                {question.choices.map((choice, choiceIndex) => (
                  <button
                    key={choice}
                    className={answers[question.id] === choiceKey(choiceIndex) ? "selected" : ""}
                    onClick={() => onSetAnswer(question.id, choiceKey(choiceIndex))}
                  >
                    {question.choiceImageUrls?.[choiceIndex] && (
                      <img className="quiz-choice-image" src={question.choiceImageUrls[choiceIndex]} alt="" />
                    )}
                    <span><MathText text={choice} /></span>
                  </button>
                ))}
              </div>
            ) : (
              <Textarea
                className="min-h-[150px] text-base leading-[26px]"
                value={answers[question.id] ?? ""}
                onChange={(event) => onSetAnswer(question.id, event.target.value)}
                placeholder="짧게 답을 입력하세요."
              />
            )}
          </article>

          <aside className="self-start rounded-lg border border-[#e1e4e8] bg-white p-[18px]">
            <div>
              <span className="block text-[13px] font-[850] text-zinc-700">답변 현황</span>
              <strong className="mt-2.5 block text-2xl leading-[30px] text-zinc-900">{answeredCount}/{activeQuiz.questions.length}</strong>
              <p className="mt-1 text-sm leading-[22px] text-zinc-500">{activeQuiz.category} · 난이도 {activeQuiz.difficulty}</p>
            </div>
            {canPreviewAnswer && (
              <div className="quiz-answer-preview">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setPreviewQuestionIds((current) => ({ ...current, [question.id]: !current[question.id] }))}
                >
                  <Eye size={15} /> {answerPreviewOpen ? "정답 숨기기" : "정답 미리보기"}
                </Button>
                {answerPreviewOpen && (
                  <div>
                    <span>정답</span>
                    <strong><MathText text={answerPreviewText(question.answer, question.choices)} /></strong>
                    {question.explanation && (
                      <>
                        <span>해설</span>
                        <p><MathText text={question.explanation} /></p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="mt-3.5 grid gap-2">
              {activeQuiz.questions.map((item, index) => {
                const isCurrent = index === currentIndex;
                const isDone = Boolean((answers[item.id] ?? "").trim());
                return (
                  <button
                    key={item.id}
                    className={[
                      "grid min-h-11 grid-cols-[38px_minmax(0,1fr)_52px] items-center gap-2 rounded-lg border px-2.5 py-2 text-left",
                      isCurrent
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : isDone
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-zinc-300 bg-white text-zinc-600",
                    ].join(" ")}
                    onClick={() => onMove(index)}
                  >
                    <span className="font-black">Q{index + 1}</span>
                    <strong className={`text-[13px] font-[850] ${isCurrent ? "text-white" : isDone ? "text-emerald-700" : "text-zinc-500"}`}>
                      {isDone ? "완료" : "미답변"}
                    </strong>
                    <small className={`text-right text-xs font-extrabold ${isCurrent ? "text-white" : isDone ? "text-emerald-700" : "text-zinc-400"}`}>
                      {selectedAnswerText(answers[item.id])}
                    </small>
                  </button>
                );
              })}
            </div>
          </aside>
        </main>

        <footer className="quiz-play-footer">
          <Button variant="outline" className="min-h-[42px] min-w-24" disabled={currentIndex === 0} onClick={() => onMove(currentIndex - 1)}>
            <ArrowLeft size={16} /> 이전
          </Button>
          {currentIndex < activeQuiz.questions.length - 1 ? (
            <Button className="min-h-[42px] min-w-24" onClick={() => onMove(currentIndex + 1)}>
              다음 <ArrowRight size={16} />
            </Button>
          ) : (
            <Button className="min-h-[42px] min-w-24" disabled={submitting} onClick={onSubmit}>
              {submitting ? <Loader2 size={16} className="spin" /> : <Send size={16} />} 제출
            </Button>
          )}
        </footer>
      </section>
    );
  }

  return (
    <section className="quiz-view">
      <div className="quiz-browser single">
        <main className="quiz-list-panel">
          <header>
            <div>
              <span>Learning Quiz</span>
              <h1>퀴즈</h1>
              <p>짧은 테스트를 한 문제씩 풀고 바로 결과를 확인하세요.</p>
            </div>
            <button
              type="button"
              className="quiz-list-icon-button"
              onClick={onRefresh}
              disabled={loading}
              aria-label="퀴즈 목록 새로고침"
              title="서버에서 퀴즈 목록 다시 불러오기"
            >
              {loading ? <Loader2 className="spin" size={19} /> : <RefreshCw size={19} />}
            </button>
          </header>
          {error && <div className="inline-error">{error}</div>}
          {quizzes.length === 0 ? (
            <div className="quiz-empty">
              <ListChecks size={30} />
              <strong>풀 수 있는 퀴즈가 없습니다.</strong>
              <p>웹 관리자에서 퀴즈를 활성화하면 표시됩니다.</p>
            </div>
          ) : (
            <div className="quiz-card-grid">
              {quizzes.map((quiz) => (
                <article key={quiz.id} className="quiz-card">
                  {quiz.coverImageUrl ? (
                    <img className="quiz-card-cover" src={quiz.coverImageUrl} alt="" />
                  ) : (
                    <div className="quiz-card-cover placeholder"><ListChecks size={24} /></div>
                  )}
                  <div>
                    <span>{quiz.category} · 난이도 {quiz.difficulty}</span>
                    <h2>{quiz.title}</h2>
                    {quiz.description && <p>{quiz.description}</p>}
                  </div>
                  <Button onClick={() => onStartQuiz(quiz)}>
                    <CheckCircle2 size={16} /> 시작
                  </Button>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    </section>
  );
}
