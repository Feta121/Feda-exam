export default function LoadingScreen({ message = 'Loading question bank…' }: { message?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6 dark:bg-navy-950" role="status" aria-live="polite">
      <div className="flex w-full max-w-xs flex-col items-center gap-5">
        <div className="w-full overflow-hidden rounded-2xl bg-[#f4f8f9] ring-1 ring-slate-300/60 dark:ring-navy-800">
          <img src={`${import.meta.env.BASE_URL}brand.png`} alt="Anesthesia Mock Exam by Abdulfetah" width={720} height={264} className="block h-auto w-full" />
        </div>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-200 dark:bg-navy-800">
          <div className="loading-bar h-full w-1/3 rounded-full bg-teal-500" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
      </div>
    </div>
  );
}
