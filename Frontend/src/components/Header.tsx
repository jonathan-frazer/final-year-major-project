import React from "react";
import { FolderIcon } from "lucide-react";

const Header: React.FC = () => {
  return (
    <header className="border-b border-border">
      <div className="container flex items-center justify-between h-16 px-4">
        <div className="flex items-center space-x-2">
          <FolderIcon className="w-6 h-6 text-doc-orange" />
          <span className="text-xl font-bold">
            <span className="text-doc-orange">NeuroDoc</span> Navigator
          </span>
        </div>

        <div className="text-sm text-doc-gray">
          Documentation Generator & Explorer
        </div>
      </div>
    </header>
  );
};

export default Header;
