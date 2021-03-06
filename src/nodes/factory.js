/* @flow */
import type { RawNode } from "./node";

import type Node from "./node";
import ImportNode from "./import";
import ExportNode from "./export";
import ExportDeclarationNode from "./export-declaration";
import ModuleNode from "./module";
import PropertyNode from "./property";
import NamespaceNode from "./namespace";

import { getMembersFromNode } from "../parse/ast";
import { checker } from "../checker";
import { getFullyQualifiedName } from "../printers/node";

export class Factory {
  _modules: { [key: string]: ModuleNode };
  _propDeclarations: { [key: string]: PropertyNode };
  _functionDeclarations: { [key: string]: number };

  constructor() {
    this._modules = Object.create(null);
    this._propDeclarations = Object.create(null);
    this._functionDeclarations = Object.create(null);
  }

  // If multiple declarations are found for the same module name
  // return the memoized instance of the module instead
  createModuleNode(name: string): ModuleNode {
    if (Object.keys(this._modules).includes(name)) {
      return this._modules[name];
    }

    const module = new ModuleNode(name);

    this._modules[name] = module;

    return module;
  }

  createFunctionDeclaration(
    node: RawNode,
    name: string,
    context: Node<>,
  ): void {
    const propNode = new PropertyNode(node);

    if (!this._functionDeclarations[name]) this._functionDeclarations[name] = 0;

    if (Object.keys(this._functionDeclarations).includes(name)) {
      this._functionDeclarations[name] += 1;
    }

    context.addChild(name + this._functionDeclarations[name], propNode);
  }

  // Some definition files (like lodash) declare the same
  // interface/type/function multiple times as a way of overloading.
  // Flow does not support that, and this is where we handle that
  createPropertyNode(
    node: RawNode,
    name?: string,
    context?: Node<>,
  ): PropertyNode {
    if (typeof name === "undefined") {
      return new PropertyNode(node);
    }

    if (context instanceof ModuleNode) {
      name = context.name + "$" + name;
    }
    if (context instanceof NamespaceNode && checker.current) {
      const symbol = checker.current.getSymbolAtLocation(node.name);
      name = getFullyQualifiedName(symbol, node.name, false);
    }

    if (Object.keys(this._propDeclarations).includes(name)) {
      this._propDeclarations[name].maybeAddMember(getMembersFromNode(node));

      return this._propDeclarations[name];
    }

    const propNode = new PropertyNode(node);
    this._propDeclarations[name] = propNode;
    return propNode;
  }

  createNamespaceNode = (name: string): NamespaceNode =>
    new NamespaceNode(name);
  createImportNode = (node: RawNode): ImportNode => new ImportNode(node);
  createExportNode = (node: RawNode): ExportNode => new ExportNode(node);
  createExportDeclarationNode = (node: RawNode): ExportDeclarationNode =>
    new ExportDeclarationNode(node);
}

export default {
  create: (): Factory => new Factory(),
};
