import React, { useState } from "react";
import {
  FolderIcon,
  FileTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileNode {
  name: string;
  type: "file" | "directory";
  content?: string;
  children?: FileNode[];
}

interface DirectoryExplorerProps {
  data: FileNode | null;
  onFileSelect: (file: FileNode) => void;
  selectedFile: FileNode | null;
}

const DirectoryExplorer: React.FC<DirectoryExplorerProps> = ({
  data,
  onFileSelect,
  selectedFile,
}) => {
  return (
    <div className="h-full overflow-auto bg-sidebar p-2">
      {data ? (
        <DirectoryTree
          node={data}
          level={0}
          onFileSelect={onFileSelect}
          selectedFile={selectedFile}
          defaultExpanded={true}
        />
      ) : (
        <div className="p-4 text-doc-gray text-center">No files to display</div>
      )}
    </div>
  );
};

interface DirectoryTreeProps {
  node: FileNode;
  level: number;
  onFileSelect: (file: FileNode) => void;
  selectedFile: FileNode | null;
  defaultExpanded?: boolean;
}

const DirectoryTree: React.FC<DirectoryTreeProps> = ({
  node,
  level,
  onFileSelect,
  selectedFile,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || level < 2);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const isSelected =
    selectedFile &&
    selectedFile.name === node.name &&
    selectedFile.type === node.type &&
    selectedFile.content === node.content;

  if (node.type === "directory") {
    return (
      <div
        className="animate-fade-in"
        style={{ animationDelay: `${level * 50}ms` }}
      >
        <div
          className={cn(
            "directory-item",
            isSelected && "bg-doc-dark text-doc-orange"
          )}
          onClick={handleToggle}
        >
          <span className="flex-shrink-0" onClick={handleToggle}>
            {isExpanded ? (
              <ChevronDownIcon size={16} className="text-doc-orange" />
            ) : (
              <ChevronRightIcon size={16} className="text-doc-gray" />
            )}
          </span>
          <FolderIcon size={16} className="text-doc-orange" />
          <span className="truncate">{node.name}</span>
        </div>

        {isExpanded && node.children && (
          <div className="pl-5 border-l border-sidebar-border">
            {node.children.map((child, index) => (
              <DirectoryTree
                key={`${child.name}-${index}`}
                node={child}
                level={level + 1}
                onFileSelect={onFileSelect}
                selectedFile={selectedFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  } else {
    return (
      <div
        className={cn("file-item animate-slide-in", isSelected && "active")}
        style={{ animationDelay: `${level * 50}ms` }}
        onClick={() => onFileSelect(node)}
      >
        <FileTextIcon size={16} className="text-doc-gray" />
        <span className="truncate">{node.name}</span>
      </div>
    );
  }
};

export default DirectoryExplorer;
