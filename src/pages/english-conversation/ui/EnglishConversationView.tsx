import { useEffect, useMemo, useState, type ClipboardEvent, type Dispatch, type FormEvent, type RefObject, type SetStateAction } from "react";
import type { Agent } from "../../../entities/agent/model/types";
import type { Message } from "../../../entities/chat/model/types";
import type { UserSummary } from "../../../entities/user/model/types";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  X,
  History as HistoryIcon,
  Image as ImageIcon,
  Languages,
  Loader2,
  Mic,
  Save,
  Send,
  Settings2,
  Sparkles,
  Square,
  WandSparkles,
} from "lucide-react";
import { Button } from "../../../shared/ui/Button";
import { Input } from "../../../shared/ui/Input";
import { Textarea } from "../../../shared/ui/Textarea";
import { cn } from "../../../shared/lib/cn";

type LearningTab = "suggestions" | "questions" | "koen" | "history";
type ResponseLength = "1-3" | "3-4" | "4-5";
type VoiceTarget = "input" | "draft";
type CharacterSettingKey = "style" | "character" | "knowledge" | "news" | "schedule" | "scenario" | "system";
const agentPageSize = 5;

type CharacterEditorDraft = {
  title: string;
  subtitle: string;
  description: string;
  level: string;
  sessionGoal: string;
  skillsText: string;
  starterPromptsText: string;
  style: string;
  scenario: string;
  character: string;
  knowledge: string;
  news: string;
  schedule: string;
};

type EnglishConversationViewProps = {
  agents: Agent[];
  selectedAgent: Agent;
  selectedAgentId: string;
  selectedAgentEditable: boolean;
  characterDetailOpen: boolean;
  characterDetailLoading: boolean;
  characterDetailError: string;
  characterDetailDraft: CharacterEditorDraft | null;
  characterEditorOpen: boolean;
  characterEditorLoading: boolean;
  characterEditorSaving: boolean;
  characterEditorError: string;
  characterEditorDraft: CharacterEditorDraft | null;
  messages: Message[];
  input: string;
  image: { name: string; dataUrl: string } | null;
  sending: boolean;
  connectionStatus: "checking" | "online" | "offline";
  autoTranslate: boolean;
  responseLength: ResponseLength;
  sidebarTab: LearningTab;
  draftKo: string;
  suggestedReplies: string[];
  suggestingReplies: boolean;
  suggestedQuestions: string[];
  suggestedQuestionCount: 3 | 5 | 10 | 20;
  suggestingQuestions: boolean;
  history: Message[][];
  error: string;
  voiceTarget: VoiceTarget | null;
  voicePhase: "idle" | "recording" | "transcribing";
  voiceLevel: number;
  user: UserSummary;
  starterPrompts: string[];
  fileRef: RefObject<HTMLInputElement | null>;
  endRef: RefObject<HTMLDivElement | null>;
  onSelectAgent: (agentId: string) => void;
  onOpenCharacterDetail: (agentId?: string) => void;
  onCloseCharacterDetail: () => void;
  onOpenCharacterEditor: () => void;
  onCloseCharacterEditor: () => void;
  onSetCharacterEditorDraft: Dispatch<SetStateAction<CharacterEditorDraft | null>>;
  onSaveCharacterEditor: () => void;
  onSetInput: (input: string) => void;
  onSetImage: (image: { name: string; dataUrl: string } | null) => void;
  onSetAutoTranslate: (value: boolean) => void;
  onSetResponseLength: (length: ResponseLength) => void;
  onSetSidebarTab: (tab: LearningTab) => void;
  onSetDraftKo: (draft: string) => void;
  onSetMessages: (messages: Message[]) => void;
  onSendMessage: (event: FormEvent<HTMLFormElement>) => void;
  onAttachImage: (files: FileList | null) => void;
  onPasteImage: (file: File) => void;
  onBuildSuggestedReplies: () => void;
  onSetSuggestedQuestionCount: (count: 3 | 5 | 10 | 20) => void;
  onBuildSuggestedQuestions: (count?: 3 | 5 | 10 | 20) => void;
  onBuildFeedback: () => void;
  onSaveSession: () => void;
  onToggleVoiceInput: (target: VoiceTarget) => void;
};

