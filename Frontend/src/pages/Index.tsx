import React, { useState } from "react";
import Header from "@/components/Header";
import UploadZone from "@/components/UploadZone";
import DirectoryExplorer, { FileNode } from "@/components/DirectoryExplorer";
import FilePreview from "@/components/FilePreview";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import JSZip from "jszip";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

const Index: React.FC = () => {
  const [directoryData, setDirectoryData] = useState<FileNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);

  const handleUploadComplete = (data: FileNode) => {
    setDirectoryData(data);
  };

  const handleFileSelect = (file: FileNode) => {
    if (file.type === "file") {
      setSelectedFile(file);
    }
  };

  console.log(directoryData);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full">
        <Header />

        <main className="flex-1 flex flex-col">
          {!directoryData ? (
            <div className="flex-1 container max-w-3xl mx-auto flex items-center justify-center p-4">
              <UploadZone onUploadComplete={handleUploadComplete} />
            </div>
          ) : (
            <ResizablePanelGroup
              direction="horizontal"
              className="flex-1 overflow-hidden"
            >
              <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                <div className="h-full flex flex-col">
                  <div className="p-3 bg-sidebar-accent text-sidebar-foreground font-medium">
                    Project Explorer
                  </div>
                  <Separator />
                  <div className="flex-1 overflow-hidden">
                    <DirectoryExplorer
                      data={directoryData}
                      onFileSelect={handleFileSelect}
                      selectedFile={selectedFile}
                    />
                  </div>
                  <div className="p-3 bg-sidebar-accent text-sidebar-foreground font-medium">
                    <button
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-orange-700 rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-blue-200"
                      onClick={() => {
                        const zip = new JSZip();
                        const directory = directoryData;

                        const addFilesToZip = (node, currentPath = "") => {
                          const nodePath = currentPath
                            ? `${currentPath}/${node.name}`
                            : node.name;

                          if (node.type === "file") {
                            zip.file(nodePath, node.content);
                          } else if (
                            node.type === "directory" &&
                            node.children
                          ) {
                            node.children.forEach((child) => {
                              addFilesToZip(child, nodePath);
                            });
                          }
                        };

                        addFilesToZip(directory);

                        zip.generateAsync({ type: "blob" }).then((blob) => {
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = `${directory.name}.zip`;
                          link.click();
                          window.URL.revokeObjectURL(url);
                        });
                      }}
                    >
                      Download
                    </button>
                  </div>
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={80}>
                <div className="h-full p-4">
                  <FilePreview file={selectedFile} />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
