import { useEffect, useRef, useCallback } from "react";

interface UseTypewriterOptions {
  text: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
}

export const useTypewriter = ({
  text,
  speed = 50,
  delay = 0,
  onComplete,
}: UseTypewriterOptions) => {
  const displayTextRef = useRef("");
  const indexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startTyping = useCallback(() => {
    if (indexRef.current < text.length) {
      displayTextRef.current = text.slice(0, indexRef.current + 1);
      indexRef.current++;

      timeoutRef.current = setTimeout(startTyping, speed);
    } else if (onComplete) {
      onComplete();
    }
  }, [text, speed, onComplete]);

  const resetTyping = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    displayTextRef.current = "";
    indexRef.current = 0;
  }, []);

  useEffect(() => {
    resetTyping();

    if (delay > 0) {
      timeoutRef.current = setTimeout(startTyping, delay);
    } else {
      startTyping();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, delay, startTyping, resetTyping]);

  return {
    displayText: displayTextRef.current,
    isComplete: indexRef.current >= text.length,
    reset: resetTyping,
  };
};