export function EnglishConversationView({
  agents,
  selectedAgent,
  selectedAgentId,
  selectedAgentEditable,
  characterDetailOpen,
  characterDetailLoading,
  characterDetailError,
  characterDetailDraft,
  characterEditorOpen,
  characterEditorLoading,
  characterEditorSaving,
  characterEditorError,
  characterEditorDraft,
  messages,
  input,
  image,
  sending,
  connectionStatus,
  autoTranslate,
  responseLength,
  sidebarTab,
  draftKo,
  suggestedReplies,
  suggestingReplies,
  suggestedQuestions,
  suggestedQuestionCount,
  suggestingQuestions,
  history,
  error,
  voiceTarget,
  voicePhase,
  voiceLevel,
  user,
  starterPrompts,
  fileRef,
  endRef,
  onSelectAgent,
  onOpenCharacterDetail,
  onCloseCharacterDetail,
  onOpenCharacterEditor,
  onCloseCharacterEditor,
  onSetCharacterEditorDraft,
  onSaveCharacterEditor,
  onSetInput,
  onSetImage,
  onSetAutoTranslate,
  onSetResponseLength,
  onSetSidebarTab,
  onSetDraftKo,
  onSetMessages,
  onSendMessage,
  onAttachImage,
  onPasteImage,
  onBuildSuggestedReplies,
  onSetSuggestedQuestionCount,
  onBuildSuggestedQuestions,
  onBuildFeedback,
  onSaveSession,
  onToggleVoiceInput,
}: EnglishConversationViewProps) {
  const [agentPage, setAgentPage] = useState(0);
  const [detailAdvancedOpen, setDetailAdvancedOpen] = useState(false);
  const [activeCharacterSetting, setActiveCharacterSetting] = useState<CharacterSettingKey>("style");
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const agentInitial = selectedAgent.title.trim().slice(0, 1) || "A";
  const userInitial = (user.username || user.email).trim().slice(0, 2) || "Me";
  const inputVoiceActive = voiceTarget === "input";
  const draftVoiceActive = voiceTarget === "draft";
  const isTranscribing = voicePhase === "transcribing";
  const isRecording = voicePhase === "recording";
  const voicePercent = `${Math.round(voiceLevel * 100)}%`;
  const agentPageCount = Math.max(1, Math.ceil(agents.length / agentPageSize));
  const visibleAgents = useMemo(
    () => agents.slice(agentPage * agentPageSize, agentPage * agentPageSize + agentPageSize),
    [agentPage, agents]
  );

  useEffect(() => {
    setAgentPage((current) => Math.min(current, agentPageCount - 1));
  }, [agentPageCount]);

  useEffect(() => {
    const selectedIndex = agents.findIndex((agent) => agent.id === selectedAgentId);
    if (selectedIndex >= 0) setAgentPage(Math.floor(selectedIndex / agentPageSize));
  }, [agents, selectedAgentId]);

  useEffect(() => {
    setDetailAdvancedOpen(false);
  }, [selectedAgentId, characterDetailOpen]);

  useEffect(() => {
    if (!image) setImagePreviewOpen(false);
  }, [image]);

  const updateCharacterDraft = (field: keyof CharacterEditorDraft, value: string) => {
    onSetCharacterEditorDraft((current) => current ? { ...current, [field]: value } : current);
  };
  const emptySettingText = "설정된 내용이 없습니다.";
  const isCustomCharacter = Boolean(
    characterDetailDraft?.style ||
    characterDetailDraft?.character ||
    characterDetailDraft?.knowledge ||
    characterDetailDraft?.news ||
    characterDetailDraft?.schedule ||
    characterDetailDraft?.scenario
  );
  const visibleCharacterSettingItems: Array<{ key: CharacterSettingKey; label: string; value: string }> = [
    {
      key: "style",
      label: "대화 스타일",
      value: characterDetailDraft?.style || selectedAgent.systemPrompt || emptySettingText,
    },
    {
      key: "character",
      label: "캐릭터 정보",
      value: characterDetailDraft?.character || characterDetailDraft?.description || selectedAgent.description || emptySettingText,
    },
    {
      key: "knowledge",
      label: "알고 있는 지식",
      value: characterDetailDraft?.knowledge || emptySettingText,
    },
    {
      key: "news",
      label: "오늘의 뉴스",
      value: characterDetailDraft?.news || emptySettingText,
    },
    {
      key: "schedule",
      label: "캐릭터 근황",
      value: characterDetailDraft?.schedule || emptySettingText,
    },
    {
      key: "scenario",
      label: "예제 시나리오",
      value: characterDetailDraft?.scenario || characterDetailDraft?.sessionGoal || selectedAgent.sessionGoal || emptySettingText,
    },
  ];
  const currentCharacterSetting =
    visibleCharacterSettingItems.find((item) => item.key === activeCharacterSetting) ?? visibleCharacterSettingItems[0];

  const handleInputPaste = (event: ClipboardEvent<HTMLFormElement>) => {
    const imageFile = Array.from(event.clipboardData.items)
      .find((item) => item.kind === "file" && item.type.startsWith("image/"))
      ?.getAsFile();
    if (!imageFile) return;
    event.preventDefault();
    onPasteImage(imageFile);
  };

  useEffect(() => {
    if (!characterDetailOpen) return;
    setActiveCharacterSetting(visibleCharacterSettingItems[0]?.key ?? "style");
  }, [characterDetailOpen, selectedAgentId, visibleCharacterSettingItems[0]?.key]);

  return (
    <section className="relative grid min-h-0 grid-cols-[270px_minmax(520px,1fr)_360px] gap-3.5 p-3.5 max-[1180px]:grid-cols-[230px_minmax(420px,1fr)] max-[860px]:grid-cols-1">
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white max-[860px]:hidden">
        <div className="panel-title">
          <strong>Agents</strong>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-md border border-transparent bg-transparent text-zinc-700 hover:border-zinc-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-zinc-400"
            title="선택한 캐릭터 상세 보기"
            onClick={() => onOpenCharacterDetail(selectedAgentId)}
          >
            <Settings2 size={16} />
          </button>
        </div>
        <div className="grid min-h-0 content-start gap-2 overflow-hidden p-3">
          {visibleAgents.map((agent) => (
            <article
              key={agent.id}
              className={cn(
                "relative grid min-h-[78px] grid-cols-[minmax(0,1fr)_32px] items-center gap-1.5 rounded-lg border border-zinc-200 bg-white py-2.5 pl-3 pr-2.5 text-zinc-800 transition-[border-color,background,box-shadow]",
                "hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-[0_8px_18px_rgba(15,23,42,0.05)] focus-within:border-blue-200 focus-within:bg-blue-50/40 focus-within:shadow-[0_8px_18px_rgba(15,23,42,0.05)]",
                selectedAgentId === agent.id &&
                  "border-blue-400 bg-blue-50 text-zinc-900 shadow-[inset_3px_0_0_#2563eb,0_8px_18px_rgba(37,99,235,0.10)]",
              )}
            >
              <button
                type="button"
                className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-2.5 bg-transparent p-0 text-left text-inherit"
                onClick={() => {
                  onSelectAgent(agent.id);
                  onCloseCharacterDetail();
                }}
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-sky-200 bg-sky-100 text-sky-700"><Bot size={17} /></span>
                <span className="grid min-w-0 gap-0.5">
                  <strong className="truncate text-[15px] leading-5 text-zinc-900">{agent.title}</strong>
                  <small className="truncate text-[13px] leading-[18px] text-zinc-500">{agent.subtitle || agent.description}</small>
                </span>
              </button>
              <button
                type="button"
                className="grid h-[30px] w-[30px] place-items-center rounded-md border border-transparent bg-transparent text-zinc-600 hover:border-blue-300 hover:bg-blue-50 hover:text-zinc-900"
                title="캐릭터 상세 보기"
                aria-label={`${agent.title} 상세 보기`}
                onClick={() => onOpenCharacterDetail(agent.id)}
              >
                <Settings2 size={15} />
              </button>
            </article>
          ))}
        </div>

        {agentPageCount > 1 && (
          <div className="mt-auto grid grid-cols-[34px_1fr_34px] items-center gap-2 border-t border-zinc-200 px-0 pb-2.5 pt-2.5 mx-3">
            <button
              type="button"
              className="grid h-[34px] w-[34px] place-items-center rounded-md border border-zinc-300 bg-white text-zinc-700 disabled:cursor-not-allowed disabled:opacity-[.45]"
              aria-label="이전 캐릭터 목록"
              disabled={agentPage === 0}
              onClick={() => setAgentPage((current) => Math.max(0, current - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-center text-xs font-extrabold text-zinc-500">{agentPage + 1} / {agentPageCount}</span>
            <button
              type="button"
              className="grid h-[34px] w-[34px] place-items-center rounded-md border border-zinc-300 bg-white text-zinc-700 disabled:cursor-not-allowed disabled:opacity-[.45]"
              aria-label="다음 캐릭터 목록"
              disabled={agentPage >= agentPageCount - 1}
              onClick={() => setAgentPage((current) => Math.min(agentPageCount - 1, current + 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {connectionStatus !== "online" && (
          <div className="mt-auto mx-3 mb-3 grid gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="m-0 flex items-start gap-1.5 text-xs font-extrabold leading-[18px] text-red-800">
              <CircleAlert size={13} />
              백엔드 서버 연결을 확인하세요.
            </p>
          </div>
        )}
      </aside>

      {characterDetailOpen && (
        <div className="fixed inset-0 z-[45] grid place-items-center bg-slate-900/35 p-6" role="presentation">
          <section className="grid max-h-[min(720px,calc(100vh-48px))] w-[min(920px,100%)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]" role="dialog" aria-modal="true" aria-labelledby="agent-detail-title">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-200 p-4">
              <div>
                <h2 id="agent-detail-title" className="m-0 text-lg leading-6 text-zinc-900">캐릭터 설정</h2>
                <p className="m-0 mt-1 text-[13px] leading-[18px] text-zinc-500">
                  {characterDetailDraft?.title || selectedAgent.title}
                  {(characterDetailDraft?.subtitle || selectedAgent.subtitle) ? ` · ${characterDetailDraft?.subtitle || selectedAgent.subtitle}` : ""}
                </p>
              </div>
              <button type="button" className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-zinc-300 bg-white text-zinc-700" aria-label="상세 닫기" onClick={onCloseCharacterDetail}>
                <X size={17} />
              </button>
            </div>

            {characterDetailLoading && <div className="mx-5 mt-3.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-[13px] font-extrabold text-sky-700">캐릭터 정보를 불러오는 중입니다.</div>}
            {characterDetailError && <div className="error">{characterDetailError}</div>}

            <div className="grid min-h-0 content-start gap-3 overflow-y-auto px-5 py-4">
              <div className="grid min-h-[420px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <div className="flex gap-1.5 overflow-x-auto border-b border-zinc-200 bg-zinc-50 p-2">
                  {visibleCharacterSettingItems.map((item) => (
                    <button
                      type="button"
                      key={item.key}
                      className={cn(
                        "min-h-[34px] shrink-0 whitespace-nowrap rounded-md px-3 text-xs font-extrabold text-zinc-500",
                        currentCharacterSetting.key === item.key && "bg-white text-zinc-900 shadow-[inset_0_0_0_1px_#e4e4e7]",
                      )}
                      onClick={() => setActiveCharacterSetting(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <section className="grid min-w-0 content-start gap-2.5 overflow-y-auto px-5 py-[18px]">
                  <strong className="text-xs leading-5 text-zinc-700">{currentCharacterSetting.label}</strong>
                  <p className="m-0 whitespace-pre-wrap text-[13px] leading-[21px] text-zinc-600">{currentCharacterSetting.value}</p>
                </section>
              </div>

            {selectedAgent.systemPrompt && isCustomCharacter && (
                <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                  <button type="button" className="flex min-h-10 w-full items-center justify-between gap-2.5 bg-transparent px-3 text-xs font-extrabold text-zinc-700" onClick={() => setDetailAdvancedOpen((open) => !open)}>
                    <span>시스템 원문</span>
                    <span className="text-zinc-500">{detailAdvancedOpen ? "접기" : "보기"}</span>
                  </button>
                  {detailAdvancedOpen && <p className="max-h-[220px] overflow-y-auto px-3 pb-3 text-xs leading-5 text-zinc-500">{selectedAgent.systemPrompt}</p>}
                </div>
              )}
            </div>

            {selectedAgentEditable && (
              <div className="flex justify-end border-t border-zinc-200 px-4 py-3">
                <button type="button" className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-zinc-900 bg-zinc-900 px-3 font-extrabold text-white" onClick={onOpenCharacterEditor}>
                  <Settings2 size={15} />
                  수정
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      {characterEditorOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/35 p-6" role="presentation">
          <section className="grid max-h-[min(820px,calc(100vh-48px))] w-[min(760px,100%)] grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]" role="dialog" aria-modal="true" aria-labelledby="character-editor-title">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-[18px]">
              <div>
                <h2 id="character-editor-title" className="m-0 text-lg leading-6 text-zinc-900">캐릭터 수정</h2>
                <p className="m-0 mt-1 text-[13px] text-zinc-500">{selectedAgent.title}</p>
              </div>
              <button type="button" className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-zinc-700 disabled:cursor-not-allowed disabled:opacity-55" aria-label="닫기" onClick={onCloseCharacterEditor} disabled={characterEditorSaving}>
                <X size={18} />
              </button>
            </div>

            {characterEditorLoading && <div className="mx-5 mt-3.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-[13px] font-extrabold text-sky-700">캐릭터 정보를 불러오는 중입니다.</div>}
            {characterEditorError && <div className="error">{characterEditorError}</div>}

            {characterEditorDraft && (
              <div className="grid min-h-0 grid-cols-2 gap-3 overflow-y-auto px-5 py-4">
                <label className="grid gap-1.5 text-xs font-extrabold text-zinc-600">
                  이름
                  <Input value={characterEditorDraft.title} onChange={(event) => updateCharacterDraft("title", event.target.value)} />
                </label>
                <label className="grid gap-1.5 text-xs font-extrabold text-zinc-600">
                  영문 이름
                  <Input value={characterEditorDraft.subtitle} onChange={(event) => updateCharacterDraft("subtitle", event.target.value)} />
                </label>
                <label className="col-span-full grid gap-1.5 text-xs font-extrabold text-zinc-600">
                  설명
                  <Textarea rows={3} value={characterEditorDraft.description} onChange={(event) => updateCharacterDraft("description", event.target.value)} />
                </label>
                <label className="grid gap-1.5 text-xs font-extrabold text-zinc-600">
                  레벨
                  <Input value={characterEditorDraft.level} onChange={(event) => updateCharacterDraft("level", event.target.value)} />
                </label>
                <label className="grid gap-1.5 text-xs font-extrabold text-zinc-600">
                  세션 목표
                  <Input value={characterEditorDraft.sessionGoal} onChange={(event) => updateCharacterDraft("sessionGoal", event.target.value)} />
                </label>
                <label className="col-span-full grid gap-1.5 text-xs font-extrabold text-zinc-600">
                  스킬
                  <Textarea rows={2} value={characterEditorDraft.skillsText} onChange={(event) => updateCharacterDraft("skillsText", event.target.value)} placeholder="쉼표 또는 줄바꿈으로 구분" />
                </label>
                <label className="col-span-full grid gap-1.5 text-xs font-extrabold text-zinc-600">
                  스타터 문장
                  <Textarea rows={3} value={characterEditorDraft.starterPromptsText} onChange={(event) => updateCharacterDraft("starterPromptsText", event.target.value)} placeholder="줄바꿈으로 구분" />
                </label>
                <label className="col-span-full grid gap-1.5 text-xs font-extrabold text-zinc-600">
                  말투/스타일
                  <Textarea rows={4} value={characterEditorDraft.style} onChange={(event) => updateCharacterDraft("style", event.target.value)} />
                </label>
                <label className="col-span-full grid gap-1.5 text-xs font-extrabold text-zinc-600">
                  상황
                  <Textarea rows={4} value={characterEditorDraft.scenario} onChange={(event) => updateCharacterDraft("scenario", event.target.value)} />
                </label>
                <label className="col-span-full grid gap-1.5 text-xs font-extrabold text-zinc-600">
                  캐릭터 정보
                  <Textarea rows={4} value={characterEditorDraft.character} onChange={(event) => updateCharacterDraft("character", event.target.value)} />
                </label>
                <label className="col-span-full grid gap-1.5 text-xs font-extrabold text-zinc-600">
                  지식
                  <Textarea rows={4} value={characterEditorDraft.knowledge} onChange={(event) => updateCharacterDraft("knowledge", event.target.value)} />
                </label>
                <label className="col-span-full grid gap-1.5 text-xs font-extrabold text-zinc-600">
                  뉴스/최근 정보
                  <Textarea rows={3} value={characterEditorDraft.news} onChange={(event) => updateCharacterDraft("news", event.target.value)} />
                </label>
                <label className="col-span-full grid gap-1.5 text-xs font-extrabold text-zinc-600">
                  최근 일정
                  <Textarea rows={3} value={characterEditorDraft.schedule} onChange={(event) => updateCharacterDraft("schedule", event.target.value)} />
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-3.5">
              <Button type="button" variant="outline" onClick={onCloseCharacterEditor} disabled={characterEditorSaving}>취소</Button>
              <Button type="button" onClick={onSaveCharacterEditor} disabled={characterEditorSaving || characterEditorLoading}>
                {characterEditorSaving ? <Loader2 className="spin" size={15} /> : <Save size={15} />}
                저장
              </Button>
            </div>
          </section>
        </div>
      )}

      <section className="grid min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="flex min-h-[82px] items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div>
            <h1 className="m-0 text-lg leading-6">{selectedAgent.title}</h1>
            <p className="m-0 mt-1 text-sm text-zinc-500">{selectedAgent.sessionGoal || selectedAgent.description}</p>
          </div>
          <div className="inline-flex flex-wrap justify-end gap-1.5">
            {(["1-3", "3-4", "4-5"] as const).map((length) => (
              <button
                key={length}
                className={cn(
                  "inline-flex min-h-[34px] min-w-14 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-extrabold transition-colors",
                  responseLength === length
                    ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-950",
                )}
                onClick={() => onSetResponseLength(length)}
              >
                {length}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-h-0 overflow-y-auto bg-zinc-50/70 p-[22px]">
          {messages.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 p-6 text-center text-zinc-500">
              <div className="grid h-14 w-14 place-items-center rounded-full border border-zinc-200 bg-white"><Bot size={26} /></div>
              <p className="m-0">문장으로 시작하거나 이미지를 첨부해 대화를 시작하세요.</p>
              <div className="flex max-w-[560px] flex-wrap justify-center gap-2">
                {starterPrompts.map((prompt) => (
                  <button key={prompt} className="min-h-[34px] rounded-full border border-zinc-300 bg-white px-3.5 text-zinc-600" onClick={() => onSetInput(prompt)}>{prompt}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <article
              key={message.id}
              className={cn(
                "mb-3.5 flex w-full items-start gap-2.5",
                message.role === "agent" ? "justify-start" : "justify-end",
              )}
            >
              {message.role === "agent" && <div className="grid h-[34px] w-[34px] shrink-0 place-items-center overflow-hidden rounded-full border border-sky-200 bg-sky-100 text-xs font-black text-sky-700">{agentInitial}</div>}
              <div
                className={cn(
                  "w-fit max-w-[min(78%,720px)] rounded-lg border border-zinc-200 bg-white px-4 py-3.5 text-zinc-900",
                  message.role === "learner" && "border-zinc-900 bg-zinc-900 text-zinc-50",
                )}
              >
                {message.imageUrl && <img className="mb-2.5 block max-h-60 max-w-[min(100%,380px)] rounded-lg bg-zinc-100 object-contain" src={message.imageUrl} alt="Attached" />}
                <p className={cn(
                  "m-0 whitespace-pre-wrap text-[15px] font-medium leading-7",
                  message.role === "learner" ? "text-white" : "text-zinc-950",
                )}>{message.streaming && !message.text ? "Thinking..." : message.text}</p>
              </div>
              {message.role === "learner" && <div className="order-2 grid h-[34px] w-[34px] shrink-0 place-items-center overflow-hidden rounded-full bg-slate-900 text-xs font-black text-white">{userInitial}</div>}
            </article>
          ))}
          <div ref={endRef} />
        </div>

        <form className="grid gap-2.5 border-t border-zinc-200 bg-white px-[18px] pb-4 pt-3.5" onSubmit={onSendMessage} onPaste={handleInputPaste}>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => onAttachImage(event.target.files)} />

          {image && (
            <div className="inline-grid w-fit grid-cols-[66px_28px] items-center gap-1.5 rounded-lg border border-zinc-300 bg-slate-50 p-1.5">
              <button
                type="button"
                className="grid h-[50px] w-[66px] place-items-center rounded-md bg-transparent p-0 hover:bg-white"
                title="이미지 크게 보기"
                onClick={() => setImagePreviewOpen(true)}
              >
                <img className="h-12 w-16 rounded-md object-cover" src={image.dataUrl} alt={image.name} />
              </button>
              <button
                type="button"
                className="grid h-7 w-7 place-items-center rounded-md bg-transparent text-red-700 hover:bg-red-50"
                title="이미지 삭제"
                aria-label="이미지 삭제"
                onClick={() => onSetImage(null)}
              >
                <X size={13} strokeWidth={3} />
              </button>
            </div>
          )}

          {error && <div className="error">{error}</div>}
          {inputVoiceActive && (
            <div className="grid min-h-[30px] w-[min(100%,420px)] grid-cols-[auto_minmax(120px,1fr)] items-center gap-2.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-extrabold text-sky-700">
              <span>{isRecording ? "녹음 중" : "음성 인식 중"}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-blue-100" aria-hidden="true">
                <span className="block h-full min-w-2 rounded-full bg-[linear-gradient(90deg,#38bdf8,#0f172a)] transition-[width] duration-[90ms] ease-linear" style={{ width: isRecording ? voicePercent : "100%" }} />
              </div>
            </div>
          )}

          <div className={cn("grid gap-2.5 max-[860px]:grid-cols-1", inputVoiceActive ? "grid-cols-[1fr_112px]" : "grid-cols-[1fr_82px]")}>
            <div className="relative min-h-[84px]">
              <Textarea
                className="min-h-[84px] resize-none px-4 pb-12 pt-3.5 text-[15px] font-medium text-zinc-950 placeholder:text-zinc-500"
                value={input}
                onChange={(event) => onSetInput(event.target.value)}
                placeholder="영어나 한국어로 편하게 답변해보세요."
                rows={3}
              />
              <button
                type="button"
                className="absolute bottom-3 left-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-600 shadow-sm transition-colors hover:border-zinc-400 hover:text-zinc-950"
                title="이미지 첨부"
                onClick={() => fileRef.current?.click()}
              >
                <ImageIcon size={17} />
              </button>
            </div>
            <div className="flex min-h-[84px] flex-col gap-2 max-[860px]:grid max-[860px]:grid-cols-[44px_minmax(96px,1fr)]">
              <div className="grid grid-cols-1 gap-2 max-[860px]:contents">
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white text-[13px] font-extrabold text-zinc-600",
                    inputVoiceActive && "border-red-600 bg-red-600 px-2 text-white hover:bg-red-700",
                  )}
                  title={inputVoiceActive ? (isTranscribing ? "음성 인식 중" : "녹음 중지") : "음성 입력"}
                  disabled={isTranscribing || (voiceTarget !== null && !inputVoiceActive)}
                  onClick={() => onToggleVoiceInput("input")}
                >
                  {inputVoiceActive && isTranscribing && <Loader2 className="spin" size={18} />}
                  {inputVoiceActive && isRecording && (
                    <>
                      <Square size={13} fill="currentColor" />
                      <span>녹음 중지</span>
                    </>
                  )}
                  {!inputVoiceActive && <Mic size={18} />}
                </button>
              </div>
              <button type="submit" className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-900 text-[13px] font-extrabold text-white disabled:opacity-[.45] max-[860px]:h-9" disabled={sending || (!input.trim() && !image)}>
                {sending ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                전송
              </button>
            </div>
          </div>
        </form>
      </section>

      <aside className="hidden min-h-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white p-4 min-[1181px]:flex">
        <h2 className="m-0 mb-3.5 text-lg font-black leading-6 text-zinc-950">학습 도구</h2>
        <div className="grid grid-cols-4 gap-1 rounded-lg border border-zinc-300 bg-zinc-100 p-1">
          {[
            ["suggestions", "추천 답변"],
            ["questions", "추천 질문"],
            ["koen", "한영"],
            ["history", "히스토리"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={cn(
                "min-h-9 rounded-md px-1.5 text-[13px] font-extrabold transition-colors",
                sidebarTab === key
                  ? "bg-zinc-950 text-white shadow-sm"
                  : "bg-transparent text-zinc-700 hover:bg-white hover:text-zinc-950",
              )}
              onClick={() => onSetSidebarTab(key as LearningTab)}
            >
              {label}
            </button>
          ))}
        </div>

        {sidebarTab === "suggestions" && (
          <section className="mt-3.5 grid content-start gap-3">
            <button className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-md border border-zinc-900 bg-zinc-900 px-3 text-white disabled:cursor-not-allowed disabled:opacity-55" onClick={onBuildSuggestedReplies} disabled={suggestingReplies}>
              {suggestingReplies ? <Loader2 className="spin" size={15} /> : <WandSparkles size={15} />}
              {suggestingReplies ? "추천 생성 중" : "최근 대화로 3개 추천"}
            </button>
            {suggestedReplies.length === 0 ? (
              <p className="m-0 text-[13px] font-medium leading-6 text-zinc-600">버튼을 누르면 최근 대화 5개를 바탕으로 바로 보낼 수 있는 자연스러운 답변 3개가 표시됩니다.</p>
            ) : suggestedReplies.map((reply, index) => (
              <div className="grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-zinc-200 p-3" key={`${reply}-${index}`}>
                <small className="text-[11px] font-extrabold text-zinc-500">추천 {index + 1}</small>
                <p className="col-span-full m-0 leading-[22px]">{reply}</p>
                <button className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-zinc-700" onClick={() => onSetInput(reply)}><Send size={14} /> 입력</button>
              </div>
            ))}
          </section>
        )}

        {sidebarTab === "questions" && (
          <section className="mt-3.5 grid content-start gap-3">
            <div className="grid grid-cols-4 gap-1.5" aria-label="추천 질문 개수">
              {([3, 5, 10, 20] as const).map((count) => (
                <button
                  key={count}
                  type="button"
                  className={cn(
                    "min-h-[34px] rounded-lg border text-xs font-extrabold transition-colors",
                    suggestedQuestionCount === count
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-950",
                  )}
                  onClick={() => onSetSuggestedQuestionCount(count)}
                >
                  {count}개
                </button>
              ))}
            </div>
            <button
              className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-md border border-zinc-900 bg-zinc-900 px-3 text-white disabled:cursor-not-allowed disabled:opacity-55"
              onClick={() => onBuildSuggestedQuestions(suggestedQuestionCount)}
              disabled={suggestingQuestions}
            >
              {suggestingQuestions ? <Loader2 className="spin" size={15} /> : <WandSparkles size={15} />}
              {suggestingQuestions ? "질문 생성 중" : "캐릭터 기반 질문 생성"}
            </button>
            {suggestedQuestions.length === 0 ? (
              <p className="m-0 text-[13px] font-medium leading-6 text-zinc-600">캐릭터 설정을 바탕으로 먼저 물어볼 만한 질문을 개수별로 생성합니다.</p>
            ) : suggestedQuestions.map((question, index) => (
              <div className="grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-zinc-200 p-3" key={`${question}-${index}`}>
                <small className="text-[11px] font-extrabold text-zinc-500">질문 {index + 1}</small>
                <p className="col-span-full m-0 leading-[22px]">{question}</p>
                <button className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-zinc-700" onClick={() => onSetInput(question)}><Send size={14} /> 입력</button>
              </div>
            ))}
          </section>
        )}

        {sidebarTab === "koen" && (
          <section className="mt-3.5 grid content-start gap-3">
            <div className="flex min-h-[38px] items-center justify-between gap-2.5">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-zinc-800"><Languages size={15} /> 한영 모드</span>
              <button
                className={cn(
                  "inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-md border px-3 font-extrabold transition-colors",
                  autoTranslate
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-950",
                )}
                onClick={() => onSetAutoTranslate(!autoTranslate)}
              >
                {autoTranslate ? "켜짐" : "꺼짐"}
              </button>
            </div>
            <label className="text-xs font-extrabold uppercase text-zinc-500">Draft</label>
            <Textarea
              className="min-h-[168px] resize-none p-[13px] leading-6"
              value={draftKo}
              onChange={(event) => onSetDraftKo(event.target.value)}
              placeholder="한국어로 먼저 말하고 싶은 내용을 적어보세요."
              rows={7}
            />
            <div className="flex gap-2">
              <button className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-md border border-zinc-900 bg-zinc-900 px-3 text-white disabled:cursor-not-allowed disabled:opacity-55" onClick={onBuildFeedback} disabled={!draftKo.trim() && !input.trim()}><Sparkles size={15} /> 표현 확인</button>
              <button
                className={cn(
                  "inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-zinc-700 disabled:cursor-not-allowed disabled:opacity-55",
                  draftVoiceActive && "border-zinc-900 bg-zinc-900 text-white",
                )}
                disabled={isTranscribing || (voiceTarget !== null && !draftVoiceActive)}
                onClick={() => onToggleVoiceInput("draft")}
              >
                {draftVoiceActive && isTranscribing && <Loader2 className="spin" size={15} />}
                {draftVoiceActive && isRecording && <Square size={12} fill="currentColor" />}
                {!draftVoiceActive && <Mic size={15} />}
                {draftVoiceActive ? (isTranscribing ? "인식 중" : "녹음 중지") : "음성 입력"}
              </button>
            </div>
            {draftVoiceActive && (
              <div className="grid min-h-[30px] w-full grid-cols-[auto_minmax(120px,1fr)] items-center gap-2.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-extrabold text-sky-700">
                <span>{isRecording ? "녹음 중" : "음성 인식 중"}</span>
                <div className="h-1.5 overflow-hidden rounded-full bg-blue-100" aria-hidden="true">
                  <span className="block h-full min-w-2 rounded-full bg-[linear-gradient(90deg,#38bdf8,#0f172a)] transition-[width] duration-[90ms] ease-linear" style={{ width: isRecording ? voicePercent : "100%" }} />
                </div>
              </div>
            )}
          </section>
        )}

        {sidebarTab === "history" && (
          <section className="mt-3.5 grid gap-3">
            <button className="inline-flex min-h-[34px] items-center justify-center gap-1.5 rounded-md border border-zinc-900 bg-zinc-900 px-3 text-white disabled:cursor-not-allowed disabled:opacity-55" onClick={onSaveSession} disabled={messages.length === 0}>
              <Save size={15} />
              현재 대화 저장
            </button>
            {history.length === 0 ? (
              <p className="muted">저장된 대화가 없습니다.</p>
            ) : history.map((session, index) => (
              <button key={index} className="inline-flex min-h-[34px] w-full items-center justify-start gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-left text-zinc-700" onClick={() => onSetMessages(session)}>
                <HistoryIcon size={15} />
                <span className="truncate">{session[0]?.text.slice(0, 42) || "Saved conversation"}</span>
              </button>
            ))}
          </section>
        )}
      </aside>

      {imagePreviewOpen && image && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/55 p-6" role="presentation" onClick={() => setImagePreviewOpen(false)}>
          <section
            className="grid max-h-[min(720px,calc(100vh-48px))] w-[min(920px,calc(100vw-48px))] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.30)]"
            role="dialog"
            aria-modal="true"
            aria-label="첨부 이미지 미리보기"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_36px] items-center gap-3 border-b border-zinc-200 px-4 py-3">
              <strong className="truncate text-sm text-zinc-900">{image.name}</strong>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-slate-50"
                aria-label="이미지 미리보기 닫기"
                onClick={() => setImagePreviewOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid min-h-0 place-items-center bg-zinc-50 p-4">
              <img className="max-h-full max-w-full rounded-md object-contain" src={image.dataUrl} alt={image.name} />
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
