import React from 'react';

export const Footer: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <footer
      id="global-footer"
      className={`h-10 bg-white border-t border-slate-200 flex items-center justify-center shrink-0 ${className}`}
    >
      <p className="text-[11px] font-medium text-slate-500 tracking-wide">
        All Rights reserved To Chahat Founder of SactanX
      </p>
    </footer>
  );
};


