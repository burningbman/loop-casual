import {
  cliExecute,
  gametimeToInt,
  myAdventures,
  myClosetMeat,
  myMeat,
  print,
  takeCloset,
  turnsPlayed,
  visitUrl,
} from "kolmafia";
import { all_tasks } from "./tasks/all";
import { prioritize } from "./route";
import { Engine } from "./engine";
import { convertMilliseconds, debug } from "./lib";
import { wandererSources } from "./resources";
import { $skill, get, have, PropertiesManager, set } from "libram";
import { step } from "./tasks/structure";
import { Outfit } from "./outfit";

const time_property = "_loop_casual_first_start";

export function main(): void {
  if (runComplete()) {
    print("Casual complete!", "purple");
    return;
  }

  const set_time_now = get(time_property, -1) === -1;
  if (set_time_now) set(time_property, gametimeToInt());

  if (myMeat() > 2000000) {
    print("You have too much meat; closeting some during execution.");
    cliExecute(`closet put ${myMeat() - 2000000} meat`);
  }

  const tasks = prioritize(all_tasks());
  const engine = new Engine(tasks);
  cliExecute("ccs loopcasual");
  setUniversalProperties(engine.propertyManager);

  while (myAdventures() > 0) {
    // First, check for any prioritized tasks
    const priority = tasks.find(
      (task) => engine.available(task) && task.priority !== undefined && task.priority()
    );
    if (priority !== undefined) {
      engine.execute(priority);
      continue;
    }

    // If a wanderer is up try to place it in a useful location
    const wanderer = wandererSources.find((source) => source.available() && source.chance() === 1);
    const delay_burning = tasks.find(
      (task) =>
        engine.hasDelay(task) &&
        engine.available(task) &&
        Outfit.create(task).canEquip(wanderer?.equip)
    );
    if (wanderer !== undefined && delay_burning !== undefined) {
      engine.execute(delay_burning, wanderer);
      continue;
    }

    // Otherwise, just advance the next quest on the route
    const todo = tasks.find((task) => engine.available(task));
    if (todo === undefined) break;
    engine.execute(todo);
  }

  // Can finish the run with 0 adventures, if only the prism is left
  if (step("questL13Final") > 11 && step("questL13Final") !== 999)
    visitUrl("place.php?whichplace=nstower&action=ns_11_prism");

  // Script is done; ensure we have finished
  takeCloset(myClosetMeat());

  const remaining_tasks = tasks.filter((task) => !task.completed());
  if (!runComplete()) {
    debug("Remaining tasks:", "red");
    for (const task of remaining_tasks) {
      if (!task.completed()) debug(`${task.name}`, "red");
    }
    throw `Unable to find available task, but the run is not complete.`;
  }

  print("Casual complete!", "purple");
  print(`   Adventures used: ${turnsPlayed()}`, "purple");
  print(`   Adventures remaining: ${myAdventures()}`, "purple");
  if (set_time_now)
    print(
      `   Time: ${convertMilliseconds(gametimeToInt() - get(time_property, gametimeToInt()))}`,
      "purple"
    );
  else
    print(
      `   Time: ${convertMilliseconds(
        gametimeToInt() - get(time_property, gametimeToInt())
      )} since first run today started`,
      "purple"
    );
}

function runComplete(): boolean {
  return step("questL13Final") === 999 && have($skill`Liver of Steel`);
}

function setUniversalProperties(propertyManager: PropertiesManager) {
  // Properties adapted from garbo
  propertyManager.set({
    logPreferenceChange: true,
    logPreferenceChangeFilter: [
      ...new Set([
        ...get("logPreferenceChangeFilter").split(","),
        "libram_savedMacro",
        "maximizerMRUList",
        "testudinalTeachings",
      ]),
    ]
      .sort()
      .filter((a) => a)
      .join(","),
    battleAction: "custom combat script",
    autoSatisfyWithMall: true,
    autoSatisfyWithNPCs: true,
    autoSatisfyWithCoinmasters: true,
    autoSatisfyWithStash: false,
    dontStopForCounters: true,
    maximizerFoldables: true,
    hpAutoRecovery: 0.0,
    hpAutoRecoveryTarget: 0.0,
    mpAutoRecovery: 0.0,
    mpAutoRecoveryTarget: 0.0,
    afterAdventureScript: "",
    betweenBattleScript: "",
    choiceAdventureScript: "",
    familiarScript: "",
    currentMood: "apathetic",
    autoTuxedo: true,
    autoPinkyRing: true,
    autoGarish: true,
    allowSummonBurning: true,
    libramSkillsSoftcore: "none",
  });
  propertyManager.setChoices({
    1106: 3, // Ghost Dog Chow
    1107: 1, // tennis ball
    1340: 3, // Is There A Doctor In The House?
    1341: 1, // Cure her poison
  });
}
