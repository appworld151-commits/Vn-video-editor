import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, CircleHelp } from 'lucide-react';
import IconButton from '@/components/IconButton';
import ClipSheet, { type ClipSheetKind } from '@/editor/ClipSheet';
import EditorToolbar, { type ToolId } from '@/editor/EditorToolbar';
import ExportSheet from '@/editor/ExportSheet';
import { mergeAssets, upsertById } from '@/editor/editing';
import { AspectSheet, MusicSheet, RemoveItemSheet, StickerSheet, TextSheet } from '@/editor/OverlaySheets';
import PreviewPanel from '@/editor/PreviewPanel';
import QuickAddToolbar from '@/editor/QuickAddToolbar';
import TextBottomToolbar, { type TextToolId } from '@/editor/TextBottomToolbar';
import TextFloatingToolbar from '@/editor/TextFloatingToolbar';
import TextToolSheet, { type TextToolKind } from '@/editor/TextToolSheet';
import { ProjectSettingsSheet } from '@/editor/ProjectSheets';
import SubtitleListSheet from '@/editor/SubtitleListSheet';
import TimelinePanel from '@/editor/TimelinePanel';
import { useHistory } from '@/hooks/useHistory';
import { errorMessage } from '@/lib/format';
import { getMediaUrl } from '@/lib/mediaLibrary';
import { Player } from '@/lib/player';
import { saveProject } from '@/lib/projectsApi';
import {
  DEFAULT_OVERLAY_LENGTH,
  clipAt,
  clipById,
  createClipFromAsset,
  createId,
  duplicateClip,
  freezeFrameAt,
  moveClip,
  replaceClip,
  resolvedAspect,
  splitMusicAt,
  splitTimelineAt,
  totalDuration,
} from '@/lib/timeline';
import type {
  AspectRatio,
  MediaAsset,
  MusicItem,
  PickerRequest,
  Project,
  Rotation,
  StickerItem,
  TextItem,
  Timeline,
} from '@/types';

interface EditorPageProps {
  initial: Project;
  onExit: () => void;
  onRequestMedia: (request: PickerRequest) => void;
  onOpenHelp: () => void;
}

type SheetState =
  | { type: 'clip'; kind: ClipSheetKind; clipId: string }
  | { type: 'text'; draft: TextItem; isNew: boolean }
  | { type: 'sticker' }
  | { type: 'stickerItem'; id: string }
  | { type: 'music'; id: string }
  | { type: 'aspect' }
  | { type: 'export' }
  | { type: 'settings' }
  | { type: 'subtitleList' }
  | { type: 'textTool'; kind: TextToolKind; itemId: string }
  | null;

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error';

const SAVE_LABELS: Record<SaveState, string> = {
  saved: 'Saved to cloud',
  saving: 'Saving...',
  unsaved: 'Unsaved changes',
  error: 'Not saved',
};

