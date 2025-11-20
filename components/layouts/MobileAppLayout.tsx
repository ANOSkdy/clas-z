import { type ReactNode } from "react";

interface MobileAppLayoutProps {
  header?: ReactNode;
  bottomNavigation?: ReactNode;
  children: ReactNode;
  containerClassName?: string;
  shellClassName?: string;
  contentClassName?: string;
}

function mergeClassNames(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function MobileAppLayout({
  header,
  bottomNavigation,
  children,
  containerClassName,
  shellClassName,
  contentClassName,
}: MobileAppLayoutProps) {
  const containerClasses = mergeClassNames(
    "h-[100dvh] w-full bg-white md:bg-slate-900/80 md:px-4 md:py-4",
    "md:flex md:items-center md:justify-center",
    containerClassName,
  );

  const shellClasses = mergeClassNames(
    "relative flex h-full w-full max-w-[430px] flex-col overflow-hidden bg-white",
    "md:h-[calc(100dvh-2rem)] md:rounded-[32px] md:border md:border-slate-200/60 md:shadow-2xl",
    "text-slate-900",
    shellClassName,
  );

  const headerClasses = "flex-none z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70";
  const bottomNavClasses = mergeClassNames(
    "flex-none z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70",
    "pb-[env(safe-area-inset-bottom)]",
  );

  const contentClasses = mergeClassNames(
    "scroll-area flex-1 overflow-y-auto overscroll-contain",
    contentClassName,
  );

  return (
    <div className={containerClasses}>
      <div className={shellClasses}>
        {header ? <header className={headerClasses}>{header}</header> : null}

        <main className={contentClasses}>{children}</main>

        {bottomNavigation ? (
          <nav className={bottomNavClasses}>{bottomNavigation}</nav>
        ) : null}
      </div>

      <style jsx>{`
        .scroll-area {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scroll-area::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

export default MobileAppLayout;
