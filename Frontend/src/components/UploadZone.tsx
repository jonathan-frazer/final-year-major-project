import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { json } from "stream/consumers";

interface UploadZoneProps {
  onUploadComplete: (files: any) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
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
      setIsLoading(false);

      toast({
        title: "Upload error",
        description: String(error),
        variant: "destructive",
      });
    }
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
          {isLoading ? (
            <div className="flex items-center">
              <span className="animate-spin mr-2 inline-block w-4 h-4 border-2 border-t-2 border-transparent border-t-white rounded-full"></span>
              Processing...
            </div>
          ) : (
            "Select ZIP File"
          )}
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
