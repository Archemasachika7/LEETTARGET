import { getConfig } from "../lib/storage.js";

async function render() {
  const summary = document.getElementById("summary")!;
  const config = await getConfig();

  if (!config.githubOwner || !config.githubRepo) {
    summary.textContent = "Not configured yet — open Options to set your GitHub repo.";
    return;
  }

  summary.innerHTML = `Committing solves to <strong>${config.githubOwner}/${config.githubRepo}</strong>${
    config.leetTargetUserId ? " and syncing to Waypoint." : ". Waypoint sync is off."
  }`;
}

void render();
