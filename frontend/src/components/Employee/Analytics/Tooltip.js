import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

const Tooltip = ({ text, children }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-flex items-center gap-1">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-flex items-center gap-1 cursor-default"
      >
        {children}
        <HelpCircle size={11} className="text-muted opacity-50 hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>

      {show && (
        <div className="absolute z-50 bottom-full left-0 mb-2 px-3 py-2 bg-card border border-white/[0.12] rounded-xl shadow-2xl w-56 pointer-events-none">
          <p className="font-outfit text-[11px] text-sub leading-relaxed">{text}</p>
          <div className="absolute top-full left-4">
            <div className="border-[6px] border-transparent border-t-card" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
