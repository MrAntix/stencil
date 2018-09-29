import * as d from '../../declarations';
import { normalizePath } from '../util';
import * as ts from 'typescript';


export async function getUserCompilerOptions(config: d.Config, compilerCtx: d.CompilerCtx) {
  if (compilerCtx.compilerOptions) {
    return compilerCtx.compilerOptions;
  }

  let compilerOptions: ts.CompilerOptions = Object.assign({}, DEFAULT_COMPILER_OPTIONS);

  try {
    const normalizedConfigPath = normalizePath(config.tsconfig);

    const sourceText = await compilerCtx.fs.readFile(normalizedConfigPath);

    try {
      const sourceJson = JSON.parse(sourceText);
      const parsedCompilerOptions: ts.CompilerOptions = ts.convertCompilerOptionsFromJson(sourceJson.compilerOptions, '.').options;

      compilerOptions = {
        ...compilerOptions,
        ...parsedCompilerOptions
      };

    } catch (e) {
      config.logger.warn('tsconfig.json is malformed, using default settings');
    }

  } catch (e) {
    config.logger.debug(`getUserCompilerOptions: ${e}`);
  }

  if (config._isTesting) {
    compilerOptions.module = ts.ModuleKind.CommonJS;
  }

  // apply user config to tsconfig
  compilerOptions.rootDir = config.srcDir;

  // during the transpile we'll write the output
  // to the correct location(s)
  compilerOptions.outDir = undefined;


  // generate .d.ts files when generating a distribution and in prod mode
  const typesOutputTarget = (config.outputTargets as d.OutputTargetDist[]).find(o => !!o.typesDir);
  if (typesOutputTarget) {
    compilerOptions.declaration = true;
    compilerOptions.declarationDir = typesOutputTarget.typesDir;

  } else {
    compilerOptions.declaration = false;
  }

  if (compilerOptions.module !== DEFAULT_COMPILER_OPTIONS.module) {
    config.logger.warn(`To improve bundling, it is always recommended to set the tsconfig.json “module” setting to “esnext”. Note that the compiler will automatically handle bundling both modern and legacy builds.`);
  }

  if (compilerOptions.target !==  DEFAULT_COMPILER_OPTIONS.target) {
    config.logger.warn(`To improve bundling, it is always recommended to set the tsconfig.json “target” setting to "es2017". Note that the compiler will automatically handle transpilation for ES5-only browsers.`);
  }

  if (typeof compilerOptions.esModuleInterop !== 'boolean') {
    config.logger.warn(`To improve module interoperability, it is highly recommend to set the tsconfig.json "esModuleInterop" setting to "true". This update allows star imports written as: import * as foo from "foo", to instead be written with the familiar default syntax of: import foo from "foo". For more info, please see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-7.html`);
  }

  validateCompilerOptions(compilerOptions);

  compilerCtx.compilerOptions = compilerOptions;

  return compilerOptions;
}


function validateCompilerOptions(compilerOptions: ts.CompilerOptions) {

  if (compilerOptions.allowJs && compilerOptions.declaration) {
    compilerOptions.allowJs = false;
  }

  // triple stamp a double stamp we've got the required settings
  compilerOptions.jsx = DEFAULT_COMPILER_OPTIONS.jsx;
  compilerOptions.jsxFactory = DEFAULT_COMPILER_OPTIONS.jsxFactory;
  compilerOptions.experimentalDecorators = DEFAULT_COMPILER_OPTIONS.experimentalDecorators;
  compilerOptions.noEmitOnError = DEFAULT_COMPILER_OPTIONS.noEmit;
  compilerOptions.suppressOutputPathCheck = DEFAULT_COMPILER_OPTIONS.suppressOutputPathCheck;
  compilerOptions.moduleResolution = DEFAULT_COMPILER_OPTIONS.moduleResolution;
  compilerOptions.module = DEFAULT_COMPILER_OPTIONS.module;
  compilerOptions.target = DEFAULT_COMPILER_OPTIONS.target;
}


export const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {

  // to allow jsx to work
  jsx: ts.JsxEmit.React,

  // the factory function to use
  jsxFactory: 'h',

  // transpileModule does not write anything to disk so there is no need
  // to verify that there are no conflicts between input and output paths.
  suppressOutputPathCheck: true,

  lib: [
    'lib.dom.d.ts',
    'lib.es5.d.ts',
    'lib.es2015.d.ts',
    'lib.es2016.d.ts',
    'lib.es2017.d.ts'
  ],

  allowSyntheticDefaultImports: true,

  esModuleInterop: true,

  // must always allow decorators
  experimentalDecorators: true,

  // transpile down to es2017
  target: ts.ScriptTarget.ES2017,

  // create esNext modules
  module: ts.ModuleKind.ESNext,

  // resolve using NodeJs style
  moduleResolution: ts.ModuleResolutionKind.NodeJs,

  // ensure that we do emit something
  noEmitOnError: false
};
