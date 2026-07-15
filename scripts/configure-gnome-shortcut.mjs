#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const desktop = String(process.env.XDG_CURRENT_DESKTOP || "").toUpperCase();
if (!desktop.includes("GNOME")) process.exit(0);

const action = process.argv[2] === "--remove" ? "remove" : "install";
const rootSchema = "org.gnome.settings-daemon.plugins.media-keys";
const bindingSchema = "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding";
const bindingPath = "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/lclip/";

function gsettings(...args) {
  return execFileSync("gsettings", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

const current = gsettings("get", rootSchema, "custom-keybindings");
const bindings = [...current.matchAll(/'([^']+)'/g)].map(match => match[1]);
const next = action === "remove"
  ? bindings.filter(path => path !== bindingPath)
  : [...new Set([...bindings, bindingPath])];
const serialized = `[${next.map(path => `'${path}'`).join(", ")}]`;

if (action === "install") {
  const target = `${bindingSchema}:${bindingPath}`;
  gsettings("set", target, "name", "LClip");
  gsettings("set", target, "command", "/usr/local/bin/lclip --show");
  gsettings("set", target, "binding", "<Super>period");
}
gsettings("set", rootSchema, "custom-keybindings", serialized);

console.log(action === "install"
  ? "Configured GNOME shortcut: Super + ."
  : "Removed the GNOME LClip shortcut.");
