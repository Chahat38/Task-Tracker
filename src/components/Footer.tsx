import React from 'react';

export const Footer: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <footer
      id="global-footer"
      className={`h-10 bg-white border-t border-slate-200 flex items-center justify-center shrink-0 ${className}`}
    >
      <p className="text-[11px] font-medium text-slate-400 tracking-wide">
        Made by <span className="font-semibold text-slate-600">All Rights Reserved to Chahat Founder of SactanX</span>
      </p>
    </footer>
  );
};

