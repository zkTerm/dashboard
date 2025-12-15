import { DashboardCardProps } from './types';

export function DashboardCard({ 
  title, 
  children, 
  className = "", 
  headerAction, 
  noPadding = false, 
  flush = false 
}: DashboardCardProps) {
  return (
    <div 
      className={`dashboard-card font-supply h-full flex flex-col relative ${className}`}
      data-testid={`card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center justify-between mb-2 ml-0 relative z-[2]">
        <div className="flex bg-[#c4d5bd] py-1.5 px-4 h-[30px] box-border items-center">
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
      
      <div 
        className={`flex-1 border border-[#c4d5bd] relative rounded-none ${
          flush ? 'p-0 bg-black/50 backdrop-blur-md' : 'p-2 bg-transparent'
        }`}
      >
        <div 
          className={`h-full relative rounded-none ${
            noPadding ? 'p-0' : 'p-4'
          } ${
            flush ? 'bg-transparent' : 'bg-black/10 backdrop-blur-md'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default DashboardCard;
