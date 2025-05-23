import React from "react";
import { FileNode } from "./DirectoryExplorer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FilePreviewProps {
  file: FileNode | null;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file }) => {
  if (!file) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-full text-doc-gray">
          <p>No file selected</p>
        </CardContent>
      </Card>
    );
  }

  // Function to detect if content is JSON and pretty print it
  const formatContent = (content: string = "") => {
    try {
      if (content.trim().startsWith("{") || content.trim().startsWith("[")) {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
      }
      return content;
    } catch (e) {
      return content;
    }
  };

  const formattedContent = formatContent(file.content);
  const isDocumentation = file.type === "documentation";

  // Simple code syntax highlighting based on file extension
  const getLanguageClass = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
        return "language-typescript";
      case "json":
        return "language-json";
      case "html":
        return "language-html";
      case "css":
        return "language-css";
      case "md":
        return "language-markdown";
      default:
        return "language-plaintext";
    }
  };

  return (
    <Card className="h-full overflow-hidden border-secondary bg-card">
      <CardHeader className="px-4 py-3 bg-secondary">
        <CardTitle className="text-sm font-medium flex items-center">
          <span className="text-doc-orange">{file.name}</span>
        </CardTitle>
      </CardHeader>
      <Separator />
      <CardContent className="p-0 h-[calc(100%-40px)]">
        <ScrollArea
          className="flex-1 overflow-y-auto h-full w-full"
          style={{ maxHeight: `80vh` }}
        >
          {!isDocumentation && (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin mr-2 inline-block w-32 h-32 border-8 border-t-8 border-transparent border-t-white rounded-full" />
            </div>
          )}
          {isDocumentation && (
            <pre
              className={`p-4 text-sm whitespace-pre-wrap break-words ${getLanguageClass(
                file.name
              )}`}
            >
              <code>{formattedContent}</code>
            </pre>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default FilePreview;
