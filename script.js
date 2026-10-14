const audio = document.querySelector("#audioPlayer");
const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector("#dropZone");
const trackList = document.querySelector("#trackList");
const queueEmpty = document.querySelector("#queueEmpty");
const playButton = document.querySelector("#playButton");
const seekBar = document.querySelector("#seekBar");
const trackTitle = document.querySelector("#trackTitle");
const trackMeta = document.querySelector("#trackMeta");
const currentTimeLabel = document.querySelector("#currentTime");
const durationLabel = document.querySelector("#duration");
const trackCount = document.querySelector("#trackCount");
const clearButton = document.querySelector("#clearButton");
const coverArt = document.querySelector("#coverArt");
const coverImage = document.querySelector("#coverImage");
const coverInput = document.querySelector("#coverInput");
const coverUploadButton = document.querySelector("#coverUploadButton");

let tracks = [];
let currentIndex = -1;
let activeUrl = null;
const thumbnails = new Map();

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function updateQueue() {
  trackList.replaceChildren();
  queueEmpty.hidden = tracks.length > 0;
  clearButton.hidden = tracks.length === 0;
  trackCount.textContent = `${tracks.length} ${tracks.length === 1 ? "TRACK" : "TRACKS"}`;

  tracks.forEach((track, index) => {
    const item = document.createElement("li");
    item.className = `track-item${index === currentIndex ? " is-current" : ""}`;
    item.setAttribute("aria-current", index === currentIndex ? "true" : "false");

    const thumbnail = document.createElement("span");
    thumbnail.className = "track-thumb";
    const thumbnailUrl = thumbnails.get(track);
    if (thumbnailUrl) {
      const image = document.createElement("img");
      image.src = thumbnailUrl;
      image.alt = "";
      thumbnail.append(image);
    } else {
      thumbnail.textContent = "♫";
      thumbnail.setAttribute("aria-hidden", "true");
    }

    const select = document.createElement("button");
    select.type = "button";
    select.className = "track-select";
    select.setAttribute("aria-label", `再生: ${track.name}`);
    select.setAttribute("aria-pressed", String(index === currentIndex));

    const size = document.createElement("span");
    size.className = "track-size";
    size.textContent = formatSize(track.size);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "track-remove";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `${track.name} を削除`);
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      removeTrack(index);
    });

    const name = document.createElement("span");
    name.className = "track-name";
    name.textContent = track.name.replace(/\.[^.]+$/, "");
    name.title = track.name;

    select.append(thumbnail, name);
    select.addEventListener("click", () => loadTrack(index, true));
    item.append(select, size, remove);
    trackList.append(item);
  });
}

function loadTrack(index, autoplay = false) {
  if (index < 0 || index >= tracks.length) return;
  if (activeUrl) URL.revokeObjectURL(activeUrl);
  currentIndex = index;
  activeUrl = URL.createObjectURL(tracks[index]);
  audio.src = activeUrl;
  showThumbnail();
  trackTitle.textContent = tracks[index].name.replace(/\.[^.]+$/, "");
  trackMeta.textContent = "ローカルオーディオブック";
  playButton.disabled = false;
  seekBar.disabled = false;
  currentTimeLabel.textContent = "0:00";
  durationLabel.textContent = "0:00";
  updateQueue();
  if (autoplay) playAudio();
}

function showThumbnail() {
  const track = tracks[currentIndex];
  const thumbnailUrl = track && thumbnails.get(track);
  coverArt.classList.toggle("has-image", Boolean(thumbnailUrl));
  coverImage.hidden = !thumbnailUrl;
  coverImage.alt = thumbnailUrl ? `${track.name} のサムネイル` : "";
  if (thumbnailUrl) coverImage.src = thumbnailUrl;
  else coverImage.removeAttribute("src");
  coverUploadButton.disabled = !track;
}

async function playAudio() {
  if (!audio.src) return;
  try {
    await audio.play();
  } catch (error) {
    trackMeta.textContent = "この音声ファイルを再生できませんでした。別のファイルをお試しください。";
    console.error("Audio playback failed:", error);
  }
}

function addFiles(fileList) {
  const audioFiles = Array.from(fileList).filter((file) =>
    file.type.startsWith("audio/") || /\.(mp3|m4a|m4b|aac|wav|ogg|flac|opus)$/i.test(file.name)
  );
  if (audioFiles.length === 0) {
    trackMeta.textContent = "音声ファイルを選択してください。";
    return;
  }

  const wasEmpty = tracks.length === 0;
  tracks.push(...audioFiles);
  updateQueue();
  if (wasEmpty) loadTrack(0);
  if (audioFiles.length < fileList.length) {
    trackMeta.textContent = "一部のファイルは音声形式ではないため追加されませんでした。";
  }
}

