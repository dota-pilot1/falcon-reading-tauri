export type Message = {
  id: string;
  role: "learner" | "agent";
  text: string;
  translatedText?: string;
  imageUrl?: string;
  streaming?: boolean;
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};
