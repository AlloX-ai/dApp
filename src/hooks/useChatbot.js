import { useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { apiCall } from "../utils/api";
import {
  addChatbotMessage,
  appendToChatbotMessage,
  setChatbotError,
  setChatbotInputValue,
  setChatbotThinking,
  resetChatbot,
} from "../redux/slices/chatbotSlice";

export const formatText = (text) => {
  // Convert newlines to <br />
  text = text.replace(/\n/g, "<br />");

  // Convert Markdown-style bold (**text**) to <b>text</b>
  text = text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

  // Convert Markdown-style links [text](url)
  text = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g,
    `<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>`
  );

  // Convert plain URLs to clickable links (removing trailing dots)
  text = text.replace(/(?<!href=")(https?:\/\/[^\s<]+)\.?/g, (match, url) => {
    const cleanUrl = url.replace(/\.+$/, "");
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>`;
  });

  return text;
};

const makeMessageId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const waitWithAbort = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Request aborted", "AbortError"));
      return;
    }

    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      reject(new DOMException("Request aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort);
  });

export function useChatbot() {
  const dispatch = useDispatch();
  const { messages, inputValue, isThinking, error } = useSelector(
    (state) => state.chatbot,
  );
  const abortControllerRef = useRef(null);

  const setInputValue = useCallback(
    (value) => dispatch(setChatbotInputValue(value)),
    [dispatch],
  );

  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      dispatch(setChatbotThinking(false));
    }
  }, [dispatch]);

  const sendMessage = useCallback(
    async (overrideQuestion) => {
      const question = (overrideQuestion ?? inputValue).trim();
      if (!question || isThinking) return;

      const userMessage = {
        id: makeMessageId("user"),
        type: "user",
        content: question,
        timestamp: new Date().toISOString(),
      };
      const aiMessageId = makeMessageId("ai");

      dispatch(setChatbotError(null));
      dispatch(addChatbotMessage(userMessage));
      dispatch(setChatbotInputValue(""));
      dispatch(setChatbotThinking(true));
      dispatch(
        addChatbotMessage({
          id: aiMessageId,
          type: "ai",
          content: "",
          timestamp: new Date().toISOString(),
        }),
      );

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await apiCall(
          "/web3chat/message",
          {
            method: "POST",
            body: JSON.stringify({ message: question, question }),
            signal: controller.signal,
          },
          true,
        );

        const aiText =
          typeof response?.answer === "string"
            ? response.answer
            : "Sorry, I could not process that request right now.";

        // Stop the thinking indicator as soon as the API has returned.
        dispatch(setChatbotThinking(false));

        const chunkSize = 3;
        const delayMs = 24;

        for (let i = 0; i < aiText.length; i += chunkSize) {
          if (controller.signal.aborted) {
            throw new DOMException("Request aborted", "AbortError");
          }

          const chunk = aiText.slice(i, i + chunkSize);
          dispatch(
            appendToChatbotMessage({
              id: aiMessageId,
              text: chunk,
            }),
          );

          if (i + chunkSize < aiText.length) {
            await waitWithAbort(delayMs, controller.signal);
          }
        }
      } catch (err) {
        if (err?.name !== "AbortError") {
          dispatch(setChatbotError(err?.message || "Failed to send message"));
          dispatch(
            appendToChatbotMessage({
              id: aiMessageId,
              text: "Sorry, I could not process that request right now.",
            }),
          );
        }
      } finally {
        abortControllerRef.current = null;
        dispatch(setChatbotThinking(false));
      }
    },
    [dispatch, inputValue, isThinking],
  );

  useEffect(
    () => () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    },
    [],
  );

  return {
    messages,
    inputValue,
    isThinking,
    error,
    setInputValue,
    sendMessage,
    cancelStreaming,
    resetChat: () => dispatch(resetChatbot()),
  };
}
