interface ExplorerWindowProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export function ExplorerWindow({ title, children, className = "", headerAction }: ExplorerWindowProps) {
  return (
    <div 
      className={`explorer-window font-supply relative ${className}`}
      data-testid={`explorer-window-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center justify-between -mb-px relative z-[2]">
        <div className="explorer-tab flex items-center bg-[#c4d5bd] py-1.5 px-4 h-[30px] box-border">
          <span className="text-black text-base font-medium uppercase tracking-wider font-supply">
            {title}
          </span>
        </div>
        {headerAction && (
          <div className="ml-3">
            {headerAction}
          </div>
        )}
      </div>
      
      <div className="explorer-content border border-[#c4d5bd] p-6 relative bg-black/50 backdrop-blur-md rounded-none">
        {children}
      </div>
    </div>
  );
}

export default ExplorerWindow;
