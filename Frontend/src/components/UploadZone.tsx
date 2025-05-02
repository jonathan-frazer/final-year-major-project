import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { json } from "stream/consumers";

interface UploadZoneProps {
  onUploadComplete: (files: any) => void;
  isLoading: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({
  onUploadComplete,
  isLoading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  };

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;

    const file = files[0];
    if (file.type !== "application/zip" && !file.name.endsWith(".zip")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a ZIP file",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/code_upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const jsonResponse = await response.json();
      console.log("Received JSON:", jsonResponse);

      toast({
        title: "Upload successful",
        description: "Received response from server",
      });
      onUploadComplete(jsonResponse.structure);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload error",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const simulateBackendResponse = (file: File) => {
    // This is just a mock - in a real app, we'd send the file to the backend
    // and get back a proper response with the directory structure

    setTimeout(() => {
      const mockResponseData = {
        name: "root",
        type: "directory",
        children: [
          {
            name: "src",
            type: "directory",
            children: [
              {
                name: "components",
                type: "directory",
                children: [
                  {
                    name: "Button.tsx",
                    type: "file",
                    content:
                      'export const Button = () => {\n  return <button className="btn">Click me</button>\n};',
                  },
                  {
                    name: "Card.tsx",
                    type: "file",
                    content:
                      'export const Card = ({ children }) => {\n  return <div className="card">{children}</div>\n};',
                  },
                ],
              },
              {
                name: "utils",
                type: "directory",
                children: [
                  {
                    name: "format.ts",
                    type: "file",
                    content:
                      "export const formatDate = (date) => {\n  return new Date(date).toLocaleDateString();\n};",
                  },
                ],
              },
              {
                name: "App.tsx",
                type: "file",
                content:
                  'import React from "react";\n\nexport const App = () => {\n  return <div>Hello world</div>;\n};',
              },
              {
                name: "index.ts",
                type: "file",
                content: 'import { App } from "./App";\n\nexport default App;',
              },
            ],
          },
          {
            name: "docs",
            type: "directory",
            children: [
              {
                name: "README.md",
                type: "file",
                content:
                  "# Documentation\n\nThis is the documentation for the project.",
              },
            ],
          },
          {
            name: "package.json",
            type: "file",
            content:
              '{\n  "name": "example-project",\n  "version": "1.0.0",\n  "dependencies": {\n    "react": "^18.0.0"\n  }\n}',
          },
        ],
      };

      onUploadComplete(mockResponseData);

      toast({
        title: "Upload complete",
        description: `${file.name} processed successfully`,
      });
    }, 1500);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg ${
        isDragging ? "border-doc-orange bg-doc-dark/50" : "border-gray-600"
      } p-8 flex flex-col items-center justify-center transition-all`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <UploadIcon className="w-8 h-8 text-doc-orange" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Upload Documentation</h3>
      <p className="text-doc-gray text-center mb-4">
        Drag and drop your ZIP file here, or click to browse
      </p>

      <div className="relative">
        <Button
          className="bg-doc-orange hover:bg-doc-orange/90 text-white"
          disabled={isLoading}
        >
          {isLoading ? "Processing..." : "Select ZIP File"}
        </Button>
        <input
          type="file"
          accept=".zip"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileInput}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};

export default UploadZone;
