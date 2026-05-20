import React from 'react';
import { X, AlertCircle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, title }: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#121212] border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-8 text-center">
          <div className="w-12 h-12 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-lg font-medium text-white mb-2">Confirm Action</h2>
          <p className="text-sm text-neutral-500 leading-relaxed">
            {title === 'Library' 
              ? 'Are you absolutely sure you want to clear your entire library? This action is irreversible.' 
              : `Are you sure you would like to delete this ${title.toLowerCase()}?`}
          </p>
        </div>

        <div className="flex border-t border-neutral-800">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all border-r border-neutral-800"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-6 py-4 text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-950/30 transition-all"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
