#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const desktop = String(process.env.XDG_CURRENT_DESKTOP || "").toUpperCase();
if (!desktop.includes("GNOME")) process.exit(0);

const rootSchema = "org.gnome.settings-daemon.plugins.media-keys";
const bindingSchema = "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding";
const bindingPath = "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/lclip/";

function gsettings(...args) {
  return execFileSync("gsettings", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function gsettingsSafe(...args) {
  try {
    return execFileSync("gsettings", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

const args = process.argv.slice(2);
let action = "install";
let command = "/usr/local/bin/lclip --show";
let binding = "<Super>period";
let name = "LClip";

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--remove") {
    action = "remove";
  } else if (arg === "--command" || arg === "--launcher") {
    if (i + 1 < args.length) {
      command = args[++i];
    }
  } else if (arg.startsWith("--command=")) {
    command = arg.slice("--command=".length);
  } else if (arg.startsWith("--launcher=")) {
    command = arg.slice("--launcher=".length);
  } else if (arg === "--binding") {
    if (i + 1 < args.length) {
      binding = args[++i];
    }
  } else if (arg.startsWith("--binding=")) {
    binding = arg.slice("--binding=".length);
  } else if (arg === "--name") {
    if (i + 1 < args.length) {
      name = args[++i];
    }
  } else if (arg.startsWith("--name=")) {
    name = arg.slice("--name=".length);
  } else if (!arg.startsWith("--")) {
    command = arg;
  }
}

let current = "";
try {
  current = gsettings("get", rootSchema, "custom-keybindings");
} catch {
  process.exit(0);
}

const bindings = [...current.matchAll(/'([^']+)'/g)].map(match => match[1]);

if (action === "remove") {
  const next = bindings.filter(path => path !== bindingPath);
  const serialized = next.length === 0 ? "@as []" : `[${next.map(path => `'${path}'`).join(", ")}]`;
  gsettingsSafe("set", rootSchema, "custom-keybindings", serialized);
  gsettingsSafe("reset-recursively", `${bindingSchema}:${bindingPath}`);
  console.log("Removed the GNOME LClip shortcut.");
  process.exit(0);
}

for (const path of bindings) {
  if (path !== bindingPath) {
    const target = `${bindingSchema}:${path}`;
    const existingBinding = gsettingsSafe("get", target, "binding").replaceAll("'", "").trim();
    if (existingBinding === binding) {
      const existingName = gsettingsSafe("get", target, "name").replaceAll("'", "").trim();
      const existingCmd = gsettingsSafe("get", target, "command").replaceAll("'", "").trim();
      if (existingName !== "LClip" && !existingCmd.includes("lclip")) {
        console.warn(`Notice: Super + . is already assigned to GNOME shortcut '${existingName || "Custom"}' ('${existingCmd || "none"}').`);
        console.warn("LClip did not overwrite it. To use Super + . for LClip, remove or change the existing shortcut in GNOME Settings -> Keyboard -> Keyboard Shortcuts.");
        process.exit(0);
      }
    }
  }
}

const target = `${bindingSchema}:${bindingPath}`;
gsettings("set", target, "name", name);
gsettings("set", target, "command", command);
gsettings("set", target, "binding", binding);

const next = [...new Set([...bindings, bindingPath])];
const serialized = `[${next.map(path => `'${path}'`).join(", ")}]`;
gsettings("set", rootSchema, "custom-keybindings", serialized);

try {
  const ibusEmoji = gsettingsSafe("get", "org.freedesktop.ibus.panel.emoji", "hotkey");
  if (ibusEmoji.includes("<Super>period")) {
    gsettingsSafe("set", "org.freedesktop.ibus.panel.emoji", "hotkey", "['<Super>semicolon']");
  }
} catch {}

console.log("Configured GNOME shortcut: Super + .");
