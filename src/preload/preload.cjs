const { contextBridge, ipcRenderer } = require("electron");

const listen = (channel, callback) => {
  const handler = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld("lclip", {
  bootstrap: () => ipcRenderer.invoke("lclip:bootstrap"),
  activate: value => ipcRenderer.invoke("lclip:activate", value),
  removeHistory: id => ipcRenderer.invoke("lclip:remove-history", id),
  clearHistory: () => ipcRenderer.invoke("lclip:clear-history"),
  setCapture: enabled => ipcRenderer.invoke("lclip:set-capture", enabled),
  saveSettings: settings => ipcRenderer.invoke("lclip:save-settings", settings),
  searchGifs: query => ipcRenderer.invoke("lclip:search-gifs", query),
  activateGif: gif => ipcRenderer.invoke("lclip:activate-gif", gif),
  beginWindowDrag: () => ipcRenderer.send("lclip:drag-start"),
  endWindowDrag: () => ipcRenderer.send("lclip:drag-stop"),
  hide: () => ipcRenderer.send("lclip:hide"),
  onState: callback => listen("lclip:state", callback),
  onOpen: callback => listen("lclip:open", callback),
  platform: process.platform
});
