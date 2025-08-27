import React from "react";
import { createFormattedParagraphs } from "@/lib/markdownFormatter";

interface FormattedResponseProps {
  content: string;
  className?: string;
}

const FormattedResponse: React.FC<FormattedResponseProps> = ({
  content,
  className = "",
}) => {
  return (
    <div
      className={`formatted-response ${className}`}
      dangerouslySetInnerHTML={{
        __html: createFormattedParagraphs(content),
      }}
    />
  );
};

export default FormattedResponse;