export default function EditorPage({ initial, onExit, onRequestMedia, onOpenHelp }: EditorPageProps) {
  const [name, setName] = useState(initial.name);
  const [folder, setFolder] = useState(initial.folder);
  const [assets, setAssets] = useState<MediaAsset[]>(initial.assets);
  const history = useHistory<Timeline>(initial.timeline);
  const timeline = history.present;

  const [player, setPlayer] = useState<Player | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [notice, setNotice] = useState<{ text: string; tone: 'info' | 'error' } | null>(null);

  const timeRef = useRef(0);
  const urlsRef = useRef(new Map<string, string>());
  const thumbnailRef = useRef<string | null>(initial.thumbnail);
  const firstRunRef = useRef(true);
  const persistRef = useRef<() => Promise<boolean>>(async () => false);

  const notify = useCallback((text: string, tone: 'info' | 'error' = 'info') => setNotice({ text, tone }), []);

  useEffect(() => {
    const engine = new Player();
    setPlayer(engine);
    return () => engine.dispose();
  }, []);

  useEffect(() => {
    if (!player) return;
    return player.subscribe((next, isPlaying) => {
      timeRef.current = next;
      setTime(next);
      setPlaying(isPlaying);
    });
  }, [player]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!player) return;
    player.setTimeline(timeline);
    player.setLayout(resolvedAspect(timeline, assets));
  }, [player, timeline, assets]);

  useEffect(() => {
    if (!player) return;
    let cancelled = false;
    void (async () => {
      for (const asset of assets) {
        if (urlsRef.current.has(asset.id)) continue;
        const url = await getMediaUrl(asset.id);
        if (url) urlsRef.current.set(asset.id, url);
        else notify(`"${asset.name}" is not on this device`, 'error');
        if (cancelled) return;
      }
      const loaded = assets.flatMap((asset) => {
        const url = urlsRef.current.get(asset.id);
        return url ? [{ asset, url }] : [];
      });
      player.setMedia(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [player, assets, notify]);

  const persist = async (): Promise<boolean> => {
    setSaveState('saving');
    try {
      const snapshot = player?.snapshot();
      if (snapshot) thumbnailRef.current = snapshot;
      await saveProject({
        id: initial.id,
        name,
        folder,
        thumbnail: thumbnailRef.current,
        duration: totalDuration(timeline),
        updatedAt: new Date().toISOString(),
        timeline,
        assets,
      });
      setSaveState('saved');
      return true;
    } catch (err) {
      setSaveState('error');
      notify(errorMessage(err), 'error');
      return false;
    }
  };

  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    setSaveState('unsaved');
    const timer = window.setTimeout(() => void persistRef.current(), 1500);
    return () => window.clearTimeout(timer);
  }, [name, folder, timeline, assets]);

  persistRef.current = persist;

  const exitEditor = async () => {
    if (await persist()) onExit();
  };

  const selectedClip = selectedClipId ? (clipById(timeline, selectedClipId)?.clip ?? null) : null;
  const playheadClip = clipAt(timeline, time)?.clip ?? null;
  const assetFor = (id: string) => assets.find((asset) => asset.id === id);

  const patchClip = (id: string, patch: Partial<Timeline['clips'][number]>) =>
    history.update((tl) => ({ ...tl, clips: replaceClip(tl.clips, id, patch) }));

  const removeClip = (id: string) => {
    history.update((tl) => ({ ...tl, clips: tl.clips.filter((clip) => clip.id !== id) }));
    setSelectedClipId(null);
    setSheet(null);
  };

  const duplicateClipAt = (id: string) => {
    history.update((tl) => {
      const idx = tl.clips.findIndex((clip) => clip.id === id);
      if (idx < 0) return tl;
      const copy = duplicateClip(tl.clips[idx]);
      const clips = [...tl.clips];
      clips.splice(idx + 1, 0, copy);
      return { ...tl, clips };
    });
    setSheet(null);
    notify('Clip duplicated');
  };

  const moveClipBy = (id: string, delta: number) => {
    history.update((tl) => {
      const from = tl.clips.findIndex((clip) => clip.id === id);
      if (from < 0) return tl;
      return { ...tl, clips: moveClip(tl.clips, from, from + delta) };
    });
  };

  const saveText = (item: TextItem) => history.update((tl) => ({ ...tl, texts: upsertById(tl.texts, item) }));
  const removeText = (id: string) => {
    history.update((tl) => ({ ...tl, texts: tl.texts.filter((item) => item.id !== id) }));
    setSelectedTextId(null);
    setSheet(null);
  };
  const patchText = (id: string, patch: Partial<TextItem>) =>
    history.update((tl) => ({
      ...tl,
      texts: tl.texts.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  const patchAllTexts = (patch: Partial<TextItem>) =>
    history.update((tl) => ({
      ...tl,
      texts: tl.texts.map((item) => ({ ...item, ...patch })),
    }));
  const duplicateText = (id: string) => {
    history.update((tl) => {
      const item = tl.texts.find((entry) => entry.id === id);
      if (!item) return tl;
      const copy: TextItem = {
        ...item,
        id: createId(),
        start: item.start + item.length,
        locked: false,
      };
      return { ...tl, texts: [...tl.texts, copy] };
    });
    notify('Subtitle duplicated');
  };
  const splitText = (id: string) => {
    const item = timeline.texts.find((entry) => entry.id === id);
    if (!item) return;
    const local = timeRef.current - item.start;
    if (local < 0.3 || item.length - local < 0.3) {
      notify('Move the playhead inside the subtitle to split it', 'error');
      return;
    }
    history.update((tl) => ({
      ...tl,
      texts: tl.texts.flatMap((entry) =>
        entry.id === id
          ? [
              { ...entry, length: local },
              { ...entry, id: createId(), start: entry.start + local, length: entry.length - local, locked: false },
            ]
          : [entry],
      ),
    }));
    setSelectedTextId(null);
  };
  const addSticker = (item: StickerItem) => history.update((tl) => ({ ...tl, stickers: [...tl.stickers, item] }));
  const removeSticker = (id: string) =>
    history.update((tl) => ({ ...tl, stickers: tl.stickers.filter((item) => item.id !== id) }));
  const patchMusic = (id: string, patch: Partial<MusicItem>) =>
    history.update((tl) => ({
      ...tl,
      music: tl.music.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  const removeMusic = (id: string) => history.update((tl) => ({ ...tl, music: tl.music.filter((item) => item.id !== id) }));
  const setAspect = (aspect: AspectRatio) => history.update((tl) => ({ ...tl, aspect }));

  const addMedia = () =>
    onRequestMedia({
      multi: true,
      kinds: ['video', 'image'],
      onConfirm: (picked) => {
        if (picked.length === 0) return;
        setAssets((prev) => mergeAssets(prev, picked));
        history.update((tl) => ({ ...tl, clips: [...tl.clips, ...picked.map(createClipFromAsset)] }));
      },
    });

  const addMusic = () =>
    onRequestMedia({
      multi: false,
      kinds: ['audio'],
      onConfirm: (picked) => {
        const asset = picked[0];
        if (!asset) return;
        if (!(asset.duration > 0)) {
          notify('This audio file has no length', 'error');
          return;
        }
        const start = timeRef.current;
        setAssets((prev) => mergeAssets(prev, picked));
        history.update((tl) => ({
          ...tl,
          music: [...tl.music, { id: createId(), assetId: asset.id, start, length: asset.duration, offset: 0, volume: 1, fadeIn: 0, fadeOut: 0 }],
        }));
      },
    });

  const addStickerImage = () =>
    onRequestMedia({
      multi: false,
      kinds: ['image'],
      onConfirm: (picked) => {
        const asset = picked[0];
        if (!asset) return;
        setAssets((prev) => mergeAssets(prev, picked));
        addSticker({
          id: createId(),
          emoji: null,
          assetId: asset.id,
          start: timeRef.current,
          length: DEFAULT_OVERLAY_LENGTH,
          x: 0.5,
          y: 0.5,
          scale: 1,
        });
      },
    });

  const openNewText = () =>
    setSheet({
      type: 'text',
      isNew: true,
      draft: {
        id: createId(),
        text: '',
        start: timeRef.current,
        length: DEFAULT_OVERLAY_LENGTH,
        x: 0.5,
        y: 0.8,
        size: 0.05,
        color: '#ffffff',
        background: true,
        outline: false,
        align: 'center',
        font: 'Roboto',
        letterSpacing: 0,
        lineHeight: 1.2,
        opacity: 1,
        animationIn: 'none',
        animationOut: 'none',
        blendMode: 'normal',
        locked: false,
        stylePreset: 'plain',
      },
    });

  const freezeAtPlayhead = () => {
    const next = freezeFrameAt(timeline, timeRef.current);
    if (!next) {
      notify('Move the playhead onto a video clip to freeze a frame', 'error');
      return;
    }
    history.update(() => next);
    setSelectedClipId(null);
    setSheet(null);
    notify('Freeze frame added');
  };

  const saveFrame = async () => {
    if (!player) return;
    try {
      const blob = await player.captureFrame('1080p');
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `${name.replace(/[^\w-]+/g, '_') || 'frame'}_${timeRef.current.toFixed(2)}s.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      notify('Frame saved');
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const splitAtPlayhead = () => {
    const next = splitTimelineAt(timeline, timeRef.current);
    if (!next) {
      notify('Move the playhead inside a clip, away from its edges, to split it', 'error');
      return;
    }
    history.update(() => next);
    setSelectedClipId(null);
  };

  const rotateSelected = (clip: Timeline['clips'][number]) =>
    patchClip(clip.id, { rotation: (((clip.rotation + 90) % 360) as Rotation) });

  const handleTool = (tool: ToolId) => {
    switch (tool) {
      case 'filter':
      case 'trim':
      case 'fx':
        if (!playheadClip) {
          notify('Move the playhead onto a clip first', 'error');
          return;
        }
        setSheet({ type: 'clip', kind: tool, clipId: playheadClip.id });
        return;
      case 'split':
        splitAtPlayhead();
        return;
      case 'music':
        addMusic();
        return;
      case 'text':
        openNewText();
        return;
      case 'subtitles':
        setSheet({ type: 'subtitleList' });
        return;
      case 'reverse':
        if (selectedClip && selectedClip.kind === 'video') patchClip(selectedClip.id, { reverse: !selectedClip.reverse });
        else notify('Select a video clip to reverse it', 'error');
        return;
      case 'freeze':
        freezeAtPlayhead();
        return;
      case 'saveframe':
        void saveFrame();
        return;
      case 'sticker':
        setSheet({ type: 'sticker' });
        return;
      case 'aspect':
        setSheet({ type: 'aspect' });
        return;
      case 'quality':
        setSheet({ type: 'export' });
        return;
      case 'speed':
      case 'volume':
      case 'fade':
      case 'crop':
      case 'transform':
      case 'adjust':
        if (selectedClip) setSheet({ type: 'clip', kind: tool, clipId: selectedClip.id });
        return;
      case 'duplicate':
        if (selectedClip) duplicateClipAt(selectedClip.id);
        return;
      case 'rotate':
        if (selectedClip) rotateSelected(selectedClip);
        return;
      case 'mirror':
        if (selectedClip) patchClip(selectedClip.id, { mirror: !selectedClip.mirror });
        return;
    }
  };

  const close = () => setSheet(null);

  const renderSheet = () => {
    if (!sheet) return null;
    switch (sheet.type) {
      case 'clip': {
        const hit = clipById(timeline, sheet.clipId);
        if (!hit) return null;
        const clipId = hit.clip.id;
        return (
          <ClipSheet
            kind={sheet.kind}
            clip={hit.clip}
            index={hit.index}
            total={timeline.clips.length}
            asset={assetFor(hit.clip.assetId)}
            onPatch={(patch) => patchClip(clipId, patch)}
            onFreeze={freezeAtPlayhead}
            onDuplicate={() => duplicateClipAt(clipId)}
            onRemove={() => removeClip(clipId)}
            onMove={(delta) => moveClipBy(clipId, delta)}
            onClose={close}
          />
        );
      }
      case 'text':
        return (
          <TextSheet
            draft={sheet.draft}
            isNew={sheet.isNew}
            onSave={(item) => {
              saveText(item);
              close();
            }}
            onDelete={(id) => {
              removeText(id);
              close();
            }}
            onClose={close}
          />
        );
      case 'sticker':
        return (
          <StickerSheet
            onEmoji={(emoji) => {
              addSticker({
                id: createId(),
                emoji,
                assetId: null,
                start: timeRef.current,
                length: DEFAULT_OVERLAY_LENGTH,
                x: 0.5,
                y: 0.5,
                scale: 1,
              });
              close();
            }}
            onImage={() => {
              close();
              addStickerImage();
            }}
            onClose={close}
          />
        );
      case 'stickerItem': {
        const id = sheet.id;
        if (!timeline.stickers.some((item) => item.id === id)) return null;
        return (
          <RemoveItemSheet
            title="Sticker"
            onRemove={() => {
              removeSticker(id);
              close();
            }}
            onClose={close}
          />
        );
      }
      case 'music': {
        const item = timeline.music.find((entry) => entry.id === sheet.id);
        if (!item) return null;
        const asset = assetFor(item.assetId);
        return (
          <MusicSheet
            item={item}
            name={asset?.name ?? 'Audio'}
            asset={asset}
            onPatch={(patch) => patchMusic(item.id, patch)}
            onSplit={() => {
              const local = timeRef.current - item.start;
              const parts = splitMusicAt(item, local);
              if (!parts) {
                notify('Move the playhead inside the audio clip to split it', 'error');
                return;
              }
              history.update((tl) => ({
                ...tl,
                music: tl.music.flatMap((entry) => (entry.id === item.id ? parts : [entry])),
              }));
              close();
            }}
            onRemove={() => {
              removeMusic(item.id);
              close();
            }}
            onClose={close}
          />
        );
      }
      case 'aspect':
        return (
          <AspectSheet
            value={timeline.aspect}
            onPick={(value) => {
              setAspect(value);
              close();
            }}
            onClose={close}
          />
        );
      case 'export':
        return <ExportSheet player={player} projectName={name} duration={totalDuration(timeline)} onNotify={notify} onClose={close} />;
      case 'subtitleList':
        return (
          <SubtitleListSheet
            texts={timeline.texts}
            time={time}
            playing={playing}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            onUndo={history.undo}
            onRedo={history.redo}
            onPlay={(item) => {
              player?.seek(item.start);
              player?.play();
            }}
            onPause={() => player?.pause()}
            onChangeText={(id, text) => patchText(id, { text })}
            onDelete={(id) => {
              history.update((tl) => ({ ...tl, texts: tl.texts.filter((entry) => entry.id !== id) }));
              setSelectedTextId(null);
            }}
            onSelect={(id) => setSelectedTextId(id)}
            onDone={() => {
              player?.pause();
              close();
            }}
          />
        );
      case 'settings':
        return (
          <ProjectSettingsSheet
            name={name}
            folder={folder}
            onSave={(nextName, nextFolder) => {
              setName(nextName);
              setFolder(nextFolder);
              close();
            }}
            onClose={close}
          />
        );
      case 'textTool': {
        const item = timeline.texts.find((entry) => entry.id === sheet.itemId);
        if (!item) return null;
        return (
          <TextToolSheet
            kind={sheet.kind}
            item={item}
            allTexts={timeline.texts}
            onPatch={(patch) => patchText(item.id, patch)}
            onPatchAll={patchAllTexts}
            onSplit={() => splitText(item.id)}
            onDelete={() => removeText(item.id)}
            onClose={close}
          />
        );
      }
    }
  };

  const hasClips = timeline.clips.length > 0;
  const selectedText = selectedTextId ? timeline.texts.find((item) => item.id === selectedTextId) ?? null : null;
  const textMode = selectedText !== null;

  return (
    <div className="relative flex h-dvh flex-col bg-[#0b0c0e] text-white">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-[#101113] px-2">
        <IconButton label="Back to projects" onClick={() => void exitEditor()} className="text-white">
          <ChevronLeft size={24} />
        </IconButton>
        <button
          type="button"
          onClick={() => setSheet({ type: 'settings' })}
          className="min-w-0 flex-1 rounded-lg px-2 py-1 text-left transition hover:bg-white/5"
        >
          <span className="block truncate text-base font-semibold">{name}</span>
          <span className="block text-xs text-neutral-400">{SAVE_LABELS[saveState]}</span>
        </button>
        <button
          type="button"
          onClick={() => setSheet({ type: 'export' })}
          disabled={!hasClips}
          className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 active:scale-95 disabled:opacity-40"
        >
          Export
        </button>
        <IconButton label="About" onClick={onOpenHelp} className="text-white">
          <CircleHelp size={22} />
        </IconButton>
      </header>

      <PreviewPanel
        player={player}
        time={time}
        duration={totalDuration(timeline)}
        playing={playing}
        muted={muted}
        aspectLabel={timeline.aspect === 'original' ? 'Original' : timeline.aspect}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onTogglePlay={() => player?.togglePlay()}
        onToggleMute={() => {
          const next = !muted;
          setMuted(next);
          player?.setMuted(next);
        }}
        onAspect={() => setSheet({ type: 'aspect' })}
        onUndo={history.undo}
        onRedo={history.redo}
      />

      <div className="relative flex min-h-0 shrink-0">
        {textMode && selectedText && (
          <div className="pointer-events-none absolute -top-12 left-1/2 z-30 -translate-x-1/2">
            <TextFloatingToolbar
              locked={selectedText.locked}
              onEdit={() => setSheet({ type: 'textTool', kind: 'edit', itemId: selectedText.id })}
              onKeyframe={() => notify('Keyframes for text will be added in a future update')}
              onSplit={() => splitText(selectedText.id)}
              onToggleLock={() => patchText(selectedText.id, { locked: !selectedText.locked })}
              onDuplicate={() => duplicateText(selectedText.id)}
              onDelete={() => removeText(selectedText.id)}
            />
          </div>
        )}
        <QuickAddToolbar
          onAddVideo={addMedia}
          onAddMusic={addMusic}
          onAddText={openNewText}
          onAddSticker={() => setSheet({ type: 'sticker' })}
        />
        <TimelinePanel
          timeline={timeline}
          assets={assets}
          time={time}
          playing={playing}
          selectedClipId={selectedClipId}
          selectedTextId={selectedTextId}
          onSeek={(next) => player?.seek(next)}
          onSelectClip={(id) => {
            setSelectedTextId(null);
            setSelectedClipId(id);
          }}
          onTapText={(item) => {
            setSelectedClipId(null);
            setSelectedTextId(item.id);
            player?.seek(item.start);
          }}
          onTapSticker={(item) => setSheet({ type: 'stickerItem', id: item.id })}
          onTapMusic={(item) => setSheet({ type: 'music', id: item.id })}
          onAddMedia={addMedia}
        />
      </div>

      {textMode ? (
        <TextBottomToolbar
          onTool={(tool) => {
            if (!selectedText) return;
            if (tool === 'delete') {
              removeText(selectedText.id);
              return;
            }
            if (tool === 'split') {
              splitText(selectedText.id);
              return;
            }
            if (tool === 'list') {
              setSheet({ type: 'subtitleList' });
              return;
            }
            const kindMap: Record<Exclude<TextToolId, 'delete' | 'split' | 'list'>, TextToolKind> = {
              batch: 'batch',
              style: 'style',
              font: 'font',
              size: 'size',
              color: 'color',
              format: 'format',
              spacing: 'spacing',
              animation: 'animation',
              opacity: 'opacity',
              blending: 'blending',
              position: 'position',
              mask: 'mask',
            };
            setSheet({ type: 'textTool', kind: kindMap[tool as Exclude<TextToolId, 'delete' | 'split' | 'list'>], itemId: selectedText.id });
          }}
        />
      ) : (
        <EditorToolbar
          hasClip={hasClips}
          clipSelected={selectedClip !== null}
          onTool={handleTool}
          onBack={() => setSelectedClipId(null)}
        />
      )}

      {notice && (
        <div
          role="status"
          className={`pointer-events-none absolute left-1/2 top-16 z-50 max-w-[88%] -translate-x-1/2 rounded-full px-4 py-2 text-center text-sm font-medium shadow-lg animate-fade-in ${
            notice.tone === 'error' ? 'bg-red-600 text-white' : 'bg-white text-neutral-900'
          }`}
        >
          {notice.text}
        </div>
      )}

      {renderSheet()}
    </div>
  );
}
