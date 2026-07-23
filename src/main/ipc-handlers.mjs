export function sanitizeSettings(settings) {
  return {
    captureEnabled: Boolean(settings?.captureEnabled),
    autostartEnabled: Boolean(settings?.autostartEnabled),
    giphyApiKey: String(settings?.giphyApiKey || "").trim().slice(0, 180),
    gifRating: ["g", "pg", "pg-13"].includes(settings?.gifRating) ? settings.gifRating : "pg"
  };
}

export function registerLclipIpc({
  ipcMain,
  store,
  activateText,
  activateGif,
  setAutostart,
  searchGiphy,
  cancelGiphySearch,
  hideWindow,
  createTrayMenu,
  broadcast,
  publicState
}) {
  ipcMain.handle("lclip:bootstrap", () => publicState());
  ipcMain.handle("lclip:activate", (_event, value) => activateText(value));
  ipcMain.handle("lclip:activate-gif", (_event, gif) => activateGif(gif));
  ipcMain.handle("lclip:remove-history", async (_event, id) => {
    const state = await store.updateAndPersist(draft => { draft.history = draft.history.filter(item => item.id !== id); });
    broadcast();
    return state.history;
  });
  ipcMain.handle("lclip:clear-history", async () => {
    await store.updateAndPersist(state => { state.history = []; });
    broadcast();
    return true;
  });
  ipcMain.handle("lclip:set-capture", async (_event, enabled) => {
    await store.updateAndPersist(state => { state.settings.captureEnabled = Boolean(enabled); });
    createTrayMenu();
    broadcast();
    return publicState();
  });
  ipcMain.handle("lclip:save-settings", async (_event, settings) => {
    const allowed = sanitizeSettings(settings);
    const previousState = store.snapshot();
    const previous = previousState.settings;
    const autostartChanged = allowed.autostartEnabled !== previous.autostartEnabled;
    if (autostartChanged) await setAutostart(allowed.autostartEnabled);
    try {
      await store.updateAndPersist(state => { state.settings = { ...state.settings, ...allowed }; });
    } catch (error) {
      store.restore?.(previousState);
      createTrayMenu();
      broadcast();
      if (autostartChanged) {
        try {
          await setAutostart(previous.autostartEnabled);
        } catch (rollbackError) {
          throw new AggregateError([error, rollbackError], "Could not save settings or restore the previous autostart state");
        }
      }
      throw error;
    }
    createTrayMenu();
    broadcast();
    return publicState();
  });
  ipcMain.handle("lclip:search-gifs", (_event, query) => searchGiphy(query));
  ipcMain.on("lclip:cancel-gif-search", cancelGiphySearch);
  ipcMain.on("lclip:hide", hideWindow);
}
