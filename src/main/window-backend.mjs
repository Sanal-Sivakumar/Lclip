export function selectWindowBackend({ platform, env = {} }) {
  const waylandSession = platform === "linux" && (env.XDG_SESSION_TYPE === "wayland" || Boolean(env.WAYLAND_DISPLAY));
  const xwaylandAvailable = Boolean(env.DISPLAY);
  const nativeWaylandRequested = env.LCLIP_NATIVE_WAYLAND === "1";
  const useXwayland = waylandSession && xwaylandAvailable && !nativeWaylandRequested;
  return {
    useXwayland,
    label: useXwayland ? "Xwayland compatibility" : "Native desktop"
  };
}
