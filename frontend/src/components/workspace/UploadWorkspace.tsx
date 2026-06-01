import { es } from '../../i18n/es';

type Props = {
  file: File | null;
  onFile: (f: File | null) => void;
};

export function UploadWorkspace({ file, onFile }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">{es.uploadTitle}</h3>
        <p className="mt-1 text-xs text-slate-500">{es.uploadHint}</p>
      </div>

      <label className="upload-zone">
        <input
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-500/20 bg-teal-500/10">
          <svg
            className="h-7 w-7 text-teal-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>
        <span className="text-sm font-medium text-slate-200">{es.uploadButton}</span>
        <span className="mt-1 text-xs text-slate-500">{es.uploadDrop}</span>
        {file && (
          <span className="mt-4 max-w-full truncate rounded-md bg-teal-500/10 px-3 py-1.5 font-mono text-xs text-teal-300">
            {file.name}
          </span>
        )}
      </label>
    </div>
  );
}
