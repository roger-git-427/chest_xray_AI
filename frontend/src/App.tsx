import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchConditions,
  fetchImageList,
  fetchSettings,
  imageContentUrl,
  screenImage,
  screenImageFromPath,
  type ConditionInfo,
  type ScreeningResponse,
} from './api/client';
import { ResultsPanel } from './components/ResultsPanel';
import { es } from './i18n/es';

type Tab = 'folder' | 'upload';

export default function App() {
  const [conditions, setConditions] = useState<ConditionInfo[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>('folder');

  const [folder, setFolder] = useState('');
  const [resolvedFolder, setResolvedFolder] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [imageNames, setImageNames] = useState<string[]>([]);
  const [listTruncated, setListTruncated] = useState(false);
  const [selectedName, setSelectedName] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ScreeningResponse | null>(null);

  useEffect(() => {
    Promise.all([fetchConditions(), fetchSettings()])
      .then(([list, settings]) => {
        setConditions(list);
        setSelected(list.filter((c) => c.available).map((c) => c.id));
        setFolder(settings.default_image_dir);
      })
      .catch(() => setError(es.errorLoadConditions));
  }, []);

  useEffect(() => {
    if (!folder.trim() || tab !== 'folder') return;

    const timer = window.setTimeout(() => {
      setListLoading(true);
      fetchImageList(folder.trim(), filterQuery)
        .then((data) => {
          setResolvedFolder(data.folder);
          setImageNames(data.names);
          setListTruncated(data.truncated);
          setSelectedName((prev) =>
            prev && data.names.includes(prev) ? prev : data.names[0] ?? '',
          );
        })
        .catch(() => {
          setImageNames([]);
          setSelectedName('');
          setResolvedFolder('');
        })
        .finally(() => setListLoading(false));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [folder, filterQuery, tab]);

  const folderPreviewUrl = useMemo(() => {
    if (!resolvedFolder || !selectedName) return null;
    return imageContentUrl(resolvedFolder, selectedName);
  }, [resolvedFolder, selectedName]);

  const onFile = useCallback((f: File | null) => {
    setFile(f);
    setResponse(null);
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadPreview(f ? URL.createObjectURL(f) : null);
  }, [uploadPreview]);

  const availableIds = useMemo(
    () => conditions.filter((c) => c.available).map((c) => c.id),
    [conditions],
  );

  const toggleCondition = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const runUploadScreening = async () => {
    if (!file || selected.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      setResponse(await screenImage(file, selected));
    } catch {
      setError(es.errorScreening);
    } finally {
      setLoading(false);
    }
  };

  const runFolderScreening = async () => {
    if (!resolvedFolder || !selectedName || selected.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      setResponse(
        await screenImageFromPath(resolvedFolder, selectedName, selected),
      );
    } catch {
      setError(es.errorScreening);
    } finally {
      setLoading(false);
    }
  };

  const previewUrl = tab === 'folder' ? folderPreviewUrl : uploadPreview;
  const sourceLabel =
    response?.filename ??
    (tab === 'folder' && selectedName
      ? `${resolvedFolder}/${selectedName}`
      : file?.name);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <h1 className="text-2xl font-bold tracking-tight text-clinical-900">
            {es.appTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{es.appSubtitle}</p>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6 lg:flex-row">
        <aside className="w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:w-72">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {es.sidebarTitle}
          </h2>
          <p className="mt-4 text-sm font-medium text-slate-700">
            {es.conditionsLabel}
          </p>
          <ul className="mt-3 space-y-2">
            {conditions.map((c) => (
              <li key={c.id}>
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50 ${
                    !c.available ? 'opacity-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    disabled={!c.available}
                    onChange={() => toggleCondition(c.id)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm">
                    {c.label}
                    {!c.available && (
                      <span className="text-slate-400"> {es.unavailable}</span>
                    )}
                  </span>
                </label>
                {c.available && (
                  <p className="ml-7 text-xs text-slate-500">
                    {es.thresholdLabel}: {Math.round(c.threshold * 100)}%
                  </p>
                )}
              </li>
            ))}
          </ul>
          {availableIds.length === 0 && (
            <p className="mt-3 text-sm text-red-600">{es.noModels}</p>
          )}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex gap-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setTab('folder')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === 'folder'
                  ? 'border-clinical-600 text-clinical-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {es.tabFolder}
            </button>
            <button
              type="button"
              onClick={() => setTab('upload')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === 'upload'
                  ? 'border-clinical-600 text-clinical-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {es.tabUpload}
            </button>
          </div>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {tab === 'folder' ? (
                <>
                  <label className="block text-sm font-medium text-slate-700">
                    {es.folderLabel}
                  </label>
                  <input
                    type="text"
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <label className="mt-4 block text-sm font-medium text-slate-700">
                    {es.filterLabel}
                  </label>
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder={es.filterPlaceholder}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  {listLoading ? (
                    <p className="mt-4 text-sm text-slate-500">{es.running}</p>
                  ) : imageNames.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">
                      {es.noImagesInFolder}
                    </p>
                  ) : (
                    <>
                      {listTruncated && (
                        <p className="mt-3 text-xs text-slate-500">
                          {es.listTruncated.replace('{n}', '500')}
                        </p>
                      )}
                      <label className="mt-4 block text-sm font-medium text-slate-700">
                        {es.selectImage}
                      </label>
                      <select
                        value={selectedName}
                        onChange={(e) => {
                          setSelectedName(e.target.value);
                          setResponse(null);
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        size={8}
                      >
                        {imageNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <button
                    type="button"
                    disabled={
                      !selectedName ||
                      selected.length === 0 ||
                      loading ||
                      listLoading
                    }
                    onClick={runFolderScreening}
                    className="mt-4 w-full rounded-xl bg-clinical-600 py-3 text-sm font-semibold text-white shadow hover:bg-clinical-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? es.running : es.runScreening}
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">{es.uploadTitle}</h2>
                  <p className="mt-1 text-sm text-slate-500">{es.uploadHint}</p>
                  <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-10 transition hover:border-clinical-500 hover:bg-clinical-50">
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                    />
                    <span className="rounded-lg bg-clinical-600 px-4 py-2 text-sm font-medium text-white">
                      {es.uploadButton}
                    </span>
                    {file && (
                      <span className="mt-3 text-xs text-slate-600">
                        {file.name}
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    disabled={!file || selected.length === 0 || loading}
                    onClick={runUploadScreening}
                    className="mt-4 w-full rounded-xl bg-clinical-600 py-3 text-sm font-semibold text-white shadow hover:bg-clinical-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? es.running : es.runScreening}
                  </button>
                </>
              )}
              {error && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Radiografía"
                  className="max-h-[480px] w-full object-contain"
                />
              ) : (
                <p className="text-sm text-slate-500">{es.previewEmpty}</p>
              )}
            </div>
          </section>

          <ResultsPanel
            response={response}
            sourceLabel={sourceLabel}
          />

          <footer className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            {es.disclaimer}
          </footer>
        </main>
      </div>
    </div>
  );
}
