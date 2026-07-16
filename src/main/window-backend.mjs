export function selectWindowBackend({ platform, env = {}, ozonePlatformAlreadySet = false }) {
  const waylandSession = platform === "linux" && (env.XDG_SESSION_TYPE === "wayland" || Boolean(env.WAYLAND_DISPLAY));
  const xwaylandAvailable = Boolean(env.DISPLAY);
  const nativeWaylandRequested = env.LCLIP_NATIVE_WAYLAND === "1" || ozonePlatformAlreadySet;
  const useXwayland = waylandSession && xwaylandAvailable && !nativeWaylandRequested;
  return {
    useXwayland,
    label: useXwayland ? "Xwayland compatibility" : "Native desktop"
  };
}