function removeTrack(index) {
  const wasCurrent = index === currentIndex;
  const [removedTrack] = tracks.splice(index, 1);
  const thumbnailUrl = thumbnails.get(removedTrack);
  if (thumbnailUrl) {
    URL.revokeObjectURL(thumbnailUrl);
    thumbnails.delete(removedTrack);
  }

  if (tracks.length === 0) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    if (activeUrl) URL.revokeObjectURL(activeUrl);
    activeUrl = null;
    currentIndex = -1;
    showThumbnail();
    trackTitle.textContent = "まだ本が選ばれていません";
    trackMeta.textContent = "音声ファイルを追加して、再生をはじめましょう。";
    playButton.disabled = true;
    seekBar.disabled = true;
    currentTimeLabel.textContent = "0:00";
    durationLabel.textContent = "0:00";
  } else if (wasCurrent) {
    loadTrack(Math.min(index, tracks.length - 1));
  } else if (index < currentIndex) {
    currentIndex -= 1;
    showThumbnail();
  }
  updateQueue();
}

playButton.addEventListener("click", () => {
  if (audio.paused) playAudio();
  else audio.pause();
});

document.querySelector("#previousButton").addEventListener("click", () => {
  if (currentIndex > 0) loadTrack(currentIndex - 1, true);
  else if (audio.currentTime > 3) audio.currentTime = 0;
});

document.querySelector("#nextButton").addEventListener("click", () => {
  if (currentIndex < tracks.length - 1) loadTrack(currentIndex + 1, true);
});

document.querySelector("#backButton").addEventListener("click", () => {
  audio.currentTime = Math.max(0, audio.currentTime - 15);
});

document.querySelector("#forwardButton").addEventListener("click", () => {
  if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(audio.duration, audio.currentTime + 15);
});

seekBar.addEventListener("input", () => {
  if (Number.isFinite(audio.duration)) audio.currentTime = (Number(seekBar.value) / 1000) * audio.duration;
});

document.querySelector("#volumeBar").addEventListener("input", (event) => {
  audio.volume = Number(event.target.value);
});

document.querySelector("#speedSelect").addEventListener("change", (event) => {
  audio.playbackRate = Number(event.target.value);
});

fileInput.addEventListener("change", (event) => {
  addFiles(event.target.files);
  fileInput.value = "";
});

coverUploadButton.addEventListener("click", () => {
  if (currentIndex >= 0) coverInput.click();
});

coverInput.addEventListener("change", () => {
  const image = coverInput.files[0];
  coverInput.value = "";
  if (!image) return;
  if (!image.type.startsWith("image/")) {
    trackMeta.textContent = "サムネイルには画像ファイルを選択してください。";
    return;
  }

  const track = tracks[currentIndex];
  if (!track) return;
  const previousUrl = thumbnails.get(track);
  if (previousUrl) URL.revokeObjectURL(previousUrl);
  thumbnails.set(track, URL.createObjectURL(image));
  showThumbnail();
  updateQueue();
});

clearButton.addEventListener("click", () => {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  if (activeUrl) URL.revokeObjectURL(activeUrl);
  activeUrl = null;
  for (const thumbnailUrl of thumbnails.values()) URL.revokeObjectURL(thumbnailUrl);
  thumbnails.clear();
  tracks = [];
  currentIndex = -1;
  trackTitle.textContent = "まだ本が選ばれていません";
  trackMeta.textContent = "音声ファイルを追加して、再生をはじめましょう。";
  playButton.disabled = true;
  seekBar.disabled = true;
  currentTimeLabel.textContent = "0:00";
  durationLabel.textContent = "0:00";
  showThumbnail();
  updateQueue();
});

audio.addEventListener("timeupdate", () => {
  currentTimeLabel.textContent = formatTime(audio.currentTime);
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    seekBar.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
  }
});

audio.addEventListener("loadedmetadata", () => {
  durationLabel.textContent = formatTime(audio.duration);
});

audio.addEventListener("play", () => {
  playButton.classList.add("is-playing");
  playButton.setAttribute("aria-label", "一時停止");
  updateQueue();
});

audio.addEventListener("pause", () => {
  playButton.classList.remove("is-playing");
  playButton.setAttribute("aria-label", "再生");
  updateQueue();
});

audio.addEventListener("ended", () => {
  if (currentIndex < tracks.length - 1) loadTrack(currentIndex + 1, true);
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragging");
});

dropZone.addEventListener("dragleave", (event) => {
  if (!dropZone.contains(event.relatedTarget)) dropZone.classList.remove("is-dragging");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragging");
  addFiles(event.dataTransfer.files);
});

audio.volume = 0.8;
updateQueue();
