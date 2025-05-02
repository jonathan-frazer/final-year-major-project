import React, { useState } from "react";
import {
  FolderIcon,
  FileTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface FileNode {
  name: string;
  type: "file" | "directory";
  content?: string;
  children?: FileNode[];
  path?: string; // Track the path for flattened view
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
  const [flattenPackages, setFlattenPackages] = useState(false);

  // Process the directory tree to flatten packages according to IntelliJ style
  const processDirectoryTree = (
    node: FileNode,
    currentPath: string = ""
  ): FileNode[] => {
    if (!node) return [];

    if (node.type === "file") {
      const processedNode = {
        ...node,
        path: currentPath ? `${currentPath}/${node.name}` : node.name,
      };
      return [processedNode];
    }

    if (!node.children || node.children.length === 0) {
      return [];
    }

    // When flattening is enabled
    if (flattenPackages) {
      // Directories with a single file should be flattened
      if (node.children.length === 1 && node.children[0].type === "file") {
        const childNode = node.children[0];
        const newPath = currentPath ? `${currentPath}/${node.name}` : node.name;
        const processedNode = {
          ...childNode,
          name: `${node.name}/${childNode.name}`,
          path: newPath ? `${newPath}/${childNode.name}` : childNode.name,
        };
        return [processedNode];
      }
    }

    // For directories with multiple items or when not flattening
    const newPath = currentPath ? `${currentPath}/${node.name}` : node.name;
    const processedNode = { ...node, path: newPath };

    if (flattenPackages) {
      // Process children and flatten where applicable
      let processedChildren: FileNode[] = [];
      node.children.forEach((child) => {
        const childResults = processDirectoryTree(child, newPath);
        processedChildren = [...processedChildren, ...childResults];
      });

      // Replace children with processed ones
      processedNode.children = processedChildren;
    }

    return [processedNode];
  };

  const processedData = data ? processDirectoryTree(data)[0] : null;

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 flex items-center space-x-2">
        <Checkbox
          id="flattenPackages"
          checked={flattenPackages}
          onCheckedChange={(checked) => setFlattenPackages(checked === true)}
        />
        <Label htmlFor="flattenPackages" className="text-sm text-doc-gray">
          Flatten Packages
        </Label>
      </div>

      <ScrollArea
        className="flex-1 overflow-y-auto"
        style={{ maxHeight: `77vh` }}
      >
        <div className="p-2">
          {processedData ? (
            <DirectoryTree
              node={processedData}
              level={0}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              defaultExpanded={true}
              flattenPackages={flattenPackages}
            />
          ) : (
            <div className="p-4 text-doc-gray text-center">
              No files to display
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

interface DirectoryTreeProps {
  node: FileNode;
  level: number;
  onFileSelect: (file: FileNode) => void;
  selectedFile: FileNode | null;
  defaultExpanded?: boolean;
  flattenPackages?: boolean;
}

const DirectoryTree: React.FC<DirectoryTreeProps> = ({
  node,
  level,
  onFileSelect,
  selectedFile,
  defaultExpanded = false,
  flattenPackages = false,
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
    // Skip rendering directories with no children
    if (!node.children || node.children.length === 0) {
      return null;
    }

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
                flattenPackages={flattenPackages}
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
