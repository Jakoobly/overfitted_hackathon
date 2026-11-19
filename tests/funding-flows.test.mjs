import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

async function loadDemo(t, name) {
  const path = fileURLToPath(new URL(`../mockups/${name}/index.html`, import.meta.url));
  const virtualConsole = new VirtualConsole();
  const errors = [];
  virtualConsole.on("jsdomError", (error) => errors.push(error));

  const { window } = await JSDOM.fromFile(path, {
    resources: "usable",
    runScripts: "dangerously",
    virtualConsole,
  });
  t.after(() => {
    window.close();
    assert.deepEqual(errors, []);
  });
  if (window.document.readyState !== "complete") {
    await new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));
  }
  return window.document;
}

function sendMessage(document, input, form, text) {
  document.querySelector(input).value = text;
  document.querySelector(form).requestSubmit();
}

test("matching asks for a missing start date, reevaluates an adjustment and excludes the wrong region", { timeout: 5000 }, async (t) => {
  const document = await loadDemo(t, "rafael");
  sendMessage(
    document,
    "#chatInput",
    "#chatForm",
    "Wir sind ein eingetragener Verein in Baden-Württemberg und planen einen Kurs zur digitalen Grundbildung für Erwachsene. Budget 15.000 Euro.",
  );
  assert.match(document.querySelector("#messages .message-assistant:last-child").textContent, /Wann soll das Projekt starten/);

  const programmeName = "ESF Plus Baden-Württemberg";
  const findProgramme = () => [...document.querySelectorAll("#results article")]
    .find((card) => card.querySelector("h3").textContent === programmeName);

  sendMessage(document, "#chatInput", "#chatForm", "März 2027");
  assert.match(findProgramme()?.querySelector(".badge").textContent ?? "", /Ähnlich/);
  document.querySelector('[data-adjust="esf-bw:start"]').click();
  assert.match(findProgramme()?.querySelector(".badge").textContent ?? "", /Passend nach Datenlage/);

  document.querySelector("#editProfile").click();
  document.querySelector("#edit-land").value = "Bayern";
  document.querySelector("#profileEdit").requestSubmit();
  assert.equal(findProgramme(), undefined);
  assert.match(document.querySelector("#results details.more:last-child").textContent, /Ausgeschlossen.*ESF Plus Baden-Württemberg/s);
});

test("the chat answers a free-text question with the currently selected programme's documents", { timeout: 5000 }, async (t) => {
  const document = await loadDemo(t, "robert");
  const answer = () => document.querySelector("#conversation .message-assistant:last-child .bubble").textContent;
  const askForDocuments = () => sendMessage(document, "#message", "#composer", "Welche Unterlagen brauchen wir?");

  document.querySelector('[aria-describedby="program-one"].program-select').click();
  askForDocuments();
  assert.match(answer(), /Digital im Alltag.*Kursbeschreibung, Kostenplan/s);

  document.querySelector('[aria-describedby="program-two"].program-select').click();
  askForDocuments();
  assert.match(answer(), /Lernorte digital.*Zeitplan mit Kursbeginn/s);
  assert.doesNotMatch(answer(), /Digital im Alltag/);
});
