import React from "react";

export const externalLink = (
  url: string,
  text: string | React.ReactElement,
  className?: string 
) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className={className}
  >
    {text}
  </a>
);