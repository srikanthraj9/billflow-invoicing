import * as React from 'react';

export function AuthDivider({ text = 'OR' }: { text?: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-slate-200" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-white px-3 font-semibold text-slate-400 tracking-wider">
          {text}
        </span>
      </div>
    </div>
  );
}
