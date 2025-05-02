import React, { useState } from "react";
import Header from "@/components/Header";
import UploadZone from "@/components/UploadZone";
import DirectoryExplorer, { FileNode } from "@/components/DirectoryExplorer";
import FilePreview from "@/components/FilePreview";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const Index: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [directoryData, setDirectoryData] = useState<FileNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

  const handleUploadComplete = (data: FileNode) => {
    setIsLoading(false);
    setDirectoryData(data);
  };

  const handleUpload = () => {
    setIsLoading(true);
  };

  const handleFileSelect = (file: FileNode) => {
    if (file.type === "file") {
      setSelectedFile(file);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        <Header />

        <main className="flex-1 flex flex-col">
          {!directoryData ? (
            <div className="flex-1 container max-w-3xl mx-auto flex items-center justify-center p-4">
              <UploadZone
                onUploadComplete={handleUploadComplete}
                isLoading={isLoading}
              />
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
              <div className="w-64 border-r border-border overflow-y-auto">
                <div className="p-3 bg-sidebar-accent text-sidebar-foreground font-medium">
                  Project Explorer
                </div>
                <Separator />
                <DirectoryExplorer
                  data={directoryData}
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                />
              </div>

              <div className="flex-1 overflow-auto p-4">
                <FilePreview file={selectedFile} />
              </div>
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
