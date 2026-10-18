import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const COMPONENT_SCRIPT = /<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/;

export const extractComponentLogic = (html, label) => {
  const match = html.match(COMPONENT_SCRIPT);
  if (!match) throw new Error(`${label}: design component logic was not found.`);
  return match[1].trim();
};

const factoryBundle = (logic, names) => `(() => {
  "use strict";
  const factories = window.__dcPrecompiledLogicFactories || (window.__dcPrecompiledLogicFactories = {});
  const createComponent = (DCLogic, React) => {
${logic.split('\n').map((line) => `    ${line}`).join('\n')}
    return Component;
  };
  ${names.map((name) => `factories[${JSON.stringify(name)}] = createComponent;`).join('\n  ')}
  window.__dcRequirePrecompiledLogic = true;
})();
`;

const injectBundle = (html, scriptFile, label) => {
  const runtimeTag = '<script src="./support.js"></script>';
  if (!html.includes(runtimeTag)) throw new Error(`${label}: support.js script tag was not found.`);
  return html.replace(runtimeTag, `<script src="./${scriptFile}"></script>\n${runtimeTag}`);
};

export const precompileDcDocument = async ({ html, output, label, names, scriptFile }) => {
  const logic = extractComponentLogic(html, label);
  await writeFile(path.join(output, scriptFile), factoryBundle(logic, names), 'utf8');
  return injectBundle(html, scriptFile, label);
};
